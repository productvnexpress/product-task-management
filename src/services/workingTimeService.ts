/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkingScheduleConfig,
  HolidayItem,
  CompensatoryWorkdayItem,
  MemberLeaveItem,
  LeaveSession,
} from '../types';
import { formatDateWithEnDay } from '../utils/formatters';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  SCHEDULE: 'wms_working_schedule_config',
  HOLIDAYS: 'wms_working_holidays',
  COMPENSATORY: 'wms_compensatory_workdays',
  LEAVES: 'wms_member_leaves',
};

// 1. Lịch làm việc tiêu chuẩn: Thứ 2 - Thứ 6, 8:00 - 17:30
export const DEFAULT_WORKING_SCHEDULE: WorkingScheduleConfig = {
  workDays: [1, 2, 3, 4, 5], // 1: Thứ Hai -> 5: Thứ Sáu
  startTime: '08:00',
  endTime: '17:30',
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:30',
  note: 'Thứ Hai đến hết thứ Sáu (8:00 - 17:30), nghỉ thứ Bảy và Chủ nhật.',
};

// 2. Danh mục ngày lễ mẫu chuẩn Việt Nam năm 2026
export const DEFAULT_HOLIDAYS_2026: HolidayItem[] = [
  {
    id: 'hol-1',
    name: 'Tết Dương Lịch 2026',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    daysCount: 1,
    isRecurringYearly: true,
  },
  {
    id: 'hol-2',
    name: 'Tết Nguyên Đán Bính Ngọ 2026',
    startDate: '2026-02-14',
    endDate: '2026-02-22',
    daysCount: 9,
    isRecurringYearly: false,
  },
  {
    id: 'hol-3',
    name: 'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
    startDate: '2026-04-26',
    endDate: '2026-04-26',
    daysCount: 1,
    isRecurringYearly: false,
  },
  {
    id: 'hol-4',
    name: 'Ngày Chiến Thắng 30/4 & Quốc Tế Lao Động 1/5',
    startDate: '2026-04-30',
    endDate: '2026-05-03',
    daysCount: 4,
    isRecurringYearly: true,
  },
  {
    id: 'hol-5',
    name: 'Quốc Khánh 2/9',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    daysCount: 2,
    isRecurringYearly: true,
  },
];

/**
 * Phân tích chuỗi ngày dạng DD/MM/YYYY hoặc YYYY-MM-DD thành Date an toàn tại 00:00:00
 */
