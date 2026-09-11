/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MemberGroup = 'Product' | 'Stakeholder';

export type TeamType = 'Product Manager' | 'UX/UI Designer' | 'SEO' | 'Data' | 'Stakeholder';

export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Bị nghẽn' | 'Hoàn thành';

export type PriorityLevel = 'Khẩn cấp' | 'Ưu tiên cao' | 'Bình thường';

export type ActiveTab = 'tasks' | 'projects' | 'members' | 'trash' | 'settings';

export type PhaseStatus = 'Chưa bắt đầu' | 'Đang triển khai' | 'Bị nghẽn' | 'Đã hoàn thành';

export interface ProjectPhase {
  id: string;
  name: string;        // Tên giai đoạn (ví dụ: Phase 1: Nghiên cứu & PRD)
  dueDate: string;     // Thời hạn (YYYY-MM-DD)
  status: PhaseStatus; // Trạng thái
  description: string; // Mô tả giai đoạn
}

export interface ProjectRoles {
  pm?: string[];       // Danh sách Product Manager phụ trách
  designer?: string[]; // Danh sách Designer phụ trách
  seo?: string[];      // Danh sách SEO phụ trách
  data?: string[];     // Danh sách Data Specialist phụ trách
}

export interface ProjectCustomLink {
  id: string;
  title: string;       // Tiêu đề liên kết
  url: string;         // Đường dẫn liên kết
}

export interface ProjectNoteItem {
  id: string;
  author: string;      // Người ghi chú
  content: string;     // Nội dung ghi chú
  createdAt: string;   // Thời gian ghi chú (ISO string)
}

export interface ProjectLinks {
  orderTech?: string;   // Link Order Tech
  chat?: string;        // Link Chat Group
  dashboard?: string;   // Link Dashboard
  report?: string;      // Link Report
  beta?: string;        // Link Beta
  production?: string;  // Link Production
  custom?: ProjectCustomLink[]; // Các liên kết tự thêm theo nhu cầu
}

export type ProjectStatus = 'Chưa triển khai' | 'Đang triển khai' | 'Tạm dừng' | 'Hoàn thành';

export interface ProjectItem {
  id: string;
  name: string;
  code: string;
  description: string;
  objective?: string;         // Mục tiêu dự án
  productOwner?: string;      // Product Owner (Nội dung/Kinh doanh chịu trách nhiệm trực tiếp KPI)
  startDate?: string;         // Thời gian bắt đầu (YYYY-MM-DD)
  targetDate: string;         // Thời gian hoàn thành (YYYY-MM-DD)
  leadName?: string;
  roles?: ProjectRoles;
  phases?: ProjectPhase[];
  isStrategic?: boolean;      // Dự án chiến lược (Cấp Toà soạn / Công ty, ưu tiên triển khai)
  status: ProjectStatus;
  createdAt?: string;         // Thời điểm tạo dự án (ISO timestamp)
  links?: ProjectLinks;
  linkOrderTech?: string;            // Link Order Tech (chuẩn AGENTS.md)
  linkChat?: string;                 // Link Chat Group (chuẩn AGENTS.md)
  linkDashboard?: string;            // Link Dashboard (chuẩn AGENTS.md)
  linkReport?: string;               // Link Report (chuẩn AGENTS.md)
  linkBeta?: string;                 // Link Beta (chuẩn AGENTS.md)
  linkProduction?: string;           // Link Production (chuẩn AGENTS.md)
  customLinks?: ProjectCustomLink[]; // Liên kết tự thêm
  notes?: ProjectNoteItem[];         // Ghi chú dự án (Người ghi chú, Nội dung, Thời gian)
  history?: ProjectHistoryLog[];     // Lịch sử điều chỉnh chi tiết của dự án
  checklist?: ProjectChecklistItem[]; // Checklist 34 tiêu chuẩn Product Management (5 giai đoạn)
  createdBy?: string;                // Người tạo dự án (phục vụ phân quyền RBAC)
}

export type ProjectChecklistStatus = 'pending' | 'completed' | 'skipped';

export interface ProjectChecklistItem {
  id: string;
  phaseId: number;        // 1 đến 5
  phaseTitle: string;     // Tiêu đề giai đoạn
  text: string;           // Nội dung tiêu chuẩn
  status: ProjectChecklistStatus; // 'pending' | 'completed' | 'skipped'
  completedAt?: string;   // Thời điểm cập nhật
  completedBy?: string;   // Tên người thao tác
  note?: string;          // Ghi chú bổ sung
}

