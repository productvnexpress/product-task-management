/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gom dữ liệu thật của dự án để gợi ý "việc tiếp theo".
 * Dùng chung cho connector MCP (Claude trong chat tự diễn đạt) và `/api/suggest` (Claude Haiku gọi từ app).
 * Chỉ đọc dữ liệu, không ghi.
 */

import type { MemberRow, ProjectDetail, TaskRow, WmsStore } from './store.js';
import { OTHERS_PROJECT_ID, dayDiff, dueLabel, fold, isProductMember } from './domain.js';

export interface NextTaskInput {
  title: string;
  assignee: string;
  projectId: string | null;
  /** 'created' = vừa thêm việc, 'completed' = vừa đóng việc. */
  trigger: 'created' | 'completed';
  taskId?: string;
}

export interface NextContext {
  today: string;
  trigger: NextTaskInput['trigger'];
  task: { title: string; assignee: string; team: string };
  project: {
    name: string;
    code: string;
    status: string;
    strategic: boolean;
    description: string;
    objective: string;
    targetDate: string | null;
  } | null;
  /** Mốc sắp tới: giai đoạn chưa xong và hạn dự án. */
  milestones: { name: string; dueDate: string; daysLeft: number }[];
  /** Tiêu chuẩn checklist chưa xong của giai đoạn checklist sớm nhất còn dở. */
  checklistPending: { phase: string; items: string[] } | null;
  /** Thành viên dự án kèm vai trò, để gợi ý việc chuyển tiếp. */
  teammates: { name: string; role: string }[];
  /** Việc đang mở của người phụ trách (ưu tiên trong dự án). */
  assigneeOpen: { title: string; due: string }[];
  /** Việc đang mở của người khác trong dự án. */
  projectOpen: { title: string; assignee: string }[];
  /** Việc vừa xong gần đây trong dự án. */
  recentDone: { title: string; assignee: string }[];
}

const DONE_PHASE = new Set(['đã hoàn thành', 'hoàn thành', 'completed', 'done']);
const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

const ROLE_LABEL: Record<string, string> = { pm: 'Product Manager', designer: 'UX/UI Designer', seo: 'SEO', data: 'Data' };

function teammatesOf(project: ProjectDetail, members: MemberRow[]): NextContext['teammates'] {
  const seen = new Set<string>();
  const out: NextContext['teammates'] = [];
  const push = (name: string, role: string) => {
    const key = fold(name);
    if (!key || seen.has(key)) return;
    // Chỉ nhận người có trong danh sách nhân sự Product: tên trong roles có thể đã cũ.
    const member = members.find((m) => fold(m.name) === key && isProductMember(m));
    if (!member) return;
    seen.add(key);
    out.push({ name: member.name, role });
  };
  for (const key of ['pm', 'designer', 'seo', 'data'] as const) {
    for (const name of project.roles?.[key] || []) push(name, ROLE_LABEL[key]);
  }
  for (const name of (project.lead_name || '').split(',')) {
    const member = members.find((m) => fold(m.name) === fold(name));
    if (member) push(member.name, member.team);
  }
  return out;
}

/** Việc có gắn dự án thật (không phải Others, không phải nằm trực tiếp trong thư mục). */
export const hasProjectContext = (projectId: string | null | undefined): boolean =>
  Boolean(projectId) && projectId !== OTHERS_PROJECT_ID && !projectId!.startsWith('folder:');

export async function gatherNextContext(
  store: WmsStore,
  input: NextTaskInput,
  members: MemberRow[],
  today: string
): Promise<NextContext> {
  const assignee = members.find((m) => fold(m.name) === fold(input.assignee));
  const hasProject = hasProjectContext(input.projectId);

  const [detail, assigneeRows, projectRows, doneRows] = await Promise.all([
    hasProject ? store.projectDetail(input.projectId!) : Promise.resolve(null),
    store.tasks({ openOnly: true, assignee: input.assignee, limit: 200 }),
    hasProject ? store.tasks({ openOnly: true, projectId: input.projectId!, limit: 200 }) : Promise.resolve([] as TaskRow[]),
    hasProject
      ? store.tasks({ statuses: ['Hoàn thành'], projectId: input.projectId!, limit: 12 })
      : Promise.resolve([] as TaskRow[]),
  ]);

  const notSelf = (t: TaskRow) => t.id !== input.taskId && fold(t.title) !== fold(input.title);

  const milestones: NextContext['milestones'] = [];
  let checklistPending: NextContext['checklistPending'] = null;
  if (detail) {
    for (const phase of detail.phases) {
      if (!phase.due_date || DONE_PHASE.has((phase.status || '').toLowerCase())) continue;
      const due = phase.due_date.slice(0, 10);
      milestones.push({ name: phase.name, dueDate: due, daysLeft: dayDiff(due, today) });
    }
    if (detail.target_date) {
      const due = detail.target_date.slice(0, 10);
      milestones.push({ name: 'Hạn hoàn thành dự án', dueDate: due, daysLeft: dayDiff(due, today) });
    }
    milestones.sort((a, b) => a.daysLeft - b.daysLeft);

    const pending = detail.checklist.filter((c) => c.text && (c.status || 'pending') === 'pending');
    const touched = detail.checklist.some((c) => c.status && c.status !== 'pending');
    // Checklist chưa ai đụng tới thì không dùng: tránh gợi ý theo mẫu khi dự án không áp dụng checklist.
    if (pending.length && touched) {
      const firstPhase = Math.min(...pending.map((c) => c.phaseId ?? 99));
      const items = pending.filter((c) => (c.phaseId ?? 99) === firstPhase);
      checklistPending = {
        phase: items[0]?.phaseTitle || `Giai đoạn ${firstPhase}`,
        items: items.slice(0, 5).map((c) => clip(c.text, 140)),
      };
    }
  }

  const inProject = (t: TaskRow) => !hasProject || t.project_id === input.projectId;
  const assigneeOpen = assigneeRows
    .filter(notSelf)
    .sort((a, b) => Number(inProject(b)) - Number(inProject(a)))
    .slice(0, 6)
    .map((t) => ({ title: clip(t.title, 100), due: dueLabel(t.due_date, today) }));

  return {
    today,
    trigger: input.trigger,
    task: { title: input.title, assignee: input.assignee, team: assignee?.team || '' },
    project: detail
      ? {
          name: detail.name,
          code: detail.code,
          status: detail.status,
          strategic: Boolean(detail.is_strategic),
          description: clip((detail.description || '').trim(), 280),
          objective: clip(String((detail as { objective?: string | null }).objective || '').trim(), 200),
          targetDate: detail.target_date ? detail.target_date.slice(0, 10) : null,
        }
      : null,
    milestones: milestones.slice(0, 4),
    checklistPending,
    teammates: detail ? teammatesOf(detail, members) : [],
    assigneeOpen,
    projectOpen: projectRows
      .filter((t) => notSelf(t) && fold(t.assignee) !== fold(input.assignee))
      .slice(0, 6)
      .map((t) => ({ title: clip(t.title, 100), assignee: t.assignee })),
    recentDone: doneRows
      .filter(notSelf)
      .slice(0, 5)
      .map((t) => ({ title: clip(t.title, 100), assignee: t.assignee })),
  };
}

