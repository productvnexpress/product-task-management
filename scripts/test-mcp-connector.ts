/**
 * Kiểm thử connector Claude của WMS bằng dữ liệu trong bộ nhớ (không chạm Supabase).
 * Chạy: npm run test:mcp
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import handler from '../api/mcp.js';
import { createWmsServer } from '../api/_wms/tools.js';
import type {
  FolderRow, LeaveRow, MemberRow, NotificationRow, ProjectRow, TaskLogRow, TaskQuery, TaskRow, WmsStore,
} from '../api/_wms/store.js';

const NOW = new Date('2026-11-10T03:00:00Z'); // Tue, 10 Nov 2026 • 10:00 giờ Việt Nam
const APP = 'https://wms.test';

const member = (id: string, name: string, last: string, first: string, username: string, team: string, group = 'Product'): MemberRow =>
  ({ id, name, last_name: last, first_name: first, username, team, group_type: group, role: null, title: team, email: `${username}@vnexpress.net` });

const task = (id: string, title: string, assignee: string, due: string | null, extra: Partial<TaskRow> = {}): TaskRow => ({
  id, title, project_id: 'proj-wms', project_name: 'Work Management System (WMS)', folder_id: null, folder_name: null,
  phase_id: null, phase_name: null, team: 'Product Manager', assignee, product_owners: [], status: 'Chưa làm',
  priority: 'Bình thường', due_date: due, progress: 0, details: null, blocker_reason: null, work_link: null,
  result_link: null, latest_update_note: null, created_by: assignee, created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z', completed_at: null, ...extra,
});

class MemoryStore implements WmsStore {
  membersData: MemberRow[] = [
    member('mem-1', 'Trần Huy Anh', 'Trần', 'Anh', 'huyanh', 'Product Manager'),
    member('mem-4', 'Đặng Tiến Ngọc', 'Đặng', 'Ngọc', 'tienngoc', 'Product Manager'),
    member('mem-5', 'Trần Duy Tùng', 'Trần', 'Tùng', 'duytung', 'UX/UI Designer'),
    member('mem-7', 'Tiêu Đình Trung', 'Tiêu', 'Trung', 'dinhtrung', 'UX/UI Designer'),
    member('mem-11', 'Vũ Hữu Trung', 'Vũ', 'Trung', 'huutrung', 'SEO'),
    member('mem-20', 'Phạm Văn Hiếu', 'Phạm', 'Hiếu', 'phamhieu', 'Stakeholder', 'Stakeholder'),
  ];
  projectsData: ProjectRow[] = [
    { id: 'proj-wms', name: 'Work Management System (WMS)', code: 'VNE-WMS', status: 'Đang triển khai', lead_name: 'Trần Huy Anh, Trần Duy Tùng', roles: { pm: ['Trần Huy Anh'] } },
    { id: 'proj-ykien', name: 'Ý kiến', code: 'VNE-YKIEN', status: 'Đang triển khai', folder_id: 'folder-vne-ykien', roles: { pm: ['Trần Huy Anh'] } },
    { id: 'proj-kpi', name: 'KPI System', code: 'VNE-KPI', status: 'Đang triển khai', roles: { pm: ['Đặng Tiến Ngọc'] } },
    { id: 'proj-others', name: 'Chưa xác định (Others)', code: 'VNE-OTHERS', status: 'Đang triển khai' },
  ];
  foldersData: FolderRow[] = [
    { id: 'folder-vne', name: 'VnExpress', parent_id: null },
    { id: 'folder-vne-ykien', name: 'Ý kiến', parent_id: 'folder-vne' },
  ];
  tasksData: TaskRow[] = [
    task('t-over', 'Viết PRD trang Ý kiến bản mobile', 'Đặng Tiến Ngọc', '2026-11-06', { status: 'Đang làm', priority: 'Khẩn cấp' }),
    task('t-today', 'Rà soát tracking plan trang KPI', 'Đặng Tiến Ngọc', '2026-11-10'),
    task('t-soon', 'Chốt wireframe bảng điều khiển WMS', 'Đặng Tiến Ngọc', '2026-11-12', { work_link: 'https://figma.com/file/abc' }),
    task('t-tung', 'Thiết kế màn hình hiệu suất team', 'Trần Duy Tùng', '2026-11-09', { team: 'UX/UI Designer', project_id: 'proj-kpi', project_name: 'KPI System' }),
    task('t-done', 'Dựng trang đăng nhập WMS', 'Đặng Tiến Ngọc', '2026-11-03', { status: 'Hoàn thành', progress: 100, result_link: 'https://wms.test/login', completed_at: '2026-11-03T08:00:00Z' }),
  ];
  logs: TaskLogRow[] = [];
  notifications: NotificationRow[] = [];
  leaves: LeaveRow[] = [{ member_name: 'Vũ Hữu Trung', start_date: '2026-11-10', end_date: '2026-11-10', session: 'morning', status: 'Đã duyệt' }];

  async members() { return this.membersData; }
  async projects() { return this.projectsData; }
  async folders() { return this.foldersData; }
  async tasks(q: TaskQuery) {
    return this.tasksData.filter((t) =>
      (!q.openOnly || t.status !== 'Hoàn thành') &&
      (!q.statuses?.length || q.statuses.includes(t.status)) &&
      (!q.assignee || t.assignee === q.assignee) &&
      (!q.projectId || t.project_id === q.projectId) &&
      (!q.dueFrom || (t.due_date !== null && t.due_date >= q.dueFrom)) &&
      (!q.dueTo || (t.due_date !== null && t.due_date <= q.dueTo)));
  }
  async task(id: string) { return this.tasksData.find((t) => t.id === id) || null; }
  async taskLogs(taskId: string, limit: number) { return this.logs.filter((l) => l.task_id === taskId).reverse().slice(0, limit); }
  async insertTask(row: TaskRow) { this.tasksData.push({ ...row }); }
  async updateTask(id: string, patch: Partial<TaskRow>) { Object.assign(this.tasksData.find((t) => t.id === id)!, patch); }
  async addLog(row: TaskLogRow) { this.logs.push(row); }
  async addNotification(row: NotificationRow) { this.notifications.push(row); }
  async leavesOn(date: string) { return this.leaves.filter((l) => l.start_date <= date && date <= l.end_date); }
}

async function connect(store: MemoryStore, actorUsername = 'tienngoc') {
  const server = createWmsServer({ store, actorUsername, appUrl: APP, now: () => NOW });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean };
    return { text: result.content.map((c) => c.text).join('\n'), isError: Boolean(result.isError) };
  };
  return { client, call };
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n`, err);
    process.exitCode = 1;
  }
}

await test('liệt kê đủ 8 công cụ, công cụ đọc gắn readOnlyHint', async () => {
  const { client } = await connect(new MemoryStore());
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(),
    ['add_task', 'add_tasks', 'daily_brief', 'get_task', 'list_members', 'list_projects', 'list_tasks', 'update_task']);
  assert.equal(tools.find((t) => t.name === 'list_tasks')?.annotations?.readOnlyHint, true);
  assert.equal(tools.find((t) => t.name === 'add_task')?.annotations?.readOnlyHint, false);
});

await test('list_tasks mặc định: việc đang mở của chủ token, nhóm theo hạn', async () => {
  const { call } = await connect(new MemoryStore());
  const { text } = await call('list_tasks');
  assert.match(text, /^3 việc của Đặng Tiến Ngọc, đang mở · 1 quá hạn · 1 đến hạn hôm nay\. Hôm nay: Tue, 10 Nov 2026\./);
  assert.match(text, /QUÁ HẠN \(1\)\n- Viết PRD trang Ý kiến bản mobile — Fri, 06 Nov 2026 \(quá 4 ngày\) · Đang làm · Khẩn cấp · Work Management System \(WMS\) \[WMS\] · id: t-over/);
  assert.match(text, /HÔM NAY \(1\)/);
  assert.match(text, /3 NGÀY TỚI \(1\)/);
  assert.doesNotMatch(text, /Dựng trang đăng nhập|Thiết kế màn hình/);
});

await test('list_tasks: lọc toàn bộ phận, từ khoá không dấu, dự án theo mã', async () => {
  const { call } = await connect(new MemoryStore());
  const all = await call('list_tasks', { assignee: 'all', due: 'overdue' });
  assert.match(all.text, /2 việc toàn bộ phận/);
  assert.match(all.text, /Hôm qua · Chưa làm · Trần Duy Tùng · KPI System \[KPI\]/);
  const q = await call('list_tasks', { query: 'wireframe bang dieu khien' });
  assert.match(q.text, /^1 việc/);
  const p = await call('list_tasks', { assignee: 'all', project: 'kpi' });
  assert.match(p.text, /^1 việc toàn bộ phận, dự án KPI System/);
  const done = await call('list_tasks', { status: 'Hoàn thành' });
  assert.match(done.text, /ĐÃ HOÀN THÀNH \(1\)/);
});

await test('add_task: mặc định giao chủ token, hạn hôm nay, dự án Others, có log và link', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const { text, isError } = await call('add_task', { title: 'Viết  hướng dẫn kết nối Claude cho bộ phận' });
  assert.equal(isError, false);
  const row = store.tasksData.at(-1)!;
  assert.equal(row.title, 'Viết hướng dẫn kết nối Claude cho bộ phận');
  assert.equal(row.assignee, 'Đặng Tiến Ngọc');
  assert.equal(row.team, 'Product Manager');
  assert.equal(row.due_date, '2026-11-10');
  assert.equal(row.project_id, 'proj-others');
  assert.equal(row.status, 'Chưa làm');
  assert.equal(row.created_by, 'Đặng Tiến Ngọc');
  assert.match(text, new RegExp(`^Đã thêm: Viết hướng dẫn kết nối Claude cho bộ phận — Hôm nay · Chưa làm · Đặng Tiến Ngọc · .*id: ${row.id}\\n  ${APP}/tasks/${row.id}`));
  assert.equal(store.logs.length, 1);
  assert.equal(store.logs[0].action, 'Khởi tạo công việc mới');
  assert.equal(store.logs[0].note, 'Thêm qua Claude.');
  assert.equal(store.notifications.length, 0, 'tự giao cho mình thì không bắn thông báo');
});

await test('add_task: giao người khác theo username, dự án theo mã, gán thư mục, bắn thông báo', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  await call('add_task', { title: 'Thiết kế banner chuyên mục Ý kiến tháng 11', assignee: '@duytung', project: '#YKIEN', due_date: '2026-11-13', urgent: true, work_link: 'figma.com/file/xyz' });
  const row = store.tasksData.at(-1)!;
  assert.equal(row.assignee, 'Trần Duy Tùng');
  assert.equal(row.team, 'UX/UI Designer');
  assert.equal(row.project_id, 'proj-ykien');
  assert.equal(row.folder_id, 'folder-vne-ykien');
  assert.equal(row.folder_name, 'VnExpress › Ý kiến');
  assert.equal(row.priority, 'Khẩn cấp');
  assert.equal(row.work_link, 'https://figma.com/file/xyz');
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].recipient_id, 'duytung');
  assert.equal(store.notifications[0].type, 'task_assigned');
});

await test('add_task: chống trùng, tên trùng "Trung" bắt chọn, sai ngày, sai link, cảnh báo tiêu đề chung chung', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const before = store.tasksData.length;
  const dup = await call('add_task', { title: 'rà soát TRACKING plan trang kpi' });
  assert.match(dup.text, /^Đã có sẵn, không tạo thêm: Rà soát tracking plan trang KPI .* id: t-today/);
  const amb = await call('add_task', { title: 'Tối ưu thẻ meta trang chủ', assignee: 'Trung' });
  assert.equal(amb.isError, true);
  assert.match(amb.text, /trùng nhiều người: Tiêu Đình Trung \(@dinhtrung\), Vũ Hữu Trung \(@huutrung\)/);
  const badDate = await call('add_task', { title: 'Viết báo cáo tuần 46', due_date: '13/11/2026' });
  assert.match(badDate.text, /due_date phải theo định dạng YYYY-MM-DD/);
  const badLink = await call('add_task', { title: 'Viết báo cáo tuần 46', work_link: 'xong rồi' });
  assert.match(badLink.text, /work_link không đúng định dạng URL/);
  const noProj = await call('add_task', { title: 'Viết báo cáo tuần 46', project: 'khong-ton-tai' });
  assert.match(noProj.text, /Không tìm thấy dự án/);
  assert.equal(store.tasksData.length, before, 'các lời gọi lỗi không được tạo việc');
  const vague = await call('add_task', { title: 'Fix bug' , allow_duplicate: true});
  assert.match(vague.text, /^Đã thêm: Fix bug/);
  assert.match(vague.text, /Lưu ý tiêu đề:/);
});

await test('add_tasks: thêm hàng loạt, báo riêng việc trùng và việc lỗi, nhập việc đã xong', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const { text } = await call('add_tasks', { tasks: [
    { title: 'Tổng hợp phản hồi người dùng WMS tuần 45', project: 'WMS' },
    { title: 'Rà soát tracking plan trang KPI' },
    { title: 'Bàn giao bộ icon VDS cho đội tech', status: 'Hoàn thành' },
    { title: 'Bàn giao tài liệu VDS 0.5.0 cho đội tech', status: 'Hoàn thành', result_link: 'https://docs.google.com/d/1', due_date: '2026-11-05', completed_date: '2026-11-05' },
    { title: 'Tổng hợp phản hồi người dùng WMS tuần 45' },
  ] });
  assert.match(text, /^Đã thêm 2\/5 việc · 2 trùng, bỏ qua · 1 lỗi\./);
  assert.match(text, /3\. LỖI, chưa thêm: Bàn giao bộ icon VDS cho đội tech — Việc "Hoàn thành" cần result_link/);
  const done = store.tasksData.find((t) => t.title.startsWith('Bàn giao tài liệu'))!;
  assert.equal(done.progress, 100);
  assert.equal(done.completed_at, '2026-11-05T17:30:00+07:00');
  assert.notEqual(new Set(store.tasksData.map((t) => t.id)).size, 0);
  assert.equal(new Set(store.tasksData.map((t) => t.id)).size, store.tasksData.length, 'id không trùng');
  assert.equal(new Set(store.logs.map((l) => l.id)).size, store.logs.length, 'id log không trùng');
});

await test('update_task: hoàn thành bắt buộc link, gợi ý dùng link làm việc, ghi log chuẩn app', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const noLink = await call('update_task', { id: 't-soon', status: 'Hoàn thành' });
  assert.equal(noLink.isError, true);
  assert.match(noLink.text, /cần result_link là URL hợp lệ.*link làm việc https:\/\/figma\.com\/file\/abc/);
  assert.equal(store.tasksData.find((t) => t.id === 't-soon')!.status, 'Chưa làm');

  const ok = await call('update_task', { id: 't-soon', status: 'Hoàn thành', result_link: 'figma.com/file/abc' });
  const row = store.tasksData.find((t) => t.id === 't-soon')!;
  assert.equal(row.status, 'Hoàn thành');
  assert.equal(row.progress, 100);
  assert.equal(row.result_link, 'https://figma.com/file/abc');
  assert.equal(row.completed_at, NOW.toISOString());
  assert.equal(row.updated_at, NOW.toISOString());
  assert.match(ok.text, /^Đã hoàn thành: Chốt wireframe bảng điều khiển WMS/);
  assert.match(ok.text, /Trạng thái: Chưa làm → Hoàn thành/);
  const log = store.logs.at(-1)!;
  assert.equal(log.action, 'Đổi trạng thái ➔ Hoàn thành');
  assert.equal(log.note, 'Hoàn thành công việc kèm link: https://figma.com/file/abc (qua Claude)');
  assert.equal(log.author, 'Đặng Tiến Ngọc');

  await call('update_task', { id: 't-soon', status: 'Đang làm' });
  assert.equal(row.completed_at, null);
  assert.equal(row.progress, 50);
});

await test('update_task: dời hạn, nghẽn cần lý do, ghi chú, không đổi gì thì không ghi log', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const moved = await call('update_task', { id: 't-over', due_date: '2026-11-11', note: 'Chờ BBT chốt phạm vi' });
  assert.match(moved.text, /^Đã cập nhật: .* — Ngày mai · Đang làm/);
  assert.match(moved.text, /Hạn hoàn thành: Fri, 06 Nov 2026 → Wed, 11 Nov 2026/);
  assert.equal(store.tasksData[0].latest_update_note, 'Chờ BBT chốt phạm vi');
  assert.equal(store.logs.at(-1)!.note, 'Chờ BBT chốt phạm vi (qua Claude)');

  const blockedNoReason = await call('update_task', { id: 't-over', status: 'Bị nghẽn' });
  assert.match(blockedNoReason.text, /cần blocker_reason/);
  await call('update_task', { id: 't-over', status: 'Bị nghẽn', blocker_reason: 'Thiếu số liệu từ Data' });
  assert.equal(store.tasksData[0].status, 'Bị nghẽn');
  assert.equal(store.logs.at(-1)!.note, 'Cảnh báo nghẽn: Thiếu số liệu từ Data (qua Claude)');

  const count = store.logs.length;
  const same = await call('update_task', { id: 't-over', status: 'Bị nghẽn', urgent: true });
  assert.match(same.text, /^Không có gì thay đổi/);
  assert.equal(store.logs.length, count);

  const missing = await call('update_task', { id: 'khong-co', status: 'Đang làm' });
  assert.match(missing.text, /Không tìm thấy việc id/);
});

await test('update_task: phân quyền theo RBAC của app', async () => {
  const store = new MemoryStore();
  const asTung = await connect(store, 'duytung');
  const denied = await asTung.call('update_task', { id: 't-today', due_date: '2026-11-12' });
  assert.equal(denied.isError, true);
  assert.match(denied.text, /Trần Duy Tùng không có quyền sửa việc này/);
  assert.equal(store.tasksData.find((t) => t.id === 't-today')!.due_date, '2026-11-10');
  const own = await asTung.call('update_task', { id: 't-tung', status: 'Đang làm' });
  assert.equal(own.isError, false);

  const asAdmin = await connect(store, 'tienngoc');
  const reassigned = await asAdmin.call('update_task', { id: 't-tung', assignee: 'huutrung' });
  assert.match(reassigned.text, /Người phụ trách: Trần Duy Tùng → Vũ Hữu Trung/);
  assert.equal(store.tasksData.find((t) => t.id === 't-tung')!.team, 'SEO');
  assert.equal(store.notifications.at(-1)!.recipient_name, 'Vũ Hữu Trung');
});

await test('get_task: chi tiết kèm lịch sử và link mở app', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  await call('update_task', { id: 't-today', status: 'Đang làm', progress: 30 });
  const { text } = await call('get_task', { id: 't-today' });
  assert.match(text, /^Rà soát tracking plan trang KPI\nTrạng thái: Đang làm \(30%\)\nHạn: Hôm nay \(2026-11-10\)/);
  assert.match(text, /Mở trong app: https:\/\/wms\.test\/tasks\/t-today/);
  assert.match(text, /Lịch sử gần nhất:\n- Hôm nay · Đặng Tiến Ngọc: Đổi trạng thái ➔ Đang làm/);
});

await test('daily_brief: cá nhân và cả bộ phận, tính nghỉ phép', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const me = await call('daily_brief');
  assert.match(me.text, /^Đặng Tiến Ngọc, Tue, 10 Nov 2026: 1 việc quá hạn · 1 đến hạn hôm nay · 1 trong 3 ngày tới\./);
  const idle = await call('daily_brief', { person: 'huyanh' });
  assert.match(idle.text, /Chưa có task đến hạn hôm nay\. Tạo việc hoặc cập nhật hạn hoàn thành\./);
  const tung = await call('daily_brief', { person: 'duytung' });
  assert.doesNotMatch(tung.text, /Chưa có task đến hạn hôm nay/);
  const team = await call('daily_brief', { scope: 'team' });
  assert.match(team.text, /^Bộ phận Sản phẩm, Tue, 10 Nov 2026: 2 việc quá hạn · 1 đến hạn hôm nay · 0 đang nghẽn\./);
  assert.match(team.text, /Nghỉ phép hôm nay: Vũ Hữu Trung \(sáng\)\./);
  assert.match(team.text, /Chưa có task đến hạn hôm nay: Anh Trần, Trung Tiêu\./, 'Tùng có việc tồn quá hạn nên không bị nhắc');
  assert.doesNotMatch(team.text, /Chưa có task đến hạn hôm nay:.*Trung Vũ/);
});

await test('list_projects, list_members và token gắn tài khoản lạ', async () => {
  const store = new MemoryStore();
  const { call } = await connect(store);
  const projects = await call('list_projects');
  assert.match(projects.text, /- Work Management System \(WMS\) \[WMS\] — Đang triển khai · PM: Trần Huy Anh · 3 việc mở \(1 quá hạn\)/);
  const members = await call('list_members');
  assert.match(members.text, /^Bạn đang dùng tài khoản: Đặng Tiến Ngọc \(@tienngoc\)\.\n5 nhân sự:/);
  const stranger = await connect(store, 'nguoila');
  const denied = await stranger.call('list_tasks');
  assert.equal(denied.isError, true);
  assert.match(denied.text, /không có trong danh sách nhân sự/);
});

await test('HTTP: 405 với GET, 503 khi thiếu cấu hình, 401 sai token, initialize + tools/list đúng token', async () => {
  const http = createServer((req, res) => void handler(req, res));
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/api/mcp`;
  const token = 'k'.repeat(40);
  const post = (target: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) });
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } };
  try {
    assert.equal((await fetch(url)).status, 405);

    delete process.env.WMS_MCP_TOKENS;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal((await post(url, init)).status, 503);

    process.env.WMS_MCP_TOKENS = `tienngoc:${token},yeu:ngan`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key-not-used';
    assert.equal((await post(url, init)).status, 401);
    assert.equal((await post(`${url}?token=sai`, init)).status, 401);
    assert.equal((await post(`${url}?token=ngan`, init)).status, 401, 'token quá ngắn bị loại khi nạp cấu hình');

    const viaQuery = await post(`${url}?token=${token}`, init);
    assert.equal(viaQuery.status, 200);
    const info = (await viaQuery.json()) as { result: { serverInfo: { name: string }; instructions: string } };
    assert.equal(info.result.serverInfo.name, 'vnexpress-wms');
    assert.match(info.result.instructions, /Quản lý công việc bộ phận Sản phẩm/);

    const viaHeader = await post(url, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { Authorization: `Bearer ${token}` });
    assert.equal(viaHeader.status, 200);
    const list = (await viaHeader.json()) as { result: { tools: { name: string; inputSchema: { properties: Record<string, unknown> } }[] } };
    assert.equal(list.result.tools.length, 8);
    assert.ok(list.result.tools.find((t) => t.name === 'add_task')!.inputSchema.properties.title);

    const notified = await post(`${url}?token=${token}`, { jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.equal(notified.status, 202);
  } finally {
    http.close();
  }
});

await test('Node ESM thuần (như Vercel) nạp được function: không còn import thiếu đuôi .js', async () => {
  // Vercel biên dịch từng file TS sang ESM và không tự thêm đuôi file. Mô phỏng đúng cách đó để bắt lỗi trước khi deploy.
  const out = 'node_modules/.cache/wms-mcp-esm-check';
  rmSync(out, { recursive: true, force: true });
  const graph = await build({ entryPoints: ['api/mcp.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false, metafile: true, logLevel: 'silent' });
  const files = Object.keys(graph.metafile.inputs);
  await build({ entryPoints: files, outdir: out, outbase: '.', format: 'esm', platform: 'node', logLevel: 'silent' });
  writeFileSync(`${out}/package.json`, '{"type":"module"}');
  const loaded = execFileSync(process.execPath, ['-e', `import('./${out}/api/mcp.js').then((m) => console.log(typeof m.default))`], { encoding: 'utf8' });
  assert.equal(loaded.trim(), 'function');
});

console.log(process.exitCode ? '\nCó kiểm thử thất bại.' : `\n${passed} kiểm thử đạt.`);