export interface ProjectHistoryChange {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface ProjectHistoryLog {
  id: string;
  timestamp: string;
  author: string;
  action: string;
  changes: ProjectHistoryChange[];
  note?: string;
}

export interface MemberItem {
  id: string;
  name: string;
  salutation?: string; // Danh xưng: 'Anh' | 'Chị'
  lastName?: string;
  firstName?: string;
  username?: string;
  region?: string;
  department?: string;
  group?: MemberGroup;
  team: TeamType;
  title: string;
  ipPhone?: string;
  email: string;
  gmail?: string;
  joinDate?: string;
  status: 'Sẵn sàng' | 'Đang bận' | 'Vắng mặt';
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskLogChange {
  field: string;       // Tên trường bị thay đổi (Trạng thái, Phụ trách, Hạn hoàn thành, Link,...)
  oldValue?: string;   // Giá trị cũ
  newValue?: string;   // Giá trị mới
}

export interface TaskLogItem {
  id: string;
  timestamp: string;   // Thời gian thực hiện (ISO string hoặc ngày giờ hiển thị)
  author: string;      // Người thực hiện thay đổi (Ai thay?)
  action: string;      // Tóm tắt hành động (Cập nhật trạng thái, Đổi người phụ trách, v.v.)
  changes: TaskLogChange[]; // Chi tiết từng thay đổi (Thay nội dung gì?)
  note?: string;       // Ghi chú / lý do bổ sung (nếu có)
}

export interface TaskItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  phaseId?: string;
  phaseName?: string;
  team: TeamType;
  assignee: string;
  productOwners?: string[]; // Danh sách Product Owners (Stakeholders) đại diện bài toán sản phẩm
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  details?: string;
  subtasks?: SubTask[];
  blockerReason?: string;
  workLink?: string;
  resultLink?: string;
  progress?: number;
  logs?: TaskLogItem[];
  completedAt?: string; // Thời điểm đánh dấu hoàn thành (ISO string)
  latestUpdateNote?: string;
  createdBy?: string; // Người tạo công việc (phục vụ phân quyền RBAC)
}

export type TaskPersonalScope = 'my_tasks' | 'my_projects_tasks' | 'all';

export type DueFilterType = 'all' | 'today' | 'overdue' | 'soon';

export interface FilterState {
  projectId: string; // 'all' or projectId
  team: 'Tất cả' | TeamType;
  status: 'Tất cả' | TaskStatus;
  assignee: string; // 'Tất cả' or member name
  dueFilter: DueFilterType;
  searchQuery: string;
}

export type TrashItemType = 'task' | 'project' | 'member';

export interface TrashItem {
  id: string;
  originalId: string;
  type: TrashItemType;
  title: string;
  subtitle?: string;
  deletedAt: string; // ISO string
  deletedBy?: string;
  data: TaskItem | ProjectItem | MemberItem;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_created'
  | 'task_completed'
  | 'task_blocked'
  | 'task_updated';

export interface NotificationItem {
  id: string;
  recipientName: string;      // Tên nhân sự nhận thông báo (ví dụ: 'Trần Huy Anh', 'Đặng Tiến Ngọc')
  recipientId?: string;
  actorName: string;          // Tên người thực hiện hành động
  projectId?: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;          // ISO string
}

export interface WorkingScheduleConfig {
  workDays: number[];         // 1: T2, 2: T3, 3: T4, 4: T5, 5: T6 (T7: 6, CN: 0)
  startTime: string;          // '08:00'
  endTime: string;            // '17:30'
  lunchBreakStart: string;    // '12:00'
  lunchBreakEnd: string;      // '13:30'
  note?: string;
}

export interface HolidayItem {
  id: string;
  name: string;               // Tên ngày lễ (Tết Dương Lịch, Giỗ tổ Hùng Vương...)
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  daysCount: number;          // Số ngày nghỉ
  isRecurringYearly?: boolean;
}

export interface CompensatoryWorkdayItem {
  id: string;
  name: string;               // Lý do làm bù (Làm bù cho ngày 29/04...)
  date: string;               // YYYY-MM-DD
  note?: string;
}

export type LeaveSession = 'all_day' | 'morning' | 'afternoon';

export interface MemberLeaveItem {
  id: string;
  memberId?: string;
  memberName: string;         // Tên nhân sự xin nghỉ
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  session?: LeaveSession;     // 'all_day' (mặc định) | 'morning' (nửa buổi sáng = 0.5) | 'afternoon' (nửa buổi chiều = 0.5)
  daysCount: number;          // Số ngày nghỉ (ví dụ: 0.5, 1, 1.5, 2...)
  reason: string;             // Lý do nghỉ (Phép năm, Việc riêng, Nghỉ ốm...)
  status: 'Đã duyệt' | 'Chờ duyệt';
  createdAt: string;
}



