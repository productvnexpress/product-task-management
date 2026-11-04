/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, AtSign, BellRing, Calendar, Folder, Hash, X } from '../vds/icons';
import { MemberItem, ProjectItem } from '../../types';
import { QuickAddParseResult, QuickTokenType, parseQuickAdd } from '../../utils/quickAddParser';
import { TitleQualityResult, stripDiacritics } from '../../utils/titleQuality';
import { getInitials } from '../../utils/formatters';
import { getTeamColor } from '../../utils/colors';
import { formatDateWithEnDay } from '../../utils/formatters';

interface Suggestion {
  id: string;
  insert: string;
  label: string;
  sub?: string;
  kind: 'member' | 'project';
  member?: MemberItem;
}

interface SmartTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  members: MemberItem[];
  projects: ProjectItem[];
  onParsedChange?: (parsed: QuickAddParseResult) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  id?: string;
  placeholder?: string;
  inputClassName?: string;
  /** Kết quả kiểm tra tiêu đề chung chung (do form cha quyết định khi nào hiển thị) */
  quality?: TitleQualityResult | null;
  onConfirmVague?: () => void;
  enterKeyHint?: 'done' | 'enter' | 'go' | 'send' | 'next';
  showHint?: boolean;
}

const tokenKey = (s: string) => stripDiacritics(s.toLowerCase()).replace(/[^a-z0-9]/g, '');

