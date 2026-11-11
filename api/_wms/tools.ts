/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { canDeleteTask, canEditTask, getUserRole } from '../../src/utils/rbac.js';
import { createCreationLog, recordTaskChanges } from '../../src/utils/taskLogUtils.js';
import { isValidUrl, normalizeUrl } from '../../src/utils/urlValidator.js';
import { checkTitleQuality } from '../../src/utils/titleQuality.js';
import {
  LIGHT_DAY_MINUTES,
  MAX_ESTIMATE_MINUTES,
  MIN_ESTIMATE_MINUTES,
  formatDuration,
  formatEstimate,
} from '../../src/utils/estimate.js';
import type { TaskItem, TaskStatus } from '../../src/types.js';
import type { FolderRow, MemberRow, ProjectRow, TaskLogRow, TaskRow, WmsStore } from './store.js';
import {
  TASK_STATUSES,
  addDays,
  byUrgency,
  dayDiff,
  daysSinceUpdate,
  diffColumns,
  dueLabel,
  fold,
  formatDate,
  isIsoDate,
  isProductMember,
  isSimilarTitle,
  projectFolder,
  projectTag,
  resolveMember,
  resolveProject,
  shortName,
  taskLine,
  toEditableColumns,
  toMemberItem,
  toProjectItem,
  toTaskItem,
  vnToday,
  weekday,
  type Resolved,
} from './domain.js';
import { gatherNextContext, renderNextHint } from './next.js';

export const SERVER_NAME = 'vnexpress-wms';
export const SERVER_VERSION = '1.1.0';
export const MAX_BATCH = 50;
/** Việc đang mở không được cập nhật từ ngần này ngày bị coi là "lâu không động tới". */
export const STALE_DAYS = 5;
/** Việc đã giao im lặng từ ngần này ngày thì đưa vào danh sách cần đôn đốc. */
export const NUDGE_DAYS = 3;

export interface WmsContext {
  store: WmsStore;
  /** Username của chủ token (đã xác thực). */
  actorUsername: string;
  /** Địa chỉ app để tạo link mở thẳng công việc. */
  appUrl: string;
  now?: () => Date;
}

/** Lỗi nghiệp vụ: trả nguyên văn cho Claude để tự sửa lời gọi. */
class ToolError extends Error {}

interface Refs {
  actor: MemberRow;
  members: MemberRow[];
  projects: ProjectRow[];
  folders: FolderRow[];
}

const INSTRUCTIONS = `Kết nối tới "Quản lý công việc bộ phận Sản phẩm" (WMS) của VnExpress. Dữ liệu ghi thẳng vào app, cả bộ phận thấy ngay.

Cách dùng:
- Người dùng nhắc tới một việc cần làm, một cam kết, một việc vừa xong: ghi vào app bằng add_task hoặc update_task, không chỉ ghi trong hội thoại.
- Trước khi cập nhật, tìm id bằng list_tasks (lọc theo query, assignee, project).
- Tiêu đề việc: bắt đầu bằng động từ, nêu rõ làm gì + cho cái gì + kết quả. VD: "Viết PRD trang Ý kiến bản mobile".
- Ngày dùng định dạng YYYY-MM-DD theo giờ Việt Nam. Không truyền hạn thì mặc định hôm nay; việc chưa có hạn truyền due_date = "none".
- Mỗi việc nên có estimate_minutes (ước lượng thời gian làm). Người dùng không nói thì hỏi, không tự đặt.
- add_task báo "Có thể trùng": đọc việc được nêu, hỏi người dùng rồi mới gọi lại với allow_duplicate = true.
- Không tự đặt số liệu, hạn, tên người. Mọi con số lấy từ kết quả công cụ.
- Nhắc việc, đôn đốc người khác: soạn nội dung cho người dùng duyệt, rồi mới gửi bằng add_comment (kèm @username).
- Chuyển sang "Hoàn thành" bắt buộc có result_link là URL hợp lệ. Chuyển sang "Bị nghẽn" bắt buộc có blocker_reason.
- Nhân sự: dùng username (vd tienngoc) hoặc họ tên; "me" là chủ token. Dự án: dùng mã (vd WMS, YKIEN) hoặc tên.
- Trả lời người dùng ngắn gọn, kết quả lên đầu, kèm link mở việc trong app.`;

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] });

function unwrap<T>(result: Resolved<T>): T {
  if (result.ok === false) throw new ToolError(result.error);
  return result.value;
}

function cleanLink(value: string | undefined, label: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!isValidUrl(trimmed)) {
    throw new ToolError(`${label} không đúng định dạng URL: "${trimmed}". VD hợp lệ: https://figma.com/file/...`);
  }
  return normalizeUrl(trimmed);
}

function cleanDate(value: string | undefined, label: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!isIsoDate(trimmed)) throw new ToolError(`${label} phải theo định dạng YYYY-MM-DD, nhận được "${value}".`);
  return trimmed;
}

const NO_DATE_WORDS = new Set(['none', 'null', 'khong', 'khong co', 'chua co han', 'no']);

/** undefined = không truyền; null = chủ động để trống hạn; chuỗi = ngày hợp lệ. */
function cleanDueDate(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (NO_DATE_WORDS.has(fold(value))) return null;
  return cleanDate(value, 'due_date');
}

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

// ---------------------------------------------------------------------------
// Lược đồ tham số
// ---------------------------------------------------------------------------

const statusSchema = z.enum(TASK_STATUSES);

const estimateSchema = z.number().int().min(MIN_ESTIMATE_MINUTES).max(MAX_ESTIMATE_MINUTES).optional();

const newTaskShape = {
  title: z
    .string()
    .min(3)
    .max(300)
    .describe('Tiêu đề việc, bắt đầu bằng động từ, nêu rõ làm gì + cho cái gì. VD: "Viết PRD trang Ý kiến bản mobile".'),
  assignee: z
    .string()
    .optional()
    .describe('Người phụ trách: username (vd "duytung") hoặc họ tên. Bỏ trống hoặc "me" = chủ token.'),
  project: z
    .string()
    .optional()
    .describe('Dự án: mã (vd "WMS", "YKIEN") hoặc tên. Bỏ trống = "Chưa xác định (Others)".'),
  due_date: z
    .string()
    .optional()
    .describe('Hạn hoàn thành YYYY-MM-DD (giờ Việt Nam). Bỏ trống = hôm nay. "none" = chưa có hạn (việc làm sau).'),
  estimate_minutes: estimateSchema.describe(
    'Ước lượng thời gian làm, tính bằng phút: 30, 60, 120, 240 (nửa ngày), 480 (1 ngày), 960 (hơn 1 ngày).'
  ),
  urgent: z.boolean().optional().describe('true = Khẩn cấp. Mặc định Bình thường.'),
  details: z.string().max(4000).optional().describe('Mô tả, tiêu chí nghiệm thu, bối cảnh (không bắt buộc).'),
  work_link: z.string().optional().describe('Link làm việc (Figma, Google Docs, Notion...).'),
  status: statusSchema.optional().describe('Mặc định "Chưa làm". Chỉ đặt khác khi chuyển dữ liệu cũ hoặc việc đã bắt đầu.'),
  result_link: z.string().optional().describe('Link kết quả. Bắt buộc khi status = "Hoàn thành".'),
  blocker_reason: z.string().max(1000).optional().describe('Lý do nghẽn. Bắt buộc khi status = "Bị nghẽn".'),
  completed_date: z
    .string()
    .optional()
    .describe('Ngày hoàn thành thực tế YYYY-MM-DD, chỉ dùng khi nhập việc đã xong từ trước. Mặc định: bây giờ.'),
  allow_duplicate: z
    .boolean()
    .optional()
    .describe('Mặc định false: người phụ trách đã có việc trùng hoặc gần trùng tiêu đề thì không tạo thêm. Chỉ đặt true sau khi người dùng xác nhận đây là việc khác.'),
};

