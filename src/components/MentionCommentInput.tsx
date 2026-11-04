/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MemberItem } from '../types';
import { getMentionQueryAtCursor, insertMention } from '../utils/mentionUtils';
import { normalizePersonName, isProductMember } from '../utils/memberPersonalization';
import { AtSign, User } from './vds/icons';

interface MentionCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  members?: MemberItem[];
  productMembers?: MemberItem[];
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export const MentionCommentInput: React.FC<MentionCommentInputProps> = ({
  value,
  onChange,
  onSubmit,
  members,
  productMembers,
  placeholder = 'Nhập bình luận, trao đổi... Gõ @ để tag nhân sự',
  className = '',
  rows = 3,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const candidateMembers = useMemo(() => {
    return members && members.length > 0 ? members : productMembers || [];
  }, [members, productMembers]);

  // Lọc danh sách nhân sự theo mentionQuery (hỗ trợ tất cả nhân sự trong hệ thống)
  const filteredMembers = useMemo(() => {
    if (!isMentionOpen || candidateMembers.length === 0) return [];
    const q = mentionQuery.trim().toLowerCase();
    if (!q) {
      // Khi vừa gõ @, ưu tiên hiển thị nhân sự Product trước, sau đó là nhân sự khác
      const prodList = candidateMembers.filter(isProductMember);
      const otherList = candidateMembers.filter((m) => !isProductMember(m));
      return [...prodList, ...otherList].slice(0, 10);
    }

    const normQ = normalizePersonName(q);
    return candidateMembers
      .filter((m) => {
        const normName = normalizePersonName(m.name);
        const username = (m.username || '').toLowerCase();
        const team = (m.team || '').toLowerCase();
        const dept = (m.department || '').toLowerCase();
        return (
          normName.includes(normQ) ||
          username.includes(q) ||
          team.includes(q) ||
          dept.includes(q)
        );
      })
      .slice(0, 10);
  }, [isMentionOpen, mentionQuery, candidateMembers]);

  // Reset selectedIndex khi danh sách lọc thay đổi
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredMembers.length]);

  // Kiểm tra con trỏ khi nội dung thay đổi
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cursor = e.target.selectionStart ?? newVal.length;
    const match = getMentionQueryAtCursor(newVal, cursor);

    if (match.isMentioning) {
      setIsMentionOpen(true);
      setMentionQuery(match.query);
      setMentionStartIndex(match.startIndex);
    } else {
      setIsMentionOpen(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  };

  // Chọn một nhân sự từ danh sách gợi ý
  const handleSelectMember = (member: MemberItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? value.length;
    const { newText, newCursorIndex } = insertMention(
      value,
      cursor,
      mentionStartIndex,
      member.name,
      mentionQuery.length
    );

    onChange(newText);
    setIsMentionOpen(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Đưa con trỏ đến sau tag mention và focus lại textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorIndex, newCursorIndex);
    }, 10);
  };

  // Xử lý phím điều hướng
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const targetMember = filteredMembers[selectedIndex];
        if (targetMember) {
          handleSelectMember(targetMember);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMentionOpen(false);
        return;
      }
    }

    // Gửi bằng phím tắt Ctrl+Enter hoặc Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) onSubmit();
    }
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setIsMentionOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper rút gọn vai trò / bộ phận
  const getShortTeamLabel = (member: MemberItem) => {
    switch (member.team) {
      case 'Product Manager':
        return 'PM';
      case 'UX/UI Designer':
        return 'Design';
      case 'SEO':
        return 'SEO';
      case 'Data':
        return 'Data';
      default:
        return member.department || member.team || 'Khách';
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full text-xs font-body p-2.5 bg-surface border border-line rounded-vds-lg text-ink placeholder:text-subdued-lighter focus:outline-none focus:border-line-accent focus:ring-1 focus:ring-line-accent transition resize-none leading-relaxed ${className}`}
      />

      {/* Mention Dropdown Popup */}
      {isMentionOpen && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 bottom-full mb-1.5 w-72 bg-surface rounded-vds-lg border border-line shadow-pop overflow-hidden animate-fade-in"
        >
          <div className="px-2.5 py-1.5 bg-surface-100 border-b border-divider flex items-center justify-between text-[10px] font-ui font-semibold text-subdued">
            <span className="flex items-center gap-1 text-accent">
              <AtSign className="w-3 h-3" />
              <span>Tag nhân sự ({filteredMembers.length})</span>
            </span>
            <span>↑↓ di chuyển • ↵ chọn</span>
          </div>

          <div className="max-h-52 overflow-y-auto py-1 divide-y divide-divider">
            {filteredMembers.map((member, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    // Ngăn chặn blur textarea
                    e.preventDefault();
                    handleSelectMember(member);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                    isSelected ? 'bg-surface-accent-faint text-accent' : 'hover:bg-surface-100 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-surface-selected text-accent ring-1 ring-inset ring-line-accent-soft'
                          : 'bg-surface-200 text-ink-lighter border border-line'
                      }`}
                    >
                      {member.name ? member.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate leading-tight">{member.name}</div>
                      {member.username && (
                        <div className="text-[10px] text-subdued-lighter font-mono leading-tight">
                          @{member.username}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-ui font-bold px-1.5 py-0.5 rounded shrink-0 max-w-[90px] truncate ${
                      isSelected
                        ? 'bg-accent-solid/15 text-accent border border-line-accent/30'
                        : 'bg-surface-200 text-subdued border border-line'
                    }`}
                    title={member.department || member.team}
                  >
                    {getShortTeamLabel(member)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