export const SmartTitleInput: React.FC<SmartTitleInputProps> = ({
  value,
  onChange,
  members,
  projects,
  onParsedChange,
  onSubmit,
  onFocus,
  inputRef,
  id,
  placeholder,
  inputClassName = '',
  quality,
  onConfirmVague,
  enterKeyHint,
  showHint = true,
}) => {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = (inputRef as React.RefObject<HTMLInputElement>) || localRef;
  const [disabled, setDisabled] = useState<QuickTokenType[]>([]);
  const [caret, setCaret] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestDismissedAt, setSuggestDismissedAt] = useState<string | null>(null);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!value) setDisabled([]);
  }, [value]);

  const parsed = useMemo(
    () => parseQuickAdd(value, { members, projects, disabled }),
    [value, members, projects, disabled]
  );

  // Chỉ báo lên form cha khi kết quả nhận diện thực sự đổi (tránh vòng lặp render)
  const parsedSignature = [
    parsed.title,
    parsed.assignee?.id,
    parsed.project?.id,
    parsed.dueDate,
    parsed.isUrgent,
  ].join('|');
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === parsedSignature) return;
    lastSignature.current = parsedSignature;
    onParsedChange?.(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSignature]);

  // Token đang gõ tại vị trí con trỏ: @abc hoặc #abc
  const activeToken = useMemo(() => {
    const before = value.slice(0, caret);
    const m = before.match(/(^|\s)([@#])([^\s@#]*)$/);
    if (!m) return null;
    return { trigger: m[2] as '@' | '#', query: m[3], start: before.length - m[3].length - 1 };
  }, [value, caret]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!activeToken) return [];
    if (suggestDismissedAt === `${activeToken.start}:${activeToken.trigger}`) return [];
    const q = tokenKey(activeToken.query);
    if (activeToken.trigger === '@') {
      return members
        .filter((m) => {
          if (!q) return true;
          const parts = m.name.trim().split(/\s+/);
          const first = parts[parts.length - 1] || '';
          return (
            tokenKey(m.name).includes(q) ||
            tokenKey(first).startsWith(q) ||
            (m.username || '').toLowerCase().startsWith(q)
          );
        })
        .slice(0, 6)
        .map((m) => ({
          id: m.id,
          insert: `@${m.username || tokenKey(m.name)}`,
          label: m.name,
          sub: m.title || m.team,
          kind: 'member' as const,
          member: m,
        }));
    }
    return projects
      .filter((p) => {
        if (!q) return true;
        return tokenKey(p.code || '').includes(q) || tokenKey(p.name).includes(q);
      })
      .slice(0, 6)
      .map((p) => {
        const short = (p.code || '').replace(/^VNE-/i, '') || tokenKey(p.name);
        return {
          id: p.id,
          insert: `#${short}`,
          label: p.name.replace(/^Dự án\s+/i, ''),
          sub: p.code,
          kind: 'project' as const,
        };
      });
  }, [activeToken, members, projects, suggestDismissedAt]);

  useEffect(() => setActiveIdx(0), [activeToken?.query, activeToken?.trigger]);

  const applySuggestion = (s: Suggestion) => {
    if (!activeToken) return;
    const before = value.slice(0, activeToken.start);
    const after = value.slice(caret).replace(/^\S*/, '');
    const next = `${before}${s.insert} ${after.trimStart()}`;
    const nextCaret = (before + s.insert + ' ').length;
    // Bỏ trạng thái "đã gỡ" để token vừa chọn được nhận diện lại
    setDisabled((d) => d.filter((t) => t !== (s.kind === 'member' ? 'assignee' : 'project')));
    onChange(next);
    requestAnimationFrame(() => {
      ref.current?.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[activeIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeToken) setSuggestDismissedAt(`${activeToken.start}:${activeToken.trigger}`);
        return;
      }
    }
    if (e.key === 'Enter' && onSubmit && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  const chips: { type: QuickTokenType; icon: React.ReactNode; label: string; tone: string }[] = [];
  if (parsed.assignee) {
    const col = getTeamColor(parsed.assignee.team);
    chips.push({
      type: 'assignee',
      icon: (
        <span className={`w-4 h-4 rounded-full ${col.bg} text-on-color text-[10px] font-bold flex items-center justify-center`}>
          {getInitials(parsed.assignee.name)}
        </span>
      ),
      label: parsed.assignee.name,
      tone: 'bg-surface-200 text-ink border-line',
    });
  }
  if (parsed.project) {
    chips.push({
      type: 'project',
      icon: <Folder className="w-3 h-3" />,
      label: parsed.project.name.replace(/^Dự án\s+/i, ''),
      tone: 'bg-surface-info text-support border-line',
    });
  }
  if (parsed.dueDate) {
    chips.push({
      type: 'date',
      icon: <Calendar className="w-3 h-3" />,
      label: `${parsed.dueLabel} · ${formatDateWithEnDay(parsed.dueDate)}`,
      tone: 'bg-surface-warning text-warning border-line',
    });
  }
  if (parsed.isUrgent) {
    chips.push({
      type: 'urgent',
      icon: <BellRing className="w-3 h-3" />,
      label: 'Khẩn cấp',
      tone: 'bg-surface-negative text-negative border-line',
    });
  }

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        enterKeyHint={enterKeyHint}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
        onClick={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
        onFocus={(e) => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          setIsFocused(true);
          setCaret(e.target.selectionStart ?? e.target.value.length);
          onFocus?.();
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setIsFocused(false), 120);
        }}
        placeholder={placeholder}
        className={inputClassName}
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
      />

      {showSuggestions && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface border border-line rounded-vds-lg shadow-pop overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-1.5 text-[10px] font-ui font-bold text-subdued-lighter bg-surface-100 border-b border-divider flex items-center gap-1">
            {activeToken?.trigger === '@' ? <AtSign className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
            {activeToken?.trigger === '@' ? 'Giao cho' : 'Dự án'}
          </div>
          {suggestions.map((s, idx) => {
            const col = s.member ? getTeamColor(s.member.team) : null;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer ${
                  idx === activeIdx ? 'bg-surface-accent-faint' : 'bg-surface'
                }`}
              >
                {s.kind === 'member' ? (
                  <span className={`w-6 h-6 rounded-full ${col?.bg} text-on-color text-[10px] font-bold flex items-center justify-center shrink-0`}>
                    {getInitials(s.label)}
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-vds-lg bg-surface-info text-support flex items-center justify-center shrink-0">
                    <Folder className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-ui font-semibold text-ink truncate">{s.label}</span>
                  {s.sub && <span className="block text-xs font-ui text-subdued truncate">{s.sub}</span>}
                </span>
                <span className="text-xs font-mono text-subdued-lighter shrink-0">{s.insert}</span>
              </button>
            );
          })}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {chips.map((c) => (
            <span
              key={c.type}
              className={`inline-flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full border text-xs font-ui font-semibold ${c.tone}`}
            >
              {c.icon}
              <span className="max-w-[200px] truncate">{c.label}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDisabled((d) => [...d, c.type])}
                className="p-0.5 rounded-full hover:bg-black/10 cursor-pointer"
                aria-label={`Bỏ nhận diện ${c.label}`}
                title="Bỏ nhận diện, giữ nguyên chữ trong tiêu đề"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {quality?.isVague && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 p-2.5 rounded-vds-lg bg-surface-warning border border-line text-[12px] font-ui text-warning animate-fade-in"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-warning" />
          <div className="flex-1 min-w-0 leading-snug">
            <p className="font-bold">{quality.reason}</p>
            <p className="text-warning mt-0.5">{quality.hint}</p>
          </div>
          {onConfirmVague && (
            <button
              type="button"
              onClick={onConfirmVague}
              className="shrink-0 px-2 py-1 rounded-vds-lg text-xs font-bold text-warning hover:bg-surface-warning cursor-pointer"
            >
              Vẫn tạo ↵
            </button>
          )}
        </div>
      )}

      {showHint && isFocused && !value && (
        <p className="mt-2 text-xs font-ui text-subdued-lighter animate-fade-in">
          Gõ nhanh: <span className="font-mono text-subdued">@tên</span> giao việc ·{' '}
          <span className="font-mono text-subdued">#dự án</span> ·{' '}
          <span className="font-mono text-subdued">mai</span>, <span className="font-mono text-subdued">thứ 6</span>,{' '}
          <span className="font-mono text-subdued">15/11</span> đặt hạn ·{' '}
          <span className="font-mono text-subdued">!</span> khẩn cấp
        </p>
      )}
    </div>
  );
};