type NewTaskInput = z.infer<z.ZodObject<typeof newTaskShape>>;

const updateTaskShape = {
  id: z.string().describe('Id công việc (vd "task-1794308543451"), lấy từ list_tasks.'),
  title: z.string().min(3).max(300).optional().describe('Tiêu đề mới.'),
  status: statusSchema.optional().describe('Trạng thái mới.'),
  assignee: z.string().optional().describe('Người phụ trách mới: username hoặc họ tên.'),
  project: z.string().optional().describe('Chuyển sang dự án khác: mã hoặc tên.'),
  due_date: z.string().optional().describe('Hạn mới YYYY-MM-DD. "none" = bỏ hạn.'),
  estimate_minutes: estimateSchema.describe('Ước lượng thời gian làm (phút).'),
  urgent: z.boolean().optional().describe('true = Khẩn cấp, false = Bình thường.'),
  details: z.string().max(4000).optional().describe('Mô tả mới (ghi đè mô tả cũ).'),
  work_link: z.string().optional().describe('Link làm việc. Chuỗi rỗng để xoá.'),
  result_link: z.string().optional().describe('Link kết quả. Bắt buộc có (hoặc đã có sẵn) khi chuyển "Hoàn thành".'),
  blocker_reason: z.string().max(1000).optional().describe('Lý do nghẽn. Bắt buộc khi chuyển "Bị nghẽn".'),
  progress: z.number().int().min(0).max(100).optional().describe('Tiến độ %, chỉ áp dụng khi chưa hoàn thành.'),
  note: z.string().max(2000).optional().describe('Bình luận / cập nhật tiến độ, lưu vào lịch sử công việc.'),
};

type UpdateTaskInput = z.infer<z.ZodObject<typeof updateTaskShape>>;

// ---------------------------------------------------------------------------
// Máy chủ MCP
// ---------------------------------------------------------------------------

