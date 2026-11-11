/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bộ đọc cú pháp thêm việc nhanh (kiểu Todoist), ví dụ:
 *   "Chốt wireframe trang Thể thao @dat #WMS mai !"
 *   -> title: "Chốt wireframe trang Thể thao", người: Nguyễn Hải Đạt, dự án: WMS, hạn: ngày mai, khẩn cấp
 *
 * Hỗ trợ:
 *   @tên       người phụ trách (username, tên gọi, họ+tên không dấu)
 *   #mã/tên    dự án (mã VNE-XXX hoặc phần sau "VNE-", hoặc tên không dấu viết liền)
 *   !          khẩn cấp
 *   ~2h        ước lượng thời gian (~30p, ~1,5h, ~1d)
 *   Hạn ở cuối câu: hôm nay, mai, ngày mai, ngày kia, mốt, thứ 2..thứ 7, t2..t7, chủ nhật, cn, tuần sau
 *   Hạn ở bất kỳ đâu: dd/mm hoặc dd/mm/yyyy
 */

import { MemberItem, ProjectItem } from '../types';
import { getTodayDateString } from './dateUtils';
import { stripDiacritics } from './titleQuality';
import { parseEstimateToken } from './estimate';

export type QuickTokenType = 'assignee' | 'project' | 'date' | 'urgent' | 'estimate';

export interface QuickAddParseResult {
  title: string;
  assignee?: MemberItem;
  project?: ProjectItem;
  dueDate?: string;
  dueLabel?: string;
  isUrgent: boolean;
  /** Ước lượng thời gian (phút) từ token ~2h */
  estimateMinutes?: number;
  /** Các token đã nhận diện (để hiển thị chip xem trước) */
  matched: QuickTokenType[];
}

const key = (s: string) => stripDiacritics(s.toLowerCase()).replace(/[^a-z0-9]/g, '');

function addDays(ref: Date, n: number): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + n);
}

function nextWeekday(ref: Date, weekday: number): Date {
  // weekday: 0=CN..6=T7. Nếu trùng hôm nay thì lấy hôm nay.
  const diff = (weekday - ref.getDay() + 7) % 7;
  return addDays(ref, diff);
}

const WEEKDAY_LABEL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

interface DatePhrase {
  pattern: RegExp;
  resolve: (ref: Date) => { date: Date; label: string };
}

// Chỉ nhận diện ở CUỐI chuỗi để không ăn nhầm chữ trong tiêu đề
const TRAILING_DATE_PHRASES: DatePhrase[] = [
  { pattern: /\s(hôm nay|hom nay|today)$/i, resolve: (r) => ({ date: r, label: 'Hôm nay' }) },
  { pattern: /\s(ngày mai|ngay mai|tomorrow)$/i, resolve: (r) => ({ date: addDays(r, 1), label: 'Ngày mai' }) },
  // "mai" viết thường ở cuối (viết hoa "Mai" có thể là tên người)
  { pattern: /\s(mai)$/, resolve: (r) => ({ date: addDays(r, 1), label: 'Ngày mai' }) },
  { pattern: /\s(ngày kia|ngay kia|mốt|mot)$/i, resolve: (r) => ({ date: addDays(r, 2), label: 'Ngày kia' }) },
  {
    pattern: /\s(tuần sau|tuan sau)$/i,
    resolve: (r) => ({ date: nextWeekday(addDays(r, 1), 1), label: 'Thứ 2 tuần sau' }),
  },
  { pattern: /\s(chủ nhật|chu nhat|cn)$/i, resolve: (r) => ({ date: nextWeekday(r, 0), label: 'Chủ nhật' }) },
  {
    pattern: /\s(?:thứ|thu|t)\s?([2-7]|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay)$/i,
    resolve: (r) => ({ date: r, label: '' }), // xử lý riêng bên dưới
  },
];

const WORD_TO_WEEKDAY: Record<string, number> = {
  '2': 1, hai: 1, '3': 2, ba: 2, '4': 3, tu: 3, 'tư': 3, '5': 4, nam: 4, 'năm': 4,
  '6': 5, sau: 5, 'sáu': 5, '7': 6, bay: 6, 'bảy': 6,
};

