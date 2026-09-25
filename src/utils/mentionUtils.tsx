/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MemberItem, TaskItem } from '../types';
import { normalizePersonName, isSamePersonName } from './memberPersonalization';

export interface MentionMatch {
  isMentioning: boolean;
  query: string;
  startIndex: number;
}

/**
 * Phát hiện vị trí đang gõ mention '@' tại vị trí con trỏ trong ô nhập
 */
export function getMentionQueryAtCursor(text: string, cursorIndex: number): MentionMatch {
  if (cursorIndex < 0 || cursorIndex > text.length) {
    return { isMentioning: false, query: '', startIndex: -1 };
  }

  // Lấy chuỗi từ đầu đến con trỏ
  const textBeforeCursor = text.slice(0, cursorIndex);

  // Tìm vị trí ký tự '@' gần nhất trước con trỏ
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  if (lastAtIndex === -1) {
    return { isMentioning: false, query: '', startIndex: -1 };
  }

  // Ký tự '@' phải ở đầu chuỗi hoặc đứng sau khoảng trắng/xuống dòng
  if (lastAtIndex > 0) {
    const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
    if (!/\s/.test(charBeforeAt)) {
      return { isMentioning: false, query: '', startIndex: -1 };
    }
  }

  // Nội dung giữa '@' và con trỏ không được chứa ký tự xuống dòng
  const textBetweenAtAndCursor = textBeforeCursor.slice(lastAtIndex + 1);
  if (textBetweenAtAndCursor.includes('\n')) {
    return { isMentioning: false, query: '', startIndex: -1 };
  }

  // Giới hạn độ dài query mention tối đa 30 ký tự để tránh trigger giả khi gõ văn bản dài
  if (textBetweenAtAndCursor.length > 30) {
    return { isMentioning: false, query: '', startIndex: -1 };
  }

  return {
    isMentioning: true,
    query: textBetweenAtAndCursor,
    startIndex: lastAtIndex,
  };
}

/**
 * Chèn mention vào chuỗi văn bản và trả về nội dung mới cùng vị trí con trỏ mới
 * Thay thế triệt để toàn bộ chuỗi tìm kiếm query bắt đầu từ '@' tránh sót chữ thừa
 */
export function insertMention(
  text: string,
  cursorIndex: number,
  startIndex: number,
  memberName: string,
  queryLength: number = 0
): { newText: string; newCursorIndex: number } {
  const before = text.slice(0, startIndex);
  // Thay thế từ startIndex đến hết từ khóa query đang gõ
  const replaceEnd = Math.max(cursorIndex, startIndex + 1 + queryLength);
  const after = text.slice(replaceEnd);
  const mentionText = `@${memberName} `;
  const newText = before + mentionText + after;
  const newCursorIndex = before.length + mentionText.length;

  return { newText, newCursorIndex };
}

/**
 * Trích xuất danh sách nhân sự (toàn bộ hệ thống) được tag bằng cú pháp '@Tên' hoặc '@Username' trong văn bản
 */
export function extractMentions(text: string, allMembers: MemberItem[]): MemberItem[] {
  if (!text || !text.includes('@') || !allMembers || allMembers.length === 0) return [];

  const mentionedMembers = new Set<MemberItem>();

  // Sắp xếp theo độ dài tên giảm dần để ưu tiên tên dài hơn trước (tránh conflict tên trùng một phần)
  const sortedMembers = [...allMembers].sort((a, b) => b.name.length - a.name.length);

  for (const m of sortedMembers) {
    const namePattern = new RegExp(`@${escapeRegex(m.name)}(?=[\\s,.:;!?()[\\]{}<>"']|$)`, 'i');
    const usernamePattern = m.username
      ? new RegExp(`@${escapeRegex(m.username)}(?=[\\s,.:;!?()[\\]{}<>"']|$)`, 'i')
      : null;

    if (namePattern.test(text) || (usernamePattern && usernamePattern.test(text))) {
      mentionedMembers.add(m);
    }
  }

  return Array.from(mentionedMembers);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Thu thập danh sách nhân sự tham gia luồng trao đổi của công việc
 * Bao gồm:
 * 1. Người phụ trách hiện tại (assignee)
 * 2. Người tạo công việc (createdBy)
 * 3. Những người từng bình luận hoặc ghi chú trong lịch sử (task.logs)
 * Loại trừ người đang thực hiện hành động bình luận (currentActorName)
 */
export function getTaskThreadParticipants(
  task: TaskItem,
  currentActorName: string
): string[] {
  const participants = new Set<string>();

  // 1. Người phụ trách task
  if (task.assignee && !isSamePersonName(task.assignee, currentActorName)) {
    participants.add(task.assignee);
  }

  // 2. Người tạo task (nếu có)
  if (task.createdBy && !isSamePersonName(task.createdBy, currentActorName)) {
    participants.add(task.createdBy);
  }

  // 3. Những người từng bình luận hoặc trao đổi trong lịch sử
  if (task.logs && task.logs.length > 0) {
    task.logs.forEach((log) => {
      if (
        log.author &&
        !isSamePersonName(log.author, currentActorName) &&
        !isSamePersonName(log.author, 'Hệ thống') &&
        (log.action === 'Bình luận' || log.action === 'Cập nhật' || Boolean(log.note) || (log.changes && log.changes.length > 0))
      ) {
        participants.add(log.author);
      }
    });
  }

  return Array.from(participants);
}

/**
 * Render chuỗi bình luận có tô màu và làm nổi bật các tag @Nhân sự (hỗ trợ tất cả nhân sự, chuẩn xác họ tên đầy đủ)
 */
export function renderCommentWithMentions(
  content: string,
  allMembers: MemberItem[]
): React.ReactNode {
  if (!content) return null;
  if (!content.includes('@') || !allMembers || allMembers.length === 0) return content;

  // Sắp xếp theo độ dài tên giảm dần để ưu tiên tên dài hơn trước (ví dụ "Phương Văn Tiến" trước "Phương Văn")
  const sortedMembers = [...allMembers].sort((a, b) => b.name.length - a.name.length);

  // Tạo danh sách pattern tên và username đầy đủ của mọi nhân sự
  const patternStrings: string[] = [];
  sortedMembers.forEach((m) => {
    if (m.name && m.name.trim()) {
      patternStrings.push(escapeRegex(m.name.trim()));
    }
    if (m.username && m.username.trim()) {
      patternStrings.push(escapeRegex(m.username.trim()));
    }
  });

  if (patternStrings.length === 0) return content;

  // Regex bắt chuẩn xác @Họ_Và_Tên đầy đủ mà không bị cắt vụn từ
  const mentionPattern = new RegExp(`(@(?:${patternStrings.join('|')}))(?=[\\s,.:;!?()[\\]{}<>"']|$)`, 'gi');

  const parts = content.split(mentionPattern);

  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      const candidate = part.slice(1).trim();
      const matched = sortedMembers.find(
        (m) =>
          normalizePersonName(m.name) === normalizePersonName(candidate) ||
          (m.username && m.username.toLowerCase() === candidate.toLowerCase())
      );

      if (matched) {
        const teamOrDept = matched.team || matched.department || 'Thành viên';
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-[#fdf2f7] text-[#963861] font-semibold text-xs border border-[#f4c2d7]/80 align-baseline mx-0.5 shadow-2xs"
            title={`${matched.name} (${teamOrDept})`}
          >
            <span className="opacity-70 font-normal">@</span>
            <span>{matched.name}</span>
          </span>
        );
      }
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
