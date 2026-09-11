/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { MemberItem, MemberLeaveItem, LeaveSession, HolidayItem } from '../types';
import { workingTimeService } from '../services/workingTimeService';
import { getTodayDateString } from '../utils/dateUtils';
import { formatDateWithEnDay } from '../utils/formatters';
import { CheckCircle2, ChevronDown, ChevronUp, UserX, Calendar } from 'lucide-react';

/**
 * Hook tổng hợp danh sách nghỉ phép và kỳ nghỉ lễ sắp tới của nhân sự Product
 */
export function useProductLeaves(members: MemberItem[]) {
  // Chỉ xét nhân sự thuộc bộ phận Product
  const productMembers = useMemo(() => {
    return members.filter(
      (m) => m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team)
    );
  }, [members]);

  const productMemberMap = useMemo(() => {
    const map = new Map<string, MemberItem>();
    productMembers.forEach((m) => {
      map.set((m.name || '').trim().toLowerCase(), m);
    });
    return map;
  }, [productMembers]);

  const productMemberNames = useMemo(() => {
    return productMembers.map((m) => m.name || '');
  }, [productMembers]);

  // 1. Ngày hôm nay & 3 ngày làm việc tiếp theo
  const todayStr = getTodayDateString();
  const next3WorkingDays = useMemo(() => {
    return workingTimeService.getNextWorkingDays(3, todayStr);
  }, [todayStr]);

  // 2. Danh sách nghỉ phép đã duyệt hôm nay
  const todayLeaves = useMemo(() => {
    return workingTimeService.getLeavesForDate(todayStr, productMemberNames);
  }, [todayStr, productMemberNames]);

  // 3. Danh sách nghỉ phép đã duyệt trong 3 ngày làm việc tới
  const upcomingLeaves = useMemo(() => {
    const allApproved = workingTimeService
      .getMemberLeaves()
      .filter((l) => l.status === 'Đã duyệt');

    const memberNameSet = new Set(productMembers.map((m) => (m.name || '').trim().toLowerCase()));

    // Thu thập theo từng ngày trong 3 ngày làm việc tới
    const list: {
      date: string;
      leave: MemberLeaveItem;
      memberObj?: MemberItem;
    }[] = [];

    next3WorkingDays.forEach((dayStr) => {
      const dayLeaves = allApproved.filter((l) => {
        if (!memberNameSet.has((l.memberName || '').trim().toLowerCase())) return false;
        return dayStr >= l.startDate && dayStr <= l.endDate;
      });

      dayLeaves.forEach((l) => {
        list.push({
          date: dayStr,
          leave: l,
          memberObj: productMemberMap.get((l.memberName || '').trim().toLowerCase()),
        });
      });
    });

    return list;
  }, [next3WorkingDays, productMembers, productMemberMap]);

  const hasTodayLeaves = todayLeaves.length > 0;
  const hasUpcomingLeaves = upcomingLeaves.length > 0;
  const hasAnyLeave = hasTodayLeaves || hasUpcomingLeaves;

  return {
    todayLeaves,
    upcomingLeaves,
    hasTodayLeaves,
    hasUpcomingLeaves,
    hasAnyLeave,
    productMemberMap,
    productMembers,
  };
}

interface DailyLeaveNoticeProps {
  members: MemberItem[];
  leaveData?: ReturnType<typeof useProductLeaves>;
}

/**
 * Định dạng tên hiển thị dạng "Tên Họ" để dễ dàng nhận biết khi có nhân sự trùng tên
 */
function getMemberDisplayName(member: MemberItem): string {
  const firstName = member.firstName || member.name.trim().split(/\s+/).slice(-1)[0];
  const lastName = member.lastName || member.name.trim().split(/\s+/)[0];
  if (firstName && lastName && firstName.toLowerCase() !== lastName.toLowerCase()) {
    return `${firstName} ${lastName}`;
  }
  return firstName || member.name;
}

/**
 * Định dạng chuẩn theo yêu cầu: Trung Tiêu (sáng Mon, 14 Sep 2026)
 */
function formatLeaveDate(dateStr: string, session?: LeaveSession): string {
  const formattedDate = formatDateWithEnDay(dateStr);
  if (session === 'morning') return `sáng ${formattedDate}`;
  if (session === 'afternoon') return `chiều ${formattedDate}`;
  return formattedDate;
}