export function matchMember(token: string, members: MemberItem[]): MemberItem | undefined {
  const k = key(token);
  if (!k) return undefined;
  const byUsername = members.find((m) => (m.username || '').toLowerCase() === k);
  if (byUsername) return byUsername;
  const byFullConcat = members.find((m) => key(m.name) === k);
  if (byFullConcat) return byFullConcat;
  const byFirstLast = members.find((m) => {
    const parts = m.name.trim().split(/\s+/);
    const first = parts[parts.length - 1];
    const last = parts[0];
    return key(first + last) === k || key(last + first) === k;
  });
  if (byFirstLast) return byFirstLast;
  const byFirst = members.filter((m) => {
    const parts = m.name.trim().split(/\s+/);
    return key(m.firstName || parts[parts.length - 1]) === k;
  });
  // Trùng tên gọi (VD: 2 người tên Trung) thì không tự chọn, để người dùng chọn từ gợi ý
  if (byFirst.length === 1) return byFirst[0];
  return undefined;
}

export function matchProject(token: string, projects: ProjectItem[]): ProjectItem | undefined {
  const k = key(token);
  if (!k) return undefined;
  const codeKey = (p: ProjectItem) => key(p.code || '');
  const shortCode = (p: ProjectItem) => key((p.code || '').replace(/^VNE-/i, ''));
  return (
    projects.find((p) => codeKey(p) === k || shortCode(p) === k) ||
    projects.find((p) => key(p.name) === k) ||
    projects.find((p) => shortCode(p).startsWith(k) && k.length >= 2) ||
    projects.find((p) => key(p.name).startsWith(k) && k.length >= 3)
  );
}

export function parseQuickAdd(
  input: string,
  ctx: { members: MemberItem[]; projects: ProjectItem[]; ref?: Date; disabled?: QuickTokenType[] }
): QuickAddParseResult {
  const ref = ctx.ref || new Date();
  const disabled = new Set(ctx.disabled || []);
  const matched: QuickTokenType[] = [];
  let assignee: MemberItem | undefined;
  let project: ProjectItem | undefined;
  let isUrgent = false;
  let dueDate: string | undefined;
  let dueLabel: string | undefined;
  let estimateMinutes: number | undefined;

  const kept: string[] = [];
  for (const raw of input.split(/\s+/).filter(Boolean)) {
    if (!disabled.has('assignee') && !assignee && /^@\S+/.test(raw)) {
      const m = matchMember(raw.slice(1), ctx.members);
      if (m) {
        assignee = m;
        matched.push('assignee');
        continue;
      }
    }
    if (!disabled.has('project') && !project && /^#\S+/.test(raw)) {
      const p = matchProject(raw.slice(1), ctx.projects);
      if (p) {
        project = p;
        matched.push('project');
        continue;
      }
    }
    if (!disabled.has('urgent') && /^!{1,3}$/.test(raw)) {
      if (!isUrgent) matched.push('urgent');
      isUrgent = true;
      continue;
    }
    if (!disabled.has('estimate') && estimateMinutes === undefined && raw.startsWith('~')) {
      const minutes = parseEstimateToken(raw);
      if (minutes !== undefined) {
        estimateMinutes = minutes;
        matched.push('estimate');
        continue;
      }
    }
    if (!disabled.has('date') && !dueDate) {
      const dm = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (dm) {
        const day = Number(dm[1]);
        const month = Number(dm[2]);
        let year = dm[3] ? Number(dm[3]) : ref.getFullYear();
        if (year < 100) year += 2000;
        const d = new Date(year, month - 1, day);
        if (d.getMonth() === month - 1 && d.getDate() === day) {
          if (!dm[3] && getTodayDateString(d) < getTodayDateString(ref)) d.setFullYear(year + 1);
          dueDate = getTodayDateString(d);
          dueLabel = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
          matched.push('date');
          continue;
        }
      }
    }
    kept.push(raw);
  }

  let title = kept.join(' ');

  if (!disabled.has('date') && !dueDate) {
    for (const phrase of TRAILING_DATE_PHRASES) {
      const m = (' ' + title).match(phrase.pattern);
      if (!m) continue;
      let date: Date;
      let label: string;
      if (phrase.pattern.source.includes('[2-7]')) {
        const wd = WORD_TO_WEEKDAY[m[1].toLowerCase()];
        if (wd === undefined) continue;
        date = nextWeekday(ref, wd);
        label = WEEKDAY_LABEL[wd];
      } else {
        ({ date, label } = phrase.resolve(ref));
      }
      // Không để tiêu đề rỗng chỉ vì từ khoá ngày
      const nextTitle = (' ' + title).slice(0, m.index).trim();
      if (!nextTitle) break;
      title = nextTitle;
      dueDate = getTodayDateString(date);
      dueLabel = label;
      matched.push('date');
      break;
    }
  }

  return { title: title.trim(), assignee, project, dueDate, dueLabel, isUrgent, estimateMinutes, matched };
}