const milestoneLine = (m: NextContext['milestones'][number]) =>
  `${m.name}: ${m.dueDate} (${m.daysLeft < 0 ? `quá ${-m.daysLeft} ngày` : m.daysLeft === 0 ? 'hôm nay' : `còn ${m.daysLeft} ngày`})`;

/** Trình bày dữ liệu thành văn bản cho Claude đọc. */
export function renderNextContext(ctx: NextContext): string {
  const lines: string[] = [
    `Hôm nay: ${ctx.today}`,
    `Việc vừa ${ctx.trigger === 'completed' ? 'hoàn thành' : 'được thêm'}: "${ctx.task.title}"`,
    `Người phụ trách: ${ctx.task.assignee}${ctx.task.team ? ` (${ctx.task.team})` : ''}`,
  ];
  if (ctx.project) {
    lines.push(
      `Dự án: ${ctx.project.name} [${ctx.project.code}] · ${ctx.project.status}${ctx.project.strategic ? ' · chiến lược' : ''}`
    );
    if (ctx.project.description) lines.push(`Mô tả dự án: ${ctx.project.description}`);
    if (ctx.project.objective) lines.push(`Mục tiêu & KPI: ${ctx.project.objective}`);
  } else {
    lines.push('Dự án: chưa gắn dự án cụ thể.');
  }
  if (ctx.milestones.length) lines.push('', 'Mốc sắp tới:', ...ctx.milestones.map((m) => `- ${milestoneLine(m)}`));
  if (ctx.checklistPending) {
    lines.push('', `Checklist chưa xong (${ctx.checklistPending.phase}):`, ...ctx.checklistPending.items.map((i) => `- ${i}`));
  }
  if (ctx.teammates.length) {
    lines.push('', 'Thành viên dự án:', ...ctx.teammates.map((t) => `- ${t.name} (${t.role})`));
  }
  if (ctx.assigneeOpen.length) {
    lines.push('', `Việc đang mở của ${ctx.task.assignee} (không gợi ý trùng):`, ...ctx.assigneeOpen.map((t) => `- ${t.title} — ${t.due}`));
  }
  if (ctx.projectOpen.length) {
    lines.push('', 'Việc đang mở của người khác trong dự án (không gợi ý trùng):', ...ctx.projectOpen.map((t) => `- ${t.title} — ${t.assignee}`));
  }
  if (ctx.recentDone.length) {
    lines.push('', 'Việc đã xong gần đây trong dự án:', ...ctx.recentDone.map((t) => `- ${t.title} — ${t.assignee}`));
  }
  return lines.join('\n');
}

/** Bản rút gọn kèm kết quả công cụ MCP. Trả chuỗi rỗng nếu không có dữ liệu đáng gợi ý. */
export function renderNextHint(ctx: NextContext): string {
  if (!ctx.project || (!ctx.milestones.length && !ctx.checklistPending && !ctx.teammates.length)) return '';
  const lines = ['  Dữ liệu để gợi ý việc tiếp theo (đề xuất 1–3 việc cụ thể, hỏi người dùng trước khi tạo):'];
  if (ctx.milestones.length) lines.push(`  - Mốc sắp tới: ${ctx.milestones.slice(0, 2).map(milestoneLine).join('; ')}`);
  if (ctx.checklistPending) {
    lines.push(`  - Checklist chưa xong (${ctx.checklistPending.phase}): ${ctx.checklistPending.items.slice(0, 3).join(' | ')}`);
  }
  const others = ctx.teammates.filter((t) => fold(t.name) !== fold(ctx.task.assignee));
  if (others.length) lines.push(`  - Chuyển tiếp cho: ${others.map((t) => `${t.name} (${t.role})`).join(', ')}`);
  if (ctx.assigneeOpen.length) lines.push(`  - Đang mở của ${ctx.task.assignee}: ${ctx.assigneeOpen.slice(0, 4).map((t) => t.title).join(' | ')}`);
  return lines.join('\n');
}
