/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gọi `/api/suggest` để lấy gợi ý việc tiếp theo (Claude Haiku chạy phía máy chủ).
 * Gợi ý là phần phụ: mọi lỗi đều im lặng, không cản thao tác chính của người dùng.
 */

import { MemberItem, TaskItem } from '../types';
import { getStoredCredentials } from '../utils/authService';

export interface NextSuggestion {
  title: string;
  reason: string;
  assignee: string;
  dueDate: string;
  estimateMinutes: number;
}

export interface SuggestResult {
  logId: string;
  suggestions: NextSuggestion[];
}

export type SuggestTrigger = 'created' | 'completed';

const ENDPOINT = '/api/suggest';

/** Máy chủ chưa cấu hình (thiếu khoá, thiếu bảng, không có function): ngừng gọi tới hết phiên. */
let unavailable = false;

const OFF_KEY = 'wms_next_suggest_off_date';
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Người dùng tắt gợi ý tới hết hôm nay: không gọi máy chủ nữa. */
export function isSuggestOffToday(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === localDay();
  } catch {
    return false;
  }
}

export function turnSuggestOffToday(): void {
  try {
    localStorage.setItem(OFF_KEY, localDay());
  } catch {
    // Không lưu được thì chỉ tắt tới khi tải lại trang.
  }
}

/** Chỉ việc gắn dự án thật mới có dữ liệu để gợi ý: việc ở Others hoặc nằm thẳng trong thư mục thì không gọi. */
export function canSuggestFor(task: Pick<TaskItem, 'projectId' | 'isRecurring'>): boolean {
  const projectId = task.projectId || '';
  return Boolean(projectId) && projectId !== 'proj-others' && !projectId.startsWith('folder:') && !task.isRecurring;
}

function credentialsOf(user: MemberItem | null | undefined): { username: string; credential: string } | null {
  const username = (user?.username || '').trim().toLowerCase();
  if (!username) return null;
  const credential = getStoredCredentials()[username]?.hash;
  return credential ? { username, credential } : null;
}

async function post(body: unknown, signal?: AbortSignal): Promise<Response | null> {
  try {
    return await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    return null;
  }
}

export async function fetchNextSuggestions(
  user: MemberItem | null | undefined,
  trigger: SuggestTrigger,
  task: Pick<TaskItem, 'id' | 'title' | 'assignee' | 'projectId' | 'isRecurring'>
): Promise<SuggestResult | null> {
  if (unavailable || isSuggestOffToday() || !canSuggestFor(task)) return null;
  const auth = credentialsOf(user);
  if (!auth) return null;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 25_000);
  const res = await post(
    {
      action: 'suggest',
      ...auth,
      trigger,
      task: { id: task.id, title: task.title, assignee: task.assignee, projectId: task.projectId || null },
    },
    controller.signal
  );
  window.clearTimeout(timer);

  if (!res) return null;
  // 429 = hết lượt hôm nay: cũng ngừng gọi tới hết phiên, không thử lại từng thao tác.
  if (res.status === 404 || res.status === 405 || res.status === 503 || res.status === 429) {
    unavailable = true;
    return null;
  }
  if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null;
  try {
    const data = (await res.json()) as SuggestResult;
    return Array.isArray(data.suggestions) && data.suggestions.length ? data : null;
  } catch {
    return null;
  }
}

/** Báo gợi ý đã được dùng, để đo tỷ lệ chấp nhận. */
export function reportSuggestionAccepted(user: MemberItem | null | undefined, logId: string, title: string): void {
  const auth = credentialsOf(user);
  if (!auth || unavailable) return;
  void post({ action: 'accept', ...auth, logId, title });
}
