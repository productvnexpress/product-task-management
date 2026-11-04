/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskItem } from '../types';
import { getDaysDifference, getTodayDateString, normalizeDateString } from './dateUtils';

export type TaskGroupMode = 'project' | 'due';

export type DueBucketKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export interface DueBucket {
  key: DueBucketKey;
  label: string;
  tasks: TaskItem[];
}

const BUCKET_LABELS: Record<DueBucketKey, string> = {
  overdue: 'Quá hạn',
  today: 'Hôm nay',
  tomorrow: 'Ngày mai',
  week: '7 ngày tới',
  later: 'Sau đó',
  none: 'Chưa có hạn',
};

const BUCKET_ORDER: DueBucketKey[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];

const STATUS_RANK: Record<string, number> = {
  'Bị nghẽn': 0,
  'Đang làm': 1,
  'Chưa làm': 2,
  'Hoàn thành': 3,
};

export function getDueBucket(task: TaskItem, todayStr = getTodayDateString()): DueBucketKey {
  const due = normalizeDateString(task.dueDate);
  if (!due) return 'none';
  const diff = getDaysDifference(due, todayStr);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'week';
  return 'later';
}

/**
 * Sắp xếp theo độ gấp: hạn sớm nhất trước (việc chưa có hạn xuống cuối),
 * cùng hạn thì Khẩn cấp trước, rồi Bị nghẽn > Đang làm > Chưa làm.
 */
export function compareTasksByUrgency(a: TaskItem, b: TaskItem): number {
  const dueA = normalizeDateString(a.dueDate);
  const dueB = normalizeDateString(b.dueDate);
  if (dueA !== dueB) {
    if (!dueA) return 1;
    if (!dueB) return -1;
    return dueA.localeCompare(dueB);
  }
  const urgentA = a.priority === 'Khẩn cấp' ? 0 : 1;
  const urgentB = b.priority === 'Khẩn cấp' ? 0 : 1;
  if (urgentA !== urgentB) return urgentA - urgentB;
  const statusDiff = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  if (statusDiff !== 0) return statusDiff;
  return (b.createdAt || '').localeCompare(a.createdAt || '');
}

export function sortTasksByUrgency(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort(compareTasksByUrgency);
}

export function groupTasksByDue(tasks: TaskItem[], todayStr = getTodayDateString()): DueBucket[] {
  const map = new Map<DueBucketKey, TaskItem[]>();
  for (const t of tasks) {
    const key = getDueBucket(t, todayStr);
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return BUCKET_ORDER.filter((k) => map.has(k)).map((key) => ({
    key,
    label: BUCKET_LABELS[key],
    tasks: sortTasksByUrgency(map.get(key)!),
  }));
}

/** Trả về ngày YYYY-MM-DD cách hôm nay `offset` ngày */
export function addDaysToToday(offset: number, ref: Date = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + offset);
  return getTodayDateString(d);
}

/** Thứ Hai kế tiếp (nếu hôm nay là thứ Hai thì lấy thứ Hai tuần sau) */
export function getNextMonday(ref: Date = new Date()): string {
  const day = ref.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  return addDaysToToday(diff, ref);
}