export function createWmsServer(ctx: WmsContext): McpServer {
  const { store } = ctx;
  const now = () => (ctx.now ? ctx.now() : new Date());
  const appUrl = ctx.appUrl.replace(/\/+$/, '');
  const taskUrl = (id: string) => `${appUrl}/tasks/${encodeURIComponent(id)}`;

  let refsPromise: Promise<Refs> | null = null;
  const refs = (): Promise<Refs> => {
    refsPromise ??= (async () => {
      const [members, projects, folders] = await Promise.all([store.members(), store.projects(), store.folders()]);
      const actor = members.find((m) => (m.username || '').toLowerCase() === ctx.actorUsername);
      if (!actor) {
        throw new ToolError(
          `Token gắn với tài khoản "${ctx.actorUsername}" nhưng tài khoản này không có trong danh sách nhân sự. Báo Admin kiểm tra WMS_MCP_TOKENS.`
        );
      }
      return { actor, members, projects, folders };
    })();
    return refsPromise;
  };

  /** Bọc xử lý: lỗi nghiệp vụ trả nguyên văn, lỗi hệ thống ghi log và trả thông báo chung. */
  const guard =
    <A>(handler: (args: A) => Promise<string>) =>
    async (args: A) => {
      try {
        return text(await handler(args));
      } catch (err) {
        if (err instanceof ToolError) return { ...text(err.message), isError: true };
        console.error('[wms-mcp] Lỗi xử lý công cụ:', err);
        const detail = (err as { message?: string })?.message || 'không rõ nguyên nhân';
        return { ...text(`Lỗi hệ thống khi truy cập dữ liệu WMS: ${detail}. Thử lại sau.`), isError: true };
      }
    };

  // ----- Ghi dữ liệu -------------------------------------------------------

  async function notifyAssigned(task: TaskRow, r: Refs): Promise<void> {
    if (fold(task.assignee) === fold(r.actor.name)) return;
    const recipient = r.members.find((m) => fold(m.name) === fold(task.assignee));
    const projectName = task.project_name || '';
    await store.addNotification({
      id: `notif-${Date.now()}-${randomSuffix()}`,
      recipient_name: task.assignee,
      recipient_id: recipient?.username || recipient?.id || null,
      actor_name: r.actor.name,
      project_id: task.project_id,
      project_name: projectName,
      task_id: task.id,
      task_title: task.title,
      type: 'task_assigned',
      title: `Bạn được giao việc trong ${projectName.replace('Dự án ', '')}`,
      content: `${r.actor.name} đã giao cho bạn: "${task.title}"`,
      is_read: false,
      created_at: now().toISOString(),
    });
  }

  /** Bộ nhớ đệm việc theo người phụ trách trong một lần gọi, phục vụ chống trùng khi thêm hàng loạt. */
  type DuplicateCache = Map<string, TaskRow[]>;

  async function createTask(input: NewTaskInput, r: Refs, cache: DuplicateCache): Promise<string> {
    const title = input.title.trim().replace(/\s+/g, ' ');
    if (title.length < 3) throw new ToolError('Tiêu đề quá ngắn.');

    const assignee = unwrap(resolveMember(input.assignee, r.members, r.actor));
    const project = unwrap(resolveProject(input.project, r.projects));
    const today = vnToday(now());
    const dueInput = cleanDueDate(input.due_date);
    const due = dueInput === undefined ? today : dueInput;
    const status: TaskStatus = input.status ?? 'Chưa làm';
    const workLink = cleanLink(input.work_link, 'work_link') || null;
    const resultLink = cleanLink(input.result_link, 'result_link') || null;
    const blocker = input.blocker_reason?.trim() || null;
    const completedDate = cleanDate(input.completed_date, 'completed_date');

    if (status === 'Hoàn thành' && !resultLink) {
      throw new ToolError('Việc "Hoàn thành" cần result_link là URL hợp lệ (Figma, PRD, báo cáo, staging...).');
    }
    if (status === 'Bị nghẽn' && !blocker) {
      throw new ToolError('Việc "Bị nghẽn" cần blocker_reason nêu lý do nghẽn.');
    }

    if (!input.allow_duplicate) {
      let existing = cache.get(assignee.name);
      if (!existing) {
        existing = await store.tasks({ assignee: assignee.name });
        cache.set(assignee.name, existing);
      }
      const key = fold(title);
      const duplicate = existing.find(
        (t) => fold(t.title) === key && (t.status !== 'Hoàn thành' || (t.due_date || '').slice(0, 10) === (due || ''))
      );
      if (duplicate) {
        return `Đã có sẵn, không tạo thêm: ${duplicate.title} — ${dueLabel(duplicate.due_date, today)} · ${duplicate.status} · ${duplicate.assignee} · id: ${duplicate.id}\n  ${taskUrl(duplicate.id)}`;
      }
      // Gần trùng: khác vài chữ nhưng cùng người, cùng từ khoá, việc còn mở. Dừng lại để người dùng quyết định.
      const similar = existing.filter((t) => t.status !== 'Hoàn thành' && isSimilarTitle(t.title, title)).slice(0, 3);
      if (similar.length) {
        const list = similar
          .map((t) => `  - ${t.title} — ${dueLabel(t.due_date, today)} · ${t.status} · id: ${t.id}\n    ${taskUrl(t.id)}`)
          .join('\n');
        return `Có thể trùng, chưa tạo: "${title}" gần giống việc đang mở của ${assignee.name}:\n${list}\n  Cập nhật việc cũ bằng update_task, hoặc gọi lại với allow_duplicate = true nếu đây là việc khác.`;
      }
    }

    const stamp = now().toISOString();
    const folder = projectFolder(project, r.folders);
    const row: TaskRow = {
      id: `task-${Date.now()}-${randomSuffix()}`,
      title,
      project_id: project.id,
      project_name: project.name,
      folder_id: folder.id,
      folder_name: folder.name,
      phase_id: null,
      phase_name: null,
      team: assignee.team,
      assignee: assignee.name,
      product_owners: [],
      status,
      priority: input.urgent ? 'Khẩn cấp' : 'Bình thường',
      due_date: due,
      progress: status === 'Hoàn thành' ? 100 : 0,
      details: input.details?.trim() || null,
      blocker_reason: blocker,
      work_link: workLink,
      result_link: resultLink,
      latest_update_note: null,
      created_by: r.actor.name,
      created_at: stamp,
      updated_at: stamp,
      completed_at: status === 'Hoàn thành' ? (completedDate ? `${completedDate}T17:30:00+07:00` : stamp) : null,
      is_recurring: false,
      recurring_rule_id: null,
      recurring_frequency: null,
      ...(input.estimate_minutes ? { estimate_minutes: input.estimate_minutes } : {}),
    };

    await store.insertTask(row);
    cache.get(assignee.name)?.push(row);

    const initLog = createCreationLog(toTaskItem(row), r.actor.name);
    // Lưu ngày hoàn thành vào nhật ký: production chưa có cột completed_at, app đọc ngày này từ log.
    if (status === 'Hoàn thành') {
      initLog.changes = [...(initLog.changes || []), { field: 'Thời điểm hoàn thành', newValue: completedDate || vnToday(now()) }];
    }
    await store.addLog({
      id: `log-${row.id.replace(/^task-/, '')}-init`,
      task_id: row.id,
      author: r.actor.name,
      action: initLog.action,
      changes: initLog.changes,
      note: row.details ? `Ghi chú: ${row.details} (thêm qua Claude)` : 'Thêm qua Claude.',
      created_at: stamp,
    });
    await notifyAssigned(row, r);

    const parts = [dueLabel(due, today), status];
    if (row.priority === 'Khẩn cấp') parts.push('Khẩn cấp');
    if (input.estimate_minutes) parts.push(`~${formatEstimate(input.estimate_minutes)}`);
    parts.push(assignee.name, projectTag(row, r.projects));
    let line = `Đã thêm: ${title} — ${parts.join(' · ')} · id: ${row.id}\n  ${taskUrl(row.id)}`;
    const quality = checkTitleQuality(title);
    if (quality.isVague) line += `\n  Lưu ý tiêu đề: ${quality.reason} ${quality.hint}`;
    if (!input.estimate_minutes && status !== 'Hoàn thành') {
      line += '\n  Chưa có ước lượng thời gian: hỏi người dùng rồi bổ sung bằng update_task (estimate_minutes).';
    }
    return line;
  }

  async function updateTask(input: UpdateTaskInput, r: Refs): Promise<string> {
    const row = await store.task(input.id.trim());
    if (!row) throw new ToolError(`Không tìm thấy việc id "${input.id}". Gọi list_tasks để tìm đúng id.`);

    const before = toTaskItem(row);
    if (!canEditTask(toMemberItem(r.actor), before, r.projects.map(toProjectItem))) {
      throw new ToolError(
        `${r.actor.name} không có quyền sửa việc này (phụ trách: ${row.assignee}). Chỉ người tạo, người phụ trách, PM dự án hoặc Admin được sửa.`
      );
    }

    const today = vnToday(now());
    const next: TaskItem = { ...before };

    if (input.title !== undefined) next.title = input.title.trim().replace(/\s+/g, ' ');
    if (input.assignee !== undefined) {
      const member = unwrap(resolveMember(input.assignee, r.members, r.actor));
      next.assignee = member.name;
      next.team = member.team as TaskItem['team'];
    }
    if (input.project !== undefined) {
      const project = unwrap(resolveProject(input.project, r.projects));
      if (project.id !== before.projectId) {
        const folder = projectFolder(project, r.folders);
        next.projectId = project.id;
        next.projectName = project.name;
        next.folderId = folder.id;
        next.folderName = folder.name;
        next.phaseId = undefined;
        next.phaseName = undefined;
      }
    }
    const due = cleanDueDate(input.due_date);
    if (due !== undefined) next.dueDate = due || undefined;
    if (input.estimate_minutes !== undefined) next.estimateMinutes = input.estimate_minutes;
    if (input.urgent !== undefined) next.priority = input.urgent ? 'Khẩn cấp' : 'Bình thường';
    if (input.details !== undefined) next.details = input.details.trim() || undefined;
    const workLink = cleanLink(input.work_link, 'work_link');
    if (workLink !== undefined) next.workLink = workLink || undefined;
    const resultLink = cleanLink(input.result_link, 'result_link');
    if (resultLink !== undefined) next.resultLink = resultLink || undefined;
    if (input.blocker_reason !== undefined) next.blockerReason = input.blocker_reason.trim() || undefined;

    const status = input.status ?? before.status;
    const becameDone = status === 'Hoàn thành' && before.status !== 'Hoàn thành';
    const becameBlocked = status === 'Bị nghẽn' && before.status !== 'Bị nghẽn';
    next.status = status;

    if (status === 'Hoàn thành') {
      if (!isValidUrl(next.resultLink)) {
        const hint = isValidUrl(next.workLink)
          ? ` Việc đang có link làm việc ${next.workLink}: nếu đó cũng là kết quả, truyền result_link bằng link này.`
          : '';
        throw new ToolError(`Chuyển "Hoàn thành" cần result_link là URL hợp lệ (Figma, PRD, báo cáo, staging...).${hint}`);
      }
      next.progress = 100;
      if (becameDone) next.completedAt = now().toISOString();
    } else {
      if (before.status === 'Hoàn thành') {
        next.completedAt = undefined;
        next.progress = status === 'Chưa làm' ? 0 : 50;
      }
      if (input.progress !== undefined) next.progress = input.progress;
      if (status === 'Bị nghẽn' && !next.blockerReason) {
        throw new ToolError('Chuyển "Bị nghẽn" cần blocker_reason nêu lý do nghẽn.');
      }
    }

    const note = input.note?.trim();
    if (note) next.latestUpdateNote = note;

    const patch = diffColumns(toEditableColumns(before), toEditableColumns(next));
    if (Object.keys(patch).length === 0) {
      return `Không có gì thay đổi: ${row.title} — ${dueLabel(row.due_date, today)} · ${row.status} · id: ${row.id}`;
    }

    const base =
      note ||
      (becameDone
        ? `Hoàn thành công việc kèm link: ${next.resultLink}`
        : becameBlocked
          ? `Cảnh báo nghẽn: ${next.blockerReason}`
          : '');
    const logged = recordTaskChanges(before, next, r.actor.name, base ? `${base} (qua Claude)` : 'Cập nhật qua Claude.');
    const log = logged.logs?.[0];

    const stamp = now().toISOString();
    await store.updateTask(row.id, { ...patch, updated_at: stamp });
    if (log) {
      await store.addLog({
        id: log.id,
        task_id: row.id,
        author: log.author,
        action: log.action,
        changes: log.changes,
        note: log.note || null,
        created_at: stamp,
      });
    }

    const updatedRow: TaskRow = { ...row, ...patch, updated_at: stamp };
    if (patch.assignee) await notifyAssigned(updatedRow, r);

    const changes = (log?.changes || [])
      .map((c) => `  ${c.field}: ${c.oldValue ?? '(trống)'} → ${c.newValue ?? '(trống)'}`)
      .join('\n');
    const head = becameDone ? 'Đã hoàn thành' : 'Đã cập nhật';
    let nextHint = '';
    if (becameDone) {
      // Gợi ý là phần phụ: lỗi khi gom dữ liệu không được làm hỏng thao tác chính.
      try {
        const ctx = await gatherNextContext(
          store,
          { title: updatedRow.title, assignee: updatedRow.assignee, projectId: updatedRow.project_id, trigger: 'completed', taskId: row.id },
          r.members,
          today
        );
        nextHint = renderNextHint(ctx);
      } catch (err) {
        console.warn('[wms-mcp] Không gom được dữ liệu gợi ý việc tiếp theo:', (err as Error)?.message);
      }
    }
    return [
      `${head}: ${updatedRow.title} — ${dueLabel(updatedRow.due_date, today)} · ${updatedRow.status} · ${updatedRow.assignee} · id: ${row.id}`,
      changes,
      note ? `  Ghi chú: ${note}` : '',
      `  ${taskUrl(row.id)}`,
      nextHint,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // ----- Đọc dữ liệu -------------------------------------------------------

  /** Chia việc đang mở thành các nhóm theo hạn, đã sắp theo độ gấp. */
  function bucketByDue(rows: TaskRow[], today: string) {
    const sorted = [...rows].sort(byUrgency);
    const due = (r: TaskRow) => (r.due_date || '').slice(0, 10);
    return {
      overdue: sorted.filter((r) => due(r) && due(r) < today),
      today: sorted.filter((r) => due(r) === today),
      soon: sorted.filter((r) => due(r) > today && dayDiff(due(r), today) <= 3),
      later: sorted.filter((r) => due(r) && dayDiff(due(r), today) > 3),
      noDate: sorted.filter((r) => !due(r)),
    };
  }

  /** Người này đã có việc cho hôm nay chưa: việc đến hạn hôm nay (mọi trạng thái), việc tồn quá hạn hoặc việc đang làm. */
  const hasWorkToday = (open: TaskRow[], dueToday: TaskRow[], name: string, today: string) =>
    dueToday.some((t) => fold(t.assignee) === fold(name)) ||
    open.some((t) => t.status === 'Đang làm' || Boolean(t.due_date && t.due_date.slice(0, 10) <= today));

  const section = (label: string, rows: TaskRow[], render: (r: TaskRow) => string) =>
    rows.length ? `\n${label} (${rows.length})\n${rows.map(render).join('\n')}` : '';

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'list_tasks',
    {
      title: 'Xem danh sách công việc',
      description:
        'Liệt kê công việc trong WMS, lọc theo người phụ trách, dự án, trạng thái, hạn, từ khoá. Mặc định: việc đang mở của chủ token. Dùng để tìm id trước khi cập nhật.',
      inputSchema: {
        assignee: z
          .string()
          .optional()
          .describe('Username hoặc họ tên. Mặc định "me" (chủ token). "all" = toàn bộ phận.'),
        project: z.string().optional().describe('Mã hoặc tên dự án.'),
        status: z
          .enum(['open', 'all', ...TASK_STATUSES])
          .optional()
          .describe('"open" (mặc định) = chưa hoàn thành; "all" = mọi trạng thái; hoặc một trạng thái cụ thể.'),
        due: z
          .enum(['overdue', 'today', 'tomorrow', 'next_3_days', 'next_7_days'])
          .optional()
          .describe('Lọc nhanh theo hạn (giờ Việt Nam).'),
        due_from: z.string().optional().describe('Hạn từ ngày YYYY-MM-DD.'),
        due_to: z.string().optional().describe('Hạn đến ngày YYYY-MM-DD.'),
        query: z.string().optional().describe('Từ khoá trong tiêu đề hoặc mô tả, không cần dấu.'),
        created_by: z
          .string()
          .optional()
          .describe('Lọc theo người tạo việc: username, họ tên hoặc "me". Khi dùng mà không truyền assignee thì xem mọi người phụ trách.'),
        delegated: z
          .boolean()
          .optional()
          .describe('true = việc chủ token đã giao cho người khác (người tạo là chủ token, người phụ trách là người khác).'),
        stale_days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Chỉ lấy việc đang mở không được cập nhật từ N ngày trở lên.'),
        limit: z.number().int().min(1).max(200).optional().describe('Số việc tối đa, mặc định 40.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const today = vnToday(now());
      const creator = args.delegated
        ? r.actor
        : args.created_by
          ? unwrap(resolveMember(args.created_by, r.members, r.actor))
          : null;
      const everyone = fold(args.assignee || '') === 'all' || (Boolean(creator) && !args.assignee);
      const person = everyone ? null : unwrap(resolveMember(args.assignee, r.members, r.actor));
      const project = args.project ? unwrap(resolveProject(args.project, r.projects)) : null;
      const status = args.status ?? 'open';

      let dueFrom = cleanDate(args.due_from, 'due_from');
      let dueTo = cleanDate(args.due_to, 'due_to');
      if (args.due === 'overdue') dueTo = addDays(today, -1);
      if (args.due === 'today') dueFrom = dueTo = today;
      if (args.due === 'tomorrow') dueFrom = dueTo = addDays(today, 1);
      if (args.due === 'next_3_days') [dueFrom, dueTo] = [today, addDays(today, 3)];
      if (args.due === 'next_7_days') [dueFrom, dueTo] = [today, addDays(today, 7)];

      let rows = await store.tasks({
        openOnly: status === 'open' || args.due === 'overdue',
        statuses: status !== 'open' && status !== 'all' ? [status] : undefined,
        assignee: person?.name,
        projectId: project?.id,
        dueFrom,
        dueTo,
        createdBy: creator?.name,
      });

      if (args.delegated) rows = rows.filter((t) => fold(t.assignee) !== fold(r.actor.name));
      if (args.stale_days) {
        rows = rows.filter((t) => t.status !== 'Hoàn thành' && daysSinceUpdate(t, today) >= args.stale_days!);
      }

      if (args.query) {
        const key = fold(args.query);
        rows = rows.filter((t) => fold(`${t.title} ${t.details || ''} ${t.project_name || ''}`).includes(key));
      }

      const scope = [
        person ? `của ${person.name}` : 'toàn bộ phận',
        args.delegated ? `do ${r.actor.name} giao cho người khác` : creator ? `do ${creator.name} tạo` : '',
        args.stale_days ? `không cập nhật từ ${args.stale_days} ngày` : '',
        project ? `dự án ${project.name}` : '',
        status === 'open' ? 'đang mở' : status === 'all' ? 'mọi trạng thái' : `trạng thái "${status}"`,
        args.due ? `hạn: ${args.due}` : '',
        args.query ? `từ khoá "${args.query}"` : '',
      ]
        .filter(Boolean)
        .join(', ');

      if (!rows.length) return `Không có việc nào (${scope}).`;

      const limit = args.limit ?? 40;
      const render = (t: TaskRow) => {
        const line = taskLine(t, { today, projects: r.projects, showAssignee: !person });
        return args.stale_days ? `${line}\n  Không cập nhật: ${daysSinceUpdate(t, today)} ngày` : line;
      };
      const open = rows.filter((t) => t.status !== 'Hoàn thành');
      const done = rows
        .filter((t) => t.status === 'Hoàn thành')
        .sort((a, b) => (b.completed_at || b.due_date || '').localeCompare(a.completed_at || a.due_date || ''));

      const buckets = bucketByDue(open, today);
      const ordered = [...buckets.overdue, ...buckets.today, ...buckets.soon, ...buckets.later, ...buckets.noDate, ...done];
      const shown = new Set(ordered.slice(0, limit).map((t) => t.id));
      const keep = (list: TaskRow[]) => list.filter((t) => shown.has(t.id));

      const summary = [`${rows.length} việc ${scope}`];
      if (buckets.overdue.length) summary.push(`${buckets.overdue.length} quá hạn`);
      if (buckets.today.length) summary.push(`${buckets.today.length} đến hạn hôm nay`);

      return [
        `${summary.join(' · ')}. Hôm nay: ${formatDate(today)}.`,
        section('QUÁ HẠN', keep(buckets.overdue), render),
        section('HÔM NAY', keep(buckets.today), render),
        section('3 NGÀY TỚI', keep(buckets.soon), render),
        section('SAU ĐÓ', keep(buckets.later), render),
        section('CHƯA CÓ HẠN', keep(buckets.noDate), render),
        section('ĐÃ HOÀN THÀNH', keep(done), render),
        rows.length > limit ? `\nCòn ${rows.length - limit} việc chưa hiện. Thu hẹp bộ lọc hoặc tăng limit.` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
  );

  server.registerTool(
    'get_task',
    {
      title: 'Xem chi tiết công việc',
      description: 'Xem đầy đủ một công việc theo id: mô tả, link, lý do nghẽn, lịch sử thay đổi gần nhất.',
      inputSchema: {
        id: z.string().describe('Id công việc, lấy từ list_tasks.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const row = await store.task(args.id.trim());
      if (!row) throw new ToolError(`Không tìm thấy việc id "${args.id}". Gọi list_tasks để tìm đúng id.`);
      const today = vnToday(now());
      const logs = await store.taskLogs(row.id, 6);
      const lines = [
        row.title,
        `Trạng thái: ${row.status}${row.status !== 'Hoàn thành' ? ` (${Number(row.progress || 0)}%)` : ''}`,
        `Hạn: ${dueLabel(row.due_date, today)}${row.due_date ? ` (${row.due_date.slice(0, 10)})` : ''}`,
        `Phụ trách: ${row.assignee} · ${row.team}`,
        `Dự án: ${projectTag(row, r.projects)}${row.phase_name ? ` · ${row.phase_name}` : ''}`,
        `Mức độ: ${row.priority}`,
        row.blocker_reason && row.status === 'Bị nghẽn' ? `Lý do nghẽn: ${row.blocker_reason}` : '',
        row.work_link ? `Link làm việc: ${row.work_link}` : '',
        row.result_link ? `Link kết quả: ${row.result_link}` : '',
        row.details ? `Mô tả: ${row.details}` : '',
        row.created_by ? `Người tạo: ${row.created_by}` : '',
        `Mở trong app: ${taskUrl(row.id)}`,
        `Id: ${row.id}`,
      ].filter(Boolean);
      if (logs.length) {
        lines.push('', 'Lịch sử gần nhất:');
        for (const log of logs) {
          const day = vnToday(new Date(log.created_at));
          lines.push(`- ${dueLabel(day, today)} · ${log.author}: ${log.action}${log.note ? ` — ${log.note}` : ''}`);
        }
      }
      return lines.join('\n');
    })
  );

  server.registerTool(
    'add_task',
    {
      title: 'Thêm công việc',
      description:
        'Thêm một công việc mới vào WMS. Chỉ bắt buộc title; mặc định giao cho chủ token, hạn hôm nay, dự án "Chưa xác định (Others)". Tự bỏ qua nếu người phụ trách đã có việc trùng tiêu đề.',
      inputSchema: newTaskShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guard(async (args) => createTask(args, await refs(), new Map()))
  );

  server.registerTool(
    'add_tasks',
    {
      title: 'Thêm nhiều công việc',
      description: `Thêm nhiều công việc trong một lần gọi (tối đa ${MAX_BATCH}), dùng khi chuyển danh sách việc từ file, ghi chú, biên bản họp vào WMS. Mỗi việc xử lý độc lập: việc lỗi được báo riêng, việc trùng được bỏ qua.`,
      inputSchema: {
        tasks: z.array(z.object(newTaskShape)).min(1).max(MAX_BATCH).describe('Danh sách công việc cần thêm.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const cache: DuplicateCache = new Map();
      const lines: string[] = [];
      let added = 0;
      let skipped = 0;
      let failed = 0;
      for (const [index, item] of args.tasks.entries()) {
        try {
          const line = await createTask(item, r, cache);
          if (line.startsWith('Đã thêm')) added += 1;
          else skipped += 1;
          lines.push(`${index + 1}. ${line}`);
        } catch (err) {
          if (!(err instanceof ToolError)) console.error('[wms-mcp] Lỗi thêm việc hàng loạt:', err);
          failed += 1;
          const reason = (err as { message?: string })?.message || 'lỗi hệ thống';
          lines.push(`${index + 1}. LỖI, chưa thêm: ${item.title} — ${reason}`);
        }
      }
      const summary = [`Đã thêm ${added}/${args.tasks.length} việc`];
      if (skipped) summary.push(`${skipped} trùng, bỏ qua`);
      if (failed) summary.push(`${failed} lỗi`);
      return `${summary.join(' · ')}.\n\n${lines.join('\n')}`;
    })
  );

  server.registerTool(
    'update_task',
    {
      title: 'Cập nhật công việc',
      description:
        'Cập nhật một công việc: đổi trạng thái (hoàn thành, đang làm, bị nghẽn), dời hạn, đổi người phụ trách, thêm link, ghi chú tiến độ. Chỉ truyền các trường cần đổi. Mọi thay đổi được ghi vào lịch sử công việc.',
      inputSchema: updateTaskShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guard(async (args) => updateTask(args, await refs()))
  );

  server.registerTool(
    'daily_brief',
    {
      title: 'Bản tin công việc trong ngày',
      description:
        'Tóm tắt việc cần làm hôm nay cho một người (quá hạn, đến hạn hôm nay, 3 ngày tới, đang nghẽn) hoặc cho cả bộ phận. Dùng cho nhắc việc 08:00 sáng và nhắc đóng task 16:30.',
      inputSchema: {
        person: z.string().optional().describe('Username hoặc họ tên. Mặc định chủ token. Bỏ qua khi scope = "team".'),
        scope: z
          .enum(['me', 'team'])
          .optional()
          .describe('"me" (mặc định) = một người; "team" = tổng hợp cả bộ phận Sản phẩm.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const today = vnToday(now());
      const dayOfWeek = weekday(today);
      const weekend = dayOfWeek === 0 || dayOfWeek === 6 ? ' (cuối tuần)' : '';
      const leaves = await store.leavesOn(today);
      const onLeave = (name: string) => leaves.find((l) => fold(l.member_name) === fold(name));
      const leaveNote = (session?: string | null) =>
        session === 'morning' ? ' (sáng)' : session === 'afternoon' ? ' (chiều)' : '';

      if (args.scope === 'team') {
        const open = await store.tasks({ openOnly: true });
        const team = r.members.filter(isProductMember);
        const rowsOf = (m: MemberRow) => open.filter((t) => fold(t.assignee) === fold(m.name));
        const all = bucketByDue(open.filter((t) => team.some((m) => fold(m.name) === fold(t.assignee))), today);
        const blocked = open.filter((t) => t.status === 'Bị nghẽn');
        const render = (t: TaskRow) => taskLine(t, { today, projects: r.projects, showAssignee: true });

        const perMember = team
          .map((m) => ({ m, b: bucketByDue(rowsOf(m), today) }))
          .sort((x, y) => y.b.overdue.length - x.b.overdue.length || y.b.today.length - x.b.today.length)
          .map(({ m, b }) => {
            const leave = onLeave(m.name);
            return `- ${shortName(m)}: ${b.overdue.length} quá hạn · ${b.today.length} hôm nay · ${b.soon.length} trong 3 ngày tới${leave ? ` · nghỉ phép${leaveNote(leave.session)}` : ''}`;
          });

        // Đúng quy tắc nhắc việc 08:30: có việc đến hạn hôm nay (kể cả đã xong), việc tồn hoặc đang làm thì không nhắc.
        const dueToday = await store.tasks({ dueFrom: today, dueTo: today });
        const missing = team
          .filter((m) => !onLeave(m.name) && !hasWorkToday(rowsOf(m), dueToday, m.name, today))
          .map(shortName)
          .sort((a, b) => a.localeCompare(b, 'vi'));

        return [
          `Bộ phận Sản phẩm, ${formatDate(today)}${weekend}: ${all.overdue.length} việc quá hạn · ${all.today.length} đến hạn hôm nay · ${blocked.length} đang nghẽn.`,
          leaves.length
            ? `Nghỉ phép hôm nay: ${leaves.map((l) => `${l.member_name}${leaveNote(l.session)}`).join(', ')}.`
            : '',
          missing.length && !weekend ? `Chưa có task đến hạn hôm nay: ${missing.join(', ')}.` : '',
          `\nTHEO NHÂN SỰ\n${perMember.join('\n')}`,
          section('QUÁ HẠN', all.overdue.slice(0, 25), render),
          all.overdue.length > 25 ? `Còn ${all.overdue.length - 25} việc quá hạn khác (xem bằng list_tasks).` : '',
          section('ĐANG NGHẼN', blocked.slice(0, 15), render),
          `\nMở app: ${appUrl}/tasks`,
        ]
          .filter(Boolean)
          .join('\n');
      }

      const person = unwrap(resolveMember(args.person, r.members, r.actor));
      const open = await store.tasks({ openOnly: true, assignee: person.name });
      const b = bucketByDue(open, today);
      const blocked = open.filter((t) => t.status === 'Bị nghẽn');
      const render = (t: TaskRow) => taskLine(t, { today, projects: r.projects });
      const leave = onLeave(person.name);

      const head = `${person.name}, ${formatDate(today)}${weekend}: ${b.overdue.length} việc quá hạn · ${b.today.length} đến hạn hôm nay · ${b.soon.length} trong 3 ngày tới.`;

      // Một việc nên làm trước: Khẩn cấp trước, rồi tới việc trễ lâu nhất, rồi việc đến hạn hôm nay.
      const urgentFirst = (x: TaskRow, y: TaskRow) =>
        Number(y.priority === 'Khẩn cấp') - Number(x.priority === 'Khẩn cấp') || byUrgency(x, y);
      const firstPick = [...b.overdue, ...b.today].sort(urgentFirst)[0];
      const pickReason = (t: TaskRow) => {
        const late = t.due_date ? dayDiff(today, t.due_date.slice(0, 10)) : 0;
        const why = late > 0 ? `quá hạn ${late} ngày` : 'đến hạn hôm nay';
        return t.priority === 'Khẩn cấp' ? `Khẩn cấp, ${why}` : why;
      };
      const first = firstPick ? `Nên làm trước: ${firstPick.title} — ${pickReason(firstPick)} · id: ${firstPick.id}` : '';

      const todayMinutes = b.today.reduce((sum, t) => sum + (Number(t.estimate_minutes) || 0), 0);
      const todayUnestimated = b.today.filter((t) => !Number(t.estimate_minutes)).length;
      const load = b.today.length
        ? `Tải hôm nay: ${formatDuration(todayMinutes)} đã ước lượng${todayUnestimated ? ` · ${todayUnestimated} việc chưa ước lượng` : ''}.`
        : '';

      const shownIds = new Set([...b.overdue, ...b.today, ...b.soon].map((t) => t.id));
      const stale = open
        .filter((t) => !shownIds.has(t.id) && daysSinceUpdate(t, today) >= STALE_DAYS)
        .sort((x, y) => daysSinceUpdate(y, today) - daysSinceUpdate(x, today));
      const renderStale = (t: TaskRow) => `${taskLine(t, { today, projects: r.projects })}\n  Không cập nhật: ${daysSinceUpdate(t, today)} ngày`;

      // Việc đã giao cho người khác đang cần đôn đốc: quá hạn hoặc im lặng từ 3 ngày.
      const delegated = (await store.tasks({ openOnly: true, createdBy: person.name }))
        .filter((t) => fold(t.assignee) !== fold(person.name))
        .filter((t) => (t.due_date && t.due_date.slice(0, 10) < today) || daysSinceUpdate(t, today) >= NUDGE_DAYS)
        .sort(byUrgency);
      const renderDelegated = (t: TaskRow) =>
        `${taskLine(t, { today, projects: r.projects, showAssignee: true })}\n  Không cập nhật: ${daysSinceUpdate(t, today)} ngày`;
      const dueToday = await store.tasks({ assignee: person.name, dueFrom: today, dueTo: today });
      const nudge =
        !hasWorkToday(open, dueToday, person.name, today) && !leave && !weekend
          ? 'Chưa có task đến hạn hôm nay. Tạo việc hoặc cập nhật hạn hoàn thành.'
          : '';

      return [
        head,
        leave ? `Hôm nay nghỉ phép${leaveNote(leave.session)}.` : '',
        nudge,
        first,
        load,
        section('QUÁ HẠN', b.overdue, render),
        section('HÔM NAY', b.today, render),
        section('3 NGÀY TỚI', b.soon, render),
        section('ĐANG NGHẼN', blocked.filter((t) => !b.overdue.includes(t) && !b.today.includes(t) && !b.soon.includes(t)), render),
        section(`LÂU KHÔNG CẬP NHẬT (từ ${STALE_DAYS} ngày)`, stale.slice(0, 8), renderStale),
        section('ĐÃ GIAO, CẦN ĐÔN ĐỐC', delegated.slice(0, 10), renderDelegated),
        delegated.length > 10 ? `Còn ${delegated.length - 10} việc đã giao khác (list_tasks với delegated = true).` : '',
        b.noDate.length ? `\nCòn ${b.noDate.length} việc chưa có hạn (làm sau).` : '',
        `\nMở app: ${appUrl}/tasks`,
      ]
        .filter(Boolean)
        .join('\n');
    })
  );

  server.registerTool(
    'list_projects',
    {
      title: 'Xem danh sách dự án',
      description: 'Liệt kê dự án kèm mã, trạng thái, PM, hạn và số việc đang mở. Dùng để chọn đúng dự án khi thêm việc.',
      inputSchema: {
        include_done: z.boolean().optional().describe('true = gồm cả dự án Hoàn thành / Tạm dừng. Mặc định false.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const today = vnToday(now());
      const open = await store.tasks({ openOnly: true });
      const inactive = new Set(['Hoàn thành', 'Đã hoàn thành', 'Tạm dừng']);
      const list = r.projects.filter((p) => args.include_done || !inactive.has(p.status));
      const lines = list.map((p) => {
        const rows = open.filter((t) => t.project_id === p.id);
        const overdue = rows.filter((t) => t.due_date && t.due_date.slice(0, 10) < today).length;
        const pm = p.roles?.pm?.length ? p.roles.pm.join(', ') : p.lead_name || '';
        const parts = [
          p.status,
          pm ? `PM: ${pm}` : '',
          p.target_date ? `hạn ${formatDate(p.target_date.slice(0, 10))}` : '',
          `${rows.length} việc mở${overdue ? ` (${overdue} quá hạn)` : ''}`,
        ].filter(Boolean);
        return `- ${p.name}${p.is_strategic ? ' (chiến lược)' : ''} [${p.code.replace(/^VNE-/, '')}] — ${parts.join(' · ')}`;
      });
      return `${list.length} dự án. Dùng mã trong ngoặc vuông làm tham số project.\n${lines.join('\n')}`;
    })
  );

  server.registerTool(
    'list_members',
    {
      title: 'Xem danh sách nhân sự',
      description: 'Liệt kê nhân sự bộ phận Sản phẩm kèm username và nhóm chuyên môn. Dùng để chọn đúng người phụ trách.',
      inputSchema: {
        include_stakeholders: z.boolean().optional().describe('true = gồm cả Stakeholder (BBT, lãnh đạo các ban).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const list = r.members.filter((m) => args.include_stakeholders || isProductMember(m));
      const lines = list.map(
        (m) => `- ${m.name} (@${m.username || '—'}) · ${isProductMember(m) ? m.team : m.title || 'Stakeholder'}`
      );
      return `Bạn đang dùng tài khoản: ${r.actor.name} (@${r.actor.username}).\n${list.length} nhân sự:\n${lines.join('\n')}`;
    })
  );

  // ----- Xoá, bình luận -----------------------------------------------------

  server.registerTool(
    'delete_task',
    {
      title: 'Xoá công việc (vào Thùng rác)',
      description:
        'Chuyển một công việc vào Thùng rác của WMS. Khôi phục được trong app (mục Thùng rác). Dùng khi việc tạo trùng hoặc không còn liên quan. Luôn hỏi người dùng trước khi xoá.',
      inputSchema: {
        id: z.string().describe('Id công việc, lấy từ list_tasks.'),
        reason: z.string().max(500).optional().describe('Lý do xoá, lưu vào lịch sử. VD: "Tạo trùng với task-123".'),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const row = await store.task(args.id.trim());
      if (!row) throw new ToolError(`Không tìm thấy việc id "${args.id}". Có thể việc đã được xoá.`);
      const item = toTaskItem(row);
      if (!canDeleteTask(toMemberItem(r.actor), item, r.projects.map(toProjectItem))) {
        throw new ToolError(
          `${r.actor.name} không có quyền xoá việc này (phụ trách: ${row.assignee}). Chỉ người tạo, PM phụ trách dự án hoặc Admin được xoá.`
        );
      }

      const stamp = now().toISOString();
      const reason = args.reason?.trim();
      const history = (await store.allTaskLogs(row.id)).reverse().map((log: TaskLogRow) => ({
        id: log.id,
        author: log.author,
        timestamp: log.created_at,
        action: log.action,
        changes: log.changes || [],
        note: log.note || undefined,
      }));
      const deletionLog = {
        id: `log-${Date.now()}-${randomSuffix()}`,
        author: r.actor.name,
        timestamp: stamp,
        action: 'Chuyển vào Thùng rác',
        changes: [{ field: 'Trạng thái', oldValue: row.status, newValue: 'Thùng rác' }],
        note: `Công việc được xoá bởi ${r.actor.name}${reason ? `: ${reason}` : ''} (qua Claude)`,
      };

      await store.trashTask(row, {
        id: `trash-${Date.now()}-${randomSuffix()}`,
        original_id: row.id,
        type: 'task',
        title: row.title,
        subtitle: `${row.project_name || row.folder_name || 'Chưa xác định'} • ${row.assignee}`,
        data: { ...item, logs: [deletionLog, ...history] },
        deleted_by: r.actor.name,
        deleted_at: stamp,
      });

      return `Đã chuyển vào Thùng rác: ${row.title} — ${row.assignee} · id: ${row.id}\n  Khôi phục trong app: ${appUrl}/trash`;
    })
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Bình luận, nhắc việc trên công việc',
      description:
        'Thêm bình luận vào một công việc, dùng để trao đổi hoặc đôn đốc. Gõ @username để nhắc đích danh: người được nhắc và người phụ trách nhận thông báo trong app. Soạn nội dung cho người dùng duyệt trước khi gửi.',
      inputSchema: {
        id: z.string().describe('Id công việc, lấy từ list_tasks.'),
        text: z
          .string()
          .min(2)
          .max(2000)
          .describe('Nội dung bình luận, ngắn gọn, nêu rõ cần gì và hạn nào. VD: "@huyanh anh cần timeline box comment trước thứ Sáu."'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const row = await store.task(args.id.trim());
      if (!row) throw new ToolError(`Không tìm thấy việc id "${args.id}". Gọi list_tasks để tìm đúng id.`);

      // Đổi @username thành @Họ Tên để app tô nổi bật, đồng thời gom người được nhắc.
      const mentioned: MemberRow[] = [];
      const unknown: string[] = [];
      const body = args.text.trim().replace(/@([A-Za-z0-9_.-]+)/g, (whole, handle: string) => {
        const member = r.members.find((m) => (m.username || '').toLowerCase() === handle.toLowerCase());
        if (!member) {
          unknown.push(handle);
          return whole;
        }
        if (!mentioned.includes(member)) mentioned.push(member);
        return `@${member.name}`;
      });
      if (unknown.length) {
        throw new ToolError(
          `Không có username: ${unknown.map((u) => `@${u}`).join(', ')}. Gọi list_members để lấy đúng username, hoặc bỏ dấu @.`
        );
      }

      const stamp = now().toISOString();
      await store.addLog({
        id: `log-${Date.now()}-${randomSuffix()}`,
        task_id: row.id,
        author: r.actor.name,
        action: 'Bình luận',
        changes: [],
        note: `${body} (qua Claude)`,
        created_at: stamp,
      });
      await store.updateTask(row.id, { latest_update_note: body, updated_at: stamp });

      const snippet = body.length > 120 ? `${body.slice(0, 117)}...` : body;
      const notified: string[] = [];
      const notify = async (member: MemberRow, title: string) => {
        if (fold(member.name) === fold(r.actor.name) || notified.includes(member.name)) return;
        notified.push(member.name);
        await store.addNotification({
          id: `notif-${Date.now()}-${randomSuffix()}`,
          recipient_name: member.name,
          recipient_id: member.username || member.id,
          actor_name: r.actor.name,
          project_id: row.project_id,
          project_name: row.project_name || '',
          task_id: row.id,
          task_title: row.title,
          type: 'task_comment',
          title,
          content: `${r.actor.name}: "${snippet}"`,
          is_read: false,
          created_at: stamp,
        });
      };
      for (const member of mentioned) await notify(member, `Nhắc đến bạn: ${row.title}`);
      const assignee = r.members.find((m) => fold(m.name) === fold(row.assignee));
      if (assignee) await notify(assignee, `Trao đổi mới: ${row.title}`);

      return [
        `Đã bình luận: ${row.title} — ${row.assignee} · id: ${row.id}`,
        `  "${body}"`,
        notified.length ? `  Đã thông báo: ${notified.join(', ')}` : '  Không ai nhận thông báo (bạn là người phụ trách và không nhắc ai).',
        `  ${taskUrl(row.id)}`,
      ].join('\n');
    })
  );

  // ----- Theo dõi nhân sự ---------------------------------------------------

  server.registerTool(
    'member_summary',
    {
      title: 'Tình hình công việc của một nhân sự',
      description:
        'Tổng hợp việc của một người: quá hạn, đến hạn hôm nay kèm tổng ước lượng, đang nghẽn, lâu không cập nhật, việc chủ token đang chờ người này, số việc xong 7 ngày qua. Dùng để chuẩn bị họp 1:1 hoặc trước khi đôn đốc.',
      inputSchema: {
        person: z.string().describe('Username hoặc họ tên.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const today = vnToday(now());
      const person = unwrap(resolveMember(args.person, r.members, r.actor));
      const [open, done, leaves] = await Promise.all([
        store.tasks({ openOnly: true, assignee: person.name }),
        store.tasks({ statuses: ['Hoàn thành'], assignee: person.name, dueFrom: addDays(today, -30), limit: 300 }),
        store.leavesOn(today),
      ]);
      const b = bucketByDue(open, today);
      const blocked = open.filter((t) => t.status === 'Bị nghẽn');
      const stale = open
        .filter((t) => daysSinceUpdate(t, today) >= STALE_DAYS)
        .sort((x, y) => daysSinceUpdate(y, today) - daysSinceUpdate(x, today));
      const weekAgo = addDays(today, -7);
      const doneThisWeek = done.filter((t) => vnToday(new Date(t.completed_at || t.updated_at)) >= weekAgo);
      const waiting = open.filter((t) => fold(t.created_by || '') === fold(r.actor.name) && fold(person.name) !== fold(r.actor.name));
      const leave = leaves.find((l) => fold(l.member_name) === fold(person.name));
      const todayMinutes = b.today.reduce((sum, t) => sum + (Number(t.estimate_minutes) || 0), 0);
      const unestimated = b.today.filter((t) => !Number(t.estimate_minutes)).length;
      const render = (t: TaskRow) => taskLine(t, { today, projects: r.projects });
      const renderStale = (t: TaskRow) => `${render(t)}\n  Không cập nhật: ${daysSinceUpdate(t, today)} ngày`;

      return [
        `${person.name} (@${person.username || '—'}) · ${person.team}, ${formatDate(today)}: ${open.length} việc đang mở · ${b.overdue.length} quá hạn · ${b.today.length} đến hạn hôm nay · ${blocked.length} nghẽn · ${doneThisWeek.length} việc xong 7 ngày qua.`,
        leave ? `Hôm nay nghỉ phép${leave.session === 'morning' ? ' (sáng)' : leave.session === 'afternoon' ? ' (chiều)' : ''}.` : '',
        b.today.length
          ? `Tải hôm nay: ${formatDuration(todayMinutes)} đã ước lượng${unestimated ? ` · ${unestimated} việc chưa ước lượng` : ''}.`
          : 'Chưa có việc đến hạn hôm nay.',
        section('QUÁ HẠN', b.overdue, render),
        section('HÔM NAY', b.today, render),
        section('ĐANG NGHẼN', blocked.filter((t) => !b.overdue.includes(t) && !b.today.includes(t)), render),
        section(`LÂU KHÔNG CẬP NHẬT (từ ${STALE_DAYS} ngày)`, stale.filter((t) => !b.overdue.includes(t)).slice(0, 8), renderStale),
        section(`BẠN ĐANG CHỜ ${shortName(person).toUpperCase()}`, waiting.slice(0, 10), render),
        section('3 NGÀY TỚI', b.soon, render),
        b.noDate.length ? `\nCòn ${b.noDate.length} việc chưa có hạn.` : '',
        `\nMở app: ${appUrl}/tasks`,
      ]
        .filter(Boolean)
        .join('\n');
    })
  );

  server.registerTool(
    'workload_today',
    {
      title: 'Tải công việc đăng ký trong ngày',
      description:
        'Soát việc từng người đăng ký cho một ngày: tổng ước lượng so với 8 giờ làm việc, việc chưa ước lượng, tiêu đề chung chung, ngày chỉ có việc nhỏ. Trả về danh sách cần hỏi lại, không phải kết luận. Executive chỉ xem được của mình; Manager và Admin xem cả bộ phận.',
      inputSchema: {
        date: z.string().optional().describe('Ngày cần soát YYYY-MM-DD. Mặc định hôm nay.'),
        person: z.string().optional().describe('Chỉ xem một người: username hoặc họ tên.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    guard(async (args) => {
      const r = await refs();
      const today = vnToday(now());
      const date = cleanDate(args.date, 'date') ?? today;
      const role = getUserRole(toMemberItem(r.actor));
      const only = args.person ? unwrap(resolveMember(args.person, r.members, r.actor)) : null;
      if (role === 'Executive' && only && fold(only.name) !== fold(r.actor.name)) {
        throw new ToolError('Tài khoản Executive chỉ xem được tải công việc của chính mình.');
      }
      const team = (only ? [only] : role === 'Executive' ? [r.actor] : r.members.filter(isProductMember));

      const [dueRows, openRows, leaves] = await Promise.all([
        store.tasks({ dueFrom: date, dueTo: date }),
        store.tasks({ openOnly: true }),
        store.leavesOn(date),
      ]);

      const reports = team.map((m) => {
        const mine = dueRows.filter((t) => fold(t.assignee) === fold(m.name));
        const minutes = mine.reduce((sum, t) => sum + (Number(t.estimate_minutes) || 0), 0);
        const unestimated = mine.filter((t) => !Number(t.estimate_minutes));
        const vague = mine.filter((t) => checkTitleQuality(t.title).isVague);
        const inProgress = openRows.filter((t) => fold(t.assignee) === fold(m.name) && t.status === 'Đang làm' && !mine.includes(t));
        const leave = leaves.find((l) => fold(l.member_name) === fold(m.name));
        const halfDay = leave && (leave.session === 'morning' || leave.session === 'afternoon');
        const threshold = halfDay ? LIGHT_DAY_MINUTES / 2 : LIGHT_DAY_MINUTES;

        const flags: string[] = [];
        if (leave && !halfDay) {
          flags.push('nghỉ phép');
        } else {
          if (!mine.length) flags.push(inProgress.length ? `không có việc đến hạn, đang làm ${inProgress.length} việc khác` : 'chưa đăng ký việc');
          else if (!unestimated.length && minutes < threshold) flags.push(`tải nhẹ: ${formatDuration(minutes)}/${halfDay ? 4 : 8} giờ`);
          if (unestimated.length) flags.push(`${unestimated.length} việc chưa ước lượng`);
          if (vague.length) flags.push(`${vague.length} tiêu đề chung chung`);
          if (halfDay) flags.push(`nghỉ ${leave!.session === 'morning' ? 'sáng' : 'chiều'}`);
        }
        const needsAsk = flags.some((f) => !f.startsWith('nghỉ'));
        return { m, mine, minutes, flags, needsAsk };
      });

      const order = [...reports].sort((x, y) => Number(y.needsAsk) - Number(x.needsAsk) || x.minutes - y.minutes);
      const ask = reports.filter((x) => x.needsAsk).length;
      const blocks = order.map(({ m, mine, minutes, flags }) => {
        const head = `${shortName(m)} (@${m.username || '—'}): ${mine.length} việc · ${formatDuration(minutes)}${flags.length ? ` — ${flags.join(' · ')}` : ''}`;
        const lines = mine.map((t) => {
          const estimate = formatEstimate(Number(t.estimate_minutes)) || 'chưa ước lượng';
          return `  - ${t.title} — ${estimate} · ${t.status} · id: ${t.id}`;
        });
        return [head, ...lines].join('\n');
      });

      return [
        `Tải công việc ${dueLabel(date, today) === 'Hôm nay' ? 'hôm nay' : 'ngày'} ${formatDate(date)}: ${team.length} người · ${ask} người cần hỏi lại.`,
        'Ngưỡng tải nhẹ: tổng ước lượng dưới 6 giờ khi mọi việc đã có ước lượng. Đây là tín hiệu để hỏi, không phải kết luận.',
        '',
        blocks.join('\n\n'),
      ].join('\n');
    })
  );

  return server;
}