export const DailyLeaveNotice: React.FC<DailyLeaveNoticeProps> = ({ members, leaveData: externalLeaveData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const internalLeaveData = useProductLeaves(members);
  const {
    todayLeaves,
    upcomingLeaves,
    hasTodayLeaves,
    hasUpcomingLeaves,
    hasAnyLeave,
    productMemberMap,
  } = externalLeaveData || internalLeaveData;

  // Render session badge text for today
  const renderSessionText = (session?: string) => {
    if (session === 'morning') return ' (sáng)';
    if (session === 'afternoon') return ' (chiều)';
    return '';
  };

  // Nếu không ai nghỉ (cả hôm nay và 3 ngày tới): Thanh trạng thái xanh lá tinh gọn
  if (!hasAnyLeave) {
    return (
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] px-3 py-2 shadow-2xs transition-all flex items-center justify-between gap-2 text-xs font-ui">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#22c55e]/15 text-[#15803d] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-[#166534] text-[11px] leading-tight">
            <strong>Lịch nghỉ:</strong> Đủ quân số
          </span>
        </div>
      </div>
    );
  }

  // Tiêu đề Header
  const headerTitle = hasTodayLeaves
    ? `Lịch nghỉ: ${todayLeaves.length} nghỉ hôm nay`
    : `Lịch nghỉ: ${upcomingLeaves.length} sắp nghỉ`;

  return (
    <div className="h-full flex flex-col bg-[#fffdfd] border border-[#f3c2d4] rounded-[10px] shadow-2xs overflow-hidden transition-all text-xs font-ui">
      {/* Header Banner - Tông hồng nhẹ VnExpress, min-h-[44px] đồng bộ */}
      <div
        className="px-3.5 py-2.5 bg-[#fdf4f8] flex items-center justify-between gap-2 cursor-pointer select-none min-h-[44px] border-b border-[#f8d7e3]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#963861]/12 text-[#963861] flex items-center justify-center shrink-0">
            <UserX className="w-3.5 h-3.5 text-[#963861]" />
          </div>
          <h4 className="font-title text-[13px] font-semibold text-[#963861] truncate">
            {headerTitle}
          </h4>
        </div>

        <button
          type="button"
          className="p-1 text-[#963861] hover:bg-[#fae6ee] rounded-[4px] transition-colors shrink-0 cursor-pointer"
          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body: Đồng bộ chiều cao flex-1, border-t border-[#f8d7e3], padding px-3.5 py-2.5 */}
      {isExpanded && (
        <div className="flex-1 px-3.5 py-2.5 bg-white space-y-2 flex flex-col justify-start">
          {/* Dòng 1: Hôm nay */}
          <div className="text-xs leading-relaxed">
            <div className="text-[#963861] font-bold mb-0.5">Hôm nay:</div>
            {hasTodayLeaves ? (
              <div className="flex flex-wrap items-center gap-1 text-[#202020]">
                {todayLeaves.map((l, idx) => {
                  const mObj = productMemberMap.get((l.memberName || '').trim().toLowerCase());
                  const displayName = mObj ? getMemberDisplayName(mObj) : l.memberName;
                  return (
                    <span key={l.id} className="inline-flex items-center">
                      <span className="text-[#202020] font-normal">{displayName}</span>
                      <span className="text-[#71717a]">{renderSessionText(l.session)}</span>
                      {idx < todayLeaves.length - 1 && <span className="text-[#d4d4d8] mx-1">•</span>}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-[#15803d] font-normal text-xs">Đủ quân số</span>
            )}
          </div>

          {/* Dòng 2: 3 ngày làm việc tới */}
          <div className="text-xs leading-relaxed pt-1.5 border-t border-[#f4f4f5]">
            <div className="text-[#52525b] font-bold mb-0.5">3 ngày tới:</div>
            {hasUpcomingLeaves ? (
              <div className="space-y-1">
                {upcomingLeaves.map((item) => {
                  const displayName = item.memberObj
                    ? getMemberDisplayName(item.memberObj)
                    : item.leave.memberName;
                  const dateStr = formatLeaveDate(item.date, item.leave.session);

                  return (
                    <div key={`${item.leave.id}-${item.date}`} className="text-xs leading-snug">
                      <span className="text-[#202020] font-normal">{displayName}</span>
                      <span className="text-[#71717a] ml-1">({dateStr})</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-[#15803d] font-normal text-xs">Đủ quân số</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