export function parseDateFlexible(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Dạng DD/MM/YYYY (ví dụ: '17/02/2014')
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  // Dạng ISO YYYY-MM-DD (ví dụ: '2026-09-11')
  if (trimmed.includes('-')) {
    const parts = trimmed.slice(0, 10).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Định dạng số ngày công hiển thị: 21 -> "21", 21.5 -> "21,5"
 */
export function formatWorkingDaysCount(count: number): string {
  if (count % 1 === 0) {
    return count.toLocaleString('vi-VN');
  }
  return count.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Service quản lý Lịch làm việc, Ngày lễ, Làm bù và Nghỉ phép
 */
export const workingTimeService = {
  // --- 0. KHỞI TẠO & ĐỒNG BỘ DỮ LIỆU TỪ SUPABASE ---
  async initFromSupabase(): Promise<void> {
    try {
      const [schedRes, holRes, compRes, leaveRes] = await Promise.all([
        supabase.from('working_schedule_config').select('*').limit(1),
        supabase.from('system_holidays').select('*').order('start_date', { ascending: true }),
        supabase.from('compensatory_workdays').select('*').order('date', { ascending: true }),
        supabase.from('member_leaves').select('*').order('created_at', { ascending: false }),
      ]);

      if (!schedRes.error && schedRes.data) {
        if (schedRes.data.length > 0) {
          const row = schedRes.data[0];
          const cfg: WorkingScheduleConfig = {
            workDays: row.work_days || [1, 2, 3, 4, 5],
            startTime: row.start_time || '08:00',
            endTime: row.end_time || '17:30',
            lunchBreakStart: row.lunch_break_start || '12:00',
            lunchBreakEnd: row.lunch_break_end || '13:30',
            note: row.note || '',
          };
          this.saveSchedule(cfg, false);
        } else {
          // Bảng trống: Đồng bộ lịch hiện tại lên Supabase
          this.saveSchedule(this.getSchedule(), true);
        }
      }

      if (!holRes.error && holRes.data) {
        if (holRes.data.length > 0) {
          const hols: HolidayItem[] = holRes.data.map((h: any) => ({
            id: h.id,
            name: h.name,
            startDate: h.start_date,
            endDate: h.end_date,
            daysCount: h.days_count,
            isRecurringYearly: h.is_recurring,
          }));
          this.saveHolidays(hols, false);
        } else {
          // Chưa có ngày lễ nào trên database, tự động seed danh mục mẫu 2026
          this.seedDefaultHolidaysToSupabase();
        }
      }

      if (!compRes.error && compRes.data) {
        if (compRes.data.length > 0) {
          const comps: CompensatoryWorkdayItem[] = compRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            date: c.date,
            note: c.note || undefined,
          }));
          this.saveCompensatoryWorkdays(comps, false);
        } else {
          const localComps = this.getCompensatoryWorkdays();
          if (localComps.length > 0) {
            for (const c of localComps) {
              this.syncCompensatoryToSupabase(c);
            }
          }
        }
      }

      if (!leaveRes.error && leaveRes.data) {
        if (leaveRes.data.length > 0) {
          const leaves: MemberLeaveItem[] = leaveRes.data.map((l: any) => ({
            id: l.id,
            memberId: l.member_id || undefined,
            memberName: l.member_name,
            startDate: l.start_date,
            endDate: l.end_date,
            session: (l.session as LeaveSession) || 'all_day',
            daysCount: parseFloat(l.days_count) || 1.0,
            reason: l.reason || 'Nghỉ phép năm',
            status: l.status || 'Đã duyệt',
            createdAt: l.created_at,
          }));
          this.saveMemberLeaves(leaves, false);
        } else {
          // Bảng trống trên DB: Đồng bộ các đơn nghỉ phép từ local lên Supabase
          const localLeaves = this.getMemberLeaves();
          if (localLeaves.length > 0) {
            for (const l of localLeaves) {
              this.syncLeaveToSupabase(l);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[workingTimeService] Supabase sync error:', e);
    }
  },

  async seedDefaultHolidaysToSupabase(): Promise<void> {
    try {
      const rows = DEFAULT_HOLIDAYS_2026.map((h) => ({
        id: h.id,
        name: h.name,
        start_date: h.startDate,
        end_date: h.endDate,
        days_count: h.daysCount,
        is_recurring: h.isRecurringYearly ?? false,
      }));
      await supabase.from('system_holidays').upsert(rows);
    } catch (e) {
      console.warn('Cannot seed default holidays to Supabase:', e);
    }
  },

  // --- 1. LỊCH LÀM VIỆC ---
  getSchedule(): WorkingScheduleConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_WORKING_SCHEDULE;
  },

  saveSchedule(config: WorkingScheduleConfig, syncToSupabase: boolean = true): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(config));
    } catch (e) {
      console.warn('Cannot save working schedule:', e);
    }
    if (syncToSupabase) {
      supabase
        .from('working_schedule_config')
        .upsert({
          id: 'default',
          work_days: config.workDays,
          start_time: config.startTime,
          end_time: config.endTime,
          lunch_break_start: config.lunchBreakStart,
          lunch_break_end: config.lunchBreakEnd,
          note: config.note,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) {
            console.error('[workingTimeService] Lỗi ghi working_schedule_config vào Supabase (kiểm tra RLS):', error);
          }
        });
    }
  },

  // --- 2. NGÀY LỄ ---
  getHolidays(): HolidayItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_HOLIDAYS_2026;
  },

  saveHolidays(holidays: HolidayItem[], syncToSupabase: boolean = true): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
    } catch (e) {
      console.warn('Cannot save holidays:', e);
    }
  },

  addHoliday(item: Omit<HolidayItem, 'id'>): HolidayItem {
    const holidays = this.getHolidays();
    const newHol: HolidayItem = {
      ...item,
      id: 'hol-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    const updated = [...holidays, newHol].sort((a, b) => a.startDate.localeCompare(b.startDate));
    this.saveHolidays(updated, false);
    supabase
      .from('system_holidays')
      .upsert({
        id: newHol.id,
        name: newHol.name,
        start_date: newHol.startDate,
        end_date: newHol.endDate,
        days_count: newHol.daysCount,
        is_recurring: newHol.isRecurringYearly ?? false,
      })
      .then(({ error }) => {
        if (error) console.error('[workingTimeService] Lỗi ghi system_holidays vào Supabase (kiểm tra RLS):', error);
      });
    return newHol;
  },

  updateHoliday(item: HolidayItem): void {
    const holidays = this.getHolidays();
    const updated = holidays
      .map((h) => (h.id === item.id ? item : h))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    this.saveHolidays(updated, false);
    supabase
      .from('system_holidays')
      .upsert({
        id: item.id,
        name: item.name,
        start_date: item.startDate,
        end_date: item.endDate,
        days_count: item.daysCount,
        is_recurring: item.isRecurringYearly ?? false,
      })
      .then(({ error }) => {
        if (error) console.error('[workingTimeService] Lỗi cập nhật system_holidays vào Supabase (kiểm tra RLS):', error);
      });
  },

  deleteHoliday(id: string): void {
    const holidays = this.getHolidays();
    const updated = holidays.filter((h) => h.id !== id);
    this.saveHolidays(updated, false);
    supabase
      .from('system_holidays')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[workingTimeService] Lỗi xóa system_holidays trên Supabase (kiểm tra RLS):', error);
      });
  },

  resetHolidaysToDefault(): HolidayItem[] {
    this.saveHolidays(DEFAULT_HOLIDAYS_2026, false);
    this.seedDefaultHolidaysToSupabase();
    return DEFAULT_HOLIDAYS_2026;
  },

  /**
   * Lấy danh sách ngày nghỉ lễ sắp tới trong vòng N ngày (mặc định 5 ngày)
   */
  getUpcomingHolidays(withinDays: number = 5, fromDateStr?: string): HolidayItem[] {
    const baseDate = parseDateFlexible(fromDateStr) || new Date();
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const baseIso = `${y}-${m}-${d}`;

    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + withinDays);
    const ty = targetDate.getFullYear();
    const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const td = String(targetDate.getDate()).padStart(2, '0');
    const targetIso = `${ty}-${tm}-${td}`;

    const holidays = this.getHolidays();
    return holidays.filter((h) => {
      // Đang diễn ra hoặc bắt đầu trong vòng N ngày tới
      return h.endDate >= baseIso && h.startDate <= targetIso;
    });
  },

  // --- 3. NGÀY LÀM BÙ (COMPENSATORY WORKDAYS) ---
  getCompensatoryWorkdays(): CompensatoryWorkdayItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPENSATORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  },

  saveCompensatoryWorkdays(items: CompensatoryWorkdayItem[], syncToSupabase: boolean = true): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPENSATORY, JSON.stringify(items));
    } catch (e) {
      console.warn('Cannot save compensatory workdays:', e);
    }
  },

  async syncCompensatoryToSupabase(item: CompensatoryWorkdayItem): Promise<void> {
    try {
      const { error } = await supabase.from('compensatory_workdays').upsert({
        id: item.id,
        name: item.name,
        date: item.date,
        note: item.note ?? null,
      });
      if (error) console.error('[workingTimeService] Lỗi ghi compensatory_workdays:', error);
    } catch (e) {
      console.warn('Cannot sync compensatory workday to Supabase:', e);
    }
  },

  addCompensatoryWorkday(item: Omit<CompensatoryWorkdayItem, 'id'>): CompensatoryWorkdayItem {
    const current = this.getCompensatoryWorkdays();
    const newItem: CompensatoryWorkdayItem = {
      ...item,
      id: 'comp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    const updated = [...current, newItem].sort((a, b) => a.date.localeCompare(b.date));
    this.saveCompensatoryWorkdays(updated, false);
    this.syncCompensatoryToSupabase(newItem);
    return newItem;
  },

  updateCompensatoryWorkday(item: CompensatoryWorkdayItem): void {
    const current = this.getCompensatoryWorkdays();
    const updated = current
      .map((c) => (c.id === item.id ? item : c))
      .sort((a, b) => a.date.localeCompare(b.date));
    this.saveCompensatoryWorkdays(updated, false);
    this.syncCompensatoryToSupabase(item);
  },

  deleteCompensatoryWorkday(id: string): void {
    const current = this.getCompensatoryWorkdays();
    const updated = current.filter((c) => c.id !== id);
    this.saveCompensatoryWorkdays(updated, false);
    supabase
      .from('compensatory_workdays')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[workingTimeService] Lỗi xóa compensatory_workdays trên Supabase (kiểm tra RLS):', error);
      });
  },

  // --- 4. NGHỈ PHÉP NHÂN SỰ ---
  getMemberLeaves(): MemberLeaveItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEAVES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  },

  saveMemberLeaves(leaves: MemberLeaveItem[], syncToSupabase: boolean = true): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));
    } catch (e) {
      console.warn('Cannot save member leaves:', e);
    }
  },

  async syncLeaveToSupabase(item: MemberLeaveItem): Promise<void> {
    const payloadWithSession: any = {
      id: item.id,
      member_id: item.memberId ?? null,
      member_name: item.memberName,
      start_date: item.startDate,
      end_date: item.endDate,
      session: item.session || 'all_day',
      days_count: item.daysCount,
      reason: item.reason ?? 'Nghỉ phép năm',
      status: item.status ?? 'Đã duyệt',
      created_at: item.createdAt || new Date().toISOString(),
    };

    try {
      let { error } = await supabase.from('member_leaves').upsert(payloadWithSession);
      if (error) {
        // Fallback 1: Nếu database Supabase chưa có cột session (PGRST204)
        if (error.code === 'PGRST204' || error.message?.includes('session')) {
          const { session, ...payloadWithoutSession } = payloadWithSession;
          let retry = await supabase.from('member_leaves').upsert(payloadWithoutSession);
          if (retry.error && (retry.error.code === '22P02' || retry.error.message?.includes('integer'))) {
            // Fallback 2: Nếu cột days_count bị tạo nhầm kiểu INTEGER thay vì NUMERIC
            payloadWithoutSession.days_count = Math.max(1, Math.round(payloadWithoutSession.days_count));
            retry = await supabase.from('member_leaves').upsert(payloadWithoutSession);
          }
          if (retry.error) {
            console.error('[workingTimeService] Lỗi ghi member_leaves (fallback):', retry.error);
          } else {
            console.log('[workingTimeService] ✅ Đã lưu member_leaves vào Supabase (fallback tương thích).');
          }
        } else if (error.code === '22P02' || error.message?.includes('integer')) {
          // Fallback khi cột days_count bị tạo kiểu INTEGER
          payloadWithSession.days_count = Math.max(1, Math.round(payloadWithSession.days_count));
          const retry = await supabase.from('member_leaves').upsert(payloadWithSession);
          if (retry.error) {
            console.error('[workingTimeService] Lỗi ghi member_leaves:', retry.error);
          } else {
            console.log('[workingTimeService] ✅ Đã lưu member_leaves vào Supabase (làm tròn số ngày công).');
          }
        } else {
          console.error('[workingTimeService] Lỗi ghi member_leaves vào Supabase:', error);
        }
      } else {
        console.log('[workingTimeService] ✅ Đã lưu member_leaves vào Supabase.');
      }
    } catch (e) {
      console.warn('Cannot sync leave to Supabase:', e);
    }
  },

  addMemberLeave(item: Omit<MemberLeaveItem, 'id' | 'createdAt'>): MemberLeaveItem {
    const leaves = this.getMemberLeaves();
    const newLeave: MemberLeaveItem = {
      ...item,
      session: item.session || 'all_day',
      id: 'leave-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    const updated = [newLeave, ...leaves];
    this.saveMemberLeaves(updated, false);
    this.syncLeaveToSupabase(newLeave);
    return newLeave;
  },

  updateMemberLeave(item: MemberLeaveItem): void {
    const leaves = this.getMemberLeaves();
    const updated = leaves.map((l) => (l.id === item.id ? item : l));
    this.saveMemberLeaves(updated, false);
    this.syncLeaveToSupabase(item);
  },

  deleteMemberLeave(id: string): void {
    const leaves = this.getMemberLeaves();
    const updated = leaves.filter((l) => l.id !== id);
    this.saveMemberLeaves(updated, false);
    supabase
      .from('member_leaves')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[workingTimeService] Lỗi xóa member_leaves trên Supabase (kiểm tra RLS):', error);
      });
  },

  // --- 5. TÍNH TOÁN NGÀY CÔNG & TIẾN ĐỘ ---

  /**
   * Tính trọng số làm việc của 1 ngày (0, 0.5 hoặc 1.0):
   * 1.0: Làm việc cả ngày
   * 0.5: Làm việc nửa ngày (do nghỉ sáng hoặc nghỉ chiều)
   * 0.0: Ngày nghỉ (cuối tuần, ngày lễ hoặc nghỉ trọn ngày)
   */
  getWorkingDayWeight(dateInput: Date | string, memberName?: string): number {
    const date = parseDateFlexible(dateInput);
    if (!date) return 0;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    let baseWeight = 0;

    // 1. Kiểm tra ngày làm bù
    const compensatoryList = this.getCompensatoryWorkdays();
    const isCompensatory = compensatoryList.some((c) => c.date === isoDate);

    if (isCompensatory) {
      // Làm bù -> Tính là ngày làm việc (kể cả Thứ 7 hoặc Chủ Nhật)
      baseWeight = 1.0;
    } else {
      // 2. Kiểm tra ngày lễ
      const holidays = this.getHolidays();
      const isHoliday = holidays.some((h) => isoDate >= h.startDate && isoDate <= h.endDate);
      if (isHoliday) {
        return 0;
      }

      // 3. Kiểm tra ngày trong tuần theo lịch làm việc
      const schedule = this.getSchedule();
      const dayOfWeek = date.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
      if (!schedule.workDays.includes(dayOfWeek)) {
        return 0; // Cuối tuần không làm bù -> 0
      }

      // Thứ 2 đến Thứ 6 ngày thường
      baseWeight = 1.0;
    }

    // 4. Kiểm tra nghỉ phép của nhân sự (nếu có memberName)
    if (memberName && baseWeight > 0) {
      const cleanMemberName = memberName.trim().toLowerCase();
      const leaves = this.getMemberLeaves();
      const memberLeave = leaves.find(
        (l) =>
          l.status === 'Đã duyệt' &&
          l.memberName.trim().toLowerCase() === cleanMemberName &&
          isoDate >= l.startDate &&
          isoDate <= l.endDate
      );

      if (memberLeave) {
        if (memberLeave.session === 'morning' || memberLeave.session === 'afternoon') {
          // Nghỉ nửa buổi sáng hoặc chiều -> Ngày đó còn 0.5 ngày làm việc
          return Math.max(0, baseWeight - 0.5);
        }
        // Nghỉ cả ngày
        return 0;
      }
    }

    return baseWeight;
  },

  /**
   * Kiểm tra ngày đó có phát sinh làm việc hay không (weight > 0)
   */
  isWorkingDay(dateInput: Date | string, memberName?: string): boolean {
    return this.getWorkingDayWeight(dateInput, memberName) > 0;
  },

  /**
   * Tính chính xác tổng số ngày làm việc thực tế giữa 2 mốc thời gian
   * (Đã tính cả ngày làm bù, trừ ngày lễ và ngày nghỉ cả ngày hoặc nửa ngày)
   */
  countWorkingDays(
    startInput: Date | string,
    endInput: Date | string,
    memberName?: string
  ): number {
    const startDate = parseDateFlexible(startInput);
    const endDate = parseDateFlexible(endInput);
    if (!startDate || !endDate) return 0;

    let from = startDate;
    let to = endDate;
    let isReverse = false;

    if (from.getTime() > to.getTime()) {
      from = endDate;
      to = startDate;
      isReverse = true;
    }

    let workingCount = 0;
    const current = new Date(from);

    while (current.getTime() <= to.getTime()) {
      workingCount += this.getWorkingDayWeight(current, memberName);
      current.setDate(current.getDate() + 1);
    }

    return isReverse ? -workingCount : workingCount;
  },

  /**
   * Tính số ngày nhân sự đã làm việc từ ngày vào làm (joinDate) đến hiện tại
   */
  calculateDaysWorked(
    joinDateStr?: string,
    memberName?: string,
    referenceDateInput?: Date | string
  ): {
    isValid: boolean;
    formattedDate: string;
    workingDays: number;
    calendarDays: number;
    formattedWorkingDays: string;
  } {
    if (!joinDateStr) {
      return {
        isValid: false,
        formattedDate: '',
        workingDays: 0,
        calendarDays: 0,
        formattedWorkingDays: '0',
      };
    }

    const joinDate = parseDateFlexible(joinDateStr);
    if (!joinDate) {
      return {
        isValid: false,
        formattedDate: joinDateStr,
        workingDays: 0,
        calendarDays: 0,
        formattedWorkingDays: '0',
      };
    }

    const refDate = parseDateFlexible(referenceDateInput) || new Date();
    const formattedDate = formatDateWithEnDay(joinDate);

    // Tổng số ngày dương lịch
    const msPerDay = 1000 * 60 * 60 * 24;
    const calendarDays = Math.max(0, Math.round((refDate.getTime() - joinDate.getTime()) / msPerDay));

    // Tổng số ngày làm việc thực tế
    const workingDays = Math.max(0, this.countWorkingDays(joinDate, refDate, memberName));

    return {
      isValid: true,
      formattedDate,
      workingDays,
      calendarDays,
      formattedWorkingDays: formatWorkingDaysCount(workingDays),
    };
  },

  /**
   * Lấy danh sách N ngày làm việc tiếp theo kể từ một ngày mốc (mặc định là hôm nay).
   * Không tính thứ Bảy, Chủ Nhật (trừ khi làm bù) và ngày lễ.
   */
  getNextWorkingDays(count: number = 3, fromDateInput?: Date | string): string[] {
    const fromDate = parseDateFlexible(fromDateInput) || new Date();
    const result: string[] = [];
    const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

    let safeLoop = 0;
    while (result.length < count && safeLoop < 30) {
      cur.setDate(cur.getDate() + 1);
      safeLoop++;
      // Kiểm tra ngày làm việc chung theo lịch và ngày lễ / làm bù
      if (this.isWorkingDay(cur)) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        result.push(`${y}-${m}-${d}`);
      }
    }
    return result;
  },

  /**
   * Lấy danh sách nhân sự nghỉ phép đã duyệt cho một ngày cụ thể
   */
  getLeavesForDate(dateInput: Date | string, filterMemberNames?: string[]): MemberLeaveItem[] {
    const date = parseDateFlexible(dateInput);
    if (!date) return [];
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    const leaves = this.getMemberLeaves().filter((l) => l.status === 'Đã duyệt');
    const memberSet = filterMemberNames
      ? new Set(filterMemberNames.map((n) => n.trim().toLowerCase()))
      : null;

    return leaves.filter((l) => {
      if (memberSet && !memberSet.has(l.memberName.trim().toLowerCase())) return false;
      return isoDate >= l.startDate && isoDate <= l.endDate;
    });
  },
};

