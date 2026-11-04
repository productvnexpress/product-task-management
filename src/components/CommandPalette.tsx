/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft, Folder, Search, User } from './vds/icons';
import { MemberItem, ProjectItem, TaskItem } from '../types';
import { stripDiacritics } from '../utils/titleQuality';
import { getInitials } from '../utils/formatters';
import { getTeamColor } from '../utils/colors';
import { formatTaskDueDisplay, getTaskDueDateInfo } from '../utils/dateUtils';
import { compareTasksByUrgency } from '../utils/taskViewUtils';
import { isSamePersonName } from '../utils/memberPersonalization';

export interface PaletteCommand {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  members: MemberItem[];
  currentUser?: MemberItem | null;
  onOpenTask: (task: TaskItem) => void;
  onFilterProject: (projectId: string) => void;
  onFilterMember: (member: MemberItem) => void;
}

type Item =
  | { kind: 'command'; key: string; command: PaletteCommand }
  | { kind: 'task'; key: string; task: TaskItem }
  | { kind: 'project'; key: string; project: ProjectItem }
  | { kind: 'member'; key: string; member: MemberItem };

const norm = (s: string) => stripDiacritics((s || '').toLowerCase());

function matches(haystack: string, query: string): boolean {
  const h = norm(haystack);
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => h.includes(w));
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  tasks,
  projects,
  members,
  currentUser,
  onOpenTask,
  onFilterProject,
  onFilterMember,
}) => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  const sections = useMemo(() => {
    const q = query.trim();
    const cmdItems: Item[] = commands
      .filter((c) => !q || matches(`${c.label} ${c.keywords || ''}`, q))
      .slice(0, q ? 5 : 8)
      .map((c) => ({ kind: 'command', key: `c-${c.id}`, command: c }));

    let taskList: TaskItem[];
    if (q) {
      taskList = tasks
        .filter((t) => matches(`${t.title} ${t.projectName} ${t.assignee}`, q))
        .sort((a, b) => {
          const doneA = a.status === 'Hoàn thành' ? 1 : 0;
          const doneB = b.status === 'Hoàn thành' ? 1 : 0;
          return doneA - doneB || compareTasksByUrgency(a, b);
        })
        .slice(0, 8);
    } else {
      // Gợi ý: việc của tôi gấp nhất
      const me = currentUser?.name;
      taskList = tasks
        .filter((t) => t.status !== 'Hoàn thành' && (!me || isSamePersonName(t.assignee, me)))
        .sort(compareTasksByUrgency)
        .slice(0, 5);
    }
    const taskItems: Item[] = taskList.map((t) => ({ kind: 'task', key: `t-${t.id}`, task: t }));

    const projectItems: Item[] = q
      ? projects
          .filter((p) => matches(`${p.name} ${p.code}`, q))
          .slice(0, 4)
          .map((p) => ({ kind: 'project', key: `p-${p.id}`, project: p }))
      : [];

    const memberItems: Item[] = q
      ? members
          .filter((m) => matches(`${m.name} ${m.username || ''} ${m.title || ''}`, q))
          .slice(0, 4)
          .map((m) => ({ kind: 'member', key: `m-${m.id}`, member: m }))
      : [];

    return [
      { title: q ? 'Lệnh' : 'Lệnh nhanh', items: cmdItems },
      { title: q ? 'Công việc' : 'Việc của bạn cần làm trước', items: taskItems },
      { title: 'Dự án', items: projectItems },
      { title: 'Nhân sự', items: memberItems },
    ].filter((s) => s.items.length > 0);
  }, [query, commands, tasks, projects, members, currentUser]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => setActiveIdx(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const execute = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    // Đợi palette đóng để tránh tranh chấp focus với drawer/ô nhập
    window.setTimeout(() => {
      if (item.kind === 'command') item.command.run();
      else if (item.kind === 'task') onOpenTask(item.task);
      else if (item.kind === 'project') onFilterProject(item.project.id);
      else onFilterMember(item.member);
    }, 10);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      execute(flat[activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIdx = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[66] flex items-start justify-center sm:pt-[12vh]" onKeyDown={onKeyDown}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-dark/40 backdrop-blur-xs"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Tìm kiếm và lệnh nhanh"
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[620px] h-full sm:h-auto sm:max-h-[70vh] bg-surface sm:rounded-vds-xl shadow-sheet border border-line flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 h-14 border-b border-divider shrink-0">
              <Search className="w-5 h-5 text-subdued-lighter shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm việc, dự án, người… hoặc gõ lệnh"
                className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-[15px] font-ui text-ink placeholder-subdued-lighter outline-hidden focus-visible:shadow-none!"
                aria-controls="palette-list"
                aria-activedescendant={flat[activeIdx]?.key}
                enterKeyHint="go"
              />
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden text-[14px] font-ui font-semibold text-accent px-1 cursor-pointer"
              >
                Đóng
              </button>
              <span className="hidden sm:inline-flex kbd">esc</span>
            </div>

            <div id="palette-list" ref={listRef} role="listbox" className="flex-1 overflow-y-auto py-1.5">
              {flat.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px] font-ui text-subdued-lighter">
                  Không tìm thấy kết quả cho “{query}”
                </p>
              )}
              {sections.map((section) => (
                <div key={section.title} className="pb-1">
                  <p className="px-4 pt-2 pb-1 text-xs font-ui font-bold text-subdued-lighter">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    runningIdx += 1;
                    const idx = runningIdx;
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={item.key}
                        id={item.key}
                        data-idx={idx}
                        role="option"
                        aria-selected={isActive}
                        type="button"
                        onMouseMove={() => idx !== activeIdx && setActiveIdx(idx)}
                        onClick={() => execute(item)}
                        className={`w-full min-h-[44px] px-4 py-2 flex items-center gap-3 text-left cursor-pointer ${
                          isActive ? 'bg-surface-accent-faint' : ''
                        }`}
                      >
                        <PaletteRow item={item} />
                        {isActive && <CornerDownLeft className="hidden sm:block w-3.5 h-3.5 text-subdued-lighter shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-4 px-4 h-9 border-t border-divider text-xs font-ui text-subdued-lighter shrink-0">
              <span className="flex items-center gap-1">
                <span className="kbd">↑</span>
                <span className="kbd">↓</span> chọn
              </span>
              <span className="flex items-center gap-1">
                <span className="kbd">↵</span> mở
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <span className="kbd">N</span> thêm việc
              </span>
              <span className="flex items-center gap-1">
                <span className="kbd">⌘</span>
                <span className="kbd">K</span> mở bảng này
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PaletteRow: React.FC<{ item: Item }> = ({ item }) => {
  if (item.kind === 'command') {
    const Icon = item.command.icon;
    return (
      <>
        <span className="w-7 h-7 rounded-vds-lg bg-surface-200 text-ink-lighter flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-ui font-semibold text-ink truncate">{item.command.label}</span>
          {item.command.hint && <span className="block text-[12px] font-ui text-subdued truncate">{item.command.hint}</span>}
        </span>
        {item.command.shortcut && <span className="hidden sm:inline-flex kbd">{item.command.shortcut}</span>}
      </>
    );
  }
  if (item.kind === 'task') {
    const t = item.task;
    const done = t.status === 'Hoàn thành';
    const due = getTaskDueDateInfo(t.dueDate, t.status);
    const dueTone = done ? 'text-subdued-lighter' : due.status === 'overdue' ? 'text-negative' : due.status === 'due_today' ? 'text-warning' : 'text-subdued';
    return (
      <>
        <span
          className={`w-[18px] h-[18px] rounded-full border-[1.5px] shrink-0 ${
            done ? 'bg-positive-solid border-line-positive' : t.priority === 'Khẩn cấp' ? 'border-line-negative' : 'border-line-regular'
          }`}
        />
        <span className="flex-1 min-w-0">
          <span className={`block text-[14px] font-ui font-semibold truncate ${done ? 'line-through text-subdued-lighter' : 'text-ink'}`}>
            {t.title}
          </span>
          <span className="block text-[12px] font-ui text-subdued truncate">
            {(t.projectName || '').replace(/^Dự án\s+/i, '')} · {t.assignee} ·{' '}
            <span className={dueTone}>{formatTaskDueDisplay(t.dueDate)}</span>
          </span>
        </span>
      </>
    );
  }
  if (item.kind === 'project') {
    const p = item.project;
    return (
      <>
        <span className="w-7 h-7 rounded-vds-lg bg-surface-info text-support flex items-center justify-center shrink-0">
          <Folder className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-ui font-semibold text-ink truncate">{p.name}</span>
          <span className="block text-[12px] font-ui text-subdued truncate">{p.code} · Lọc việc của dự án</span>
        </span>
      </>
    );
  }
  const m = item.member;
  const col = getTeamColor(m.team);
  return (
    <>
      <span className={`w-7 h-7 rounded-full ${col.bg} text-on-color text-xs font-bold flex items-center justify-center shrink-0`}>
        {getInitials(m.name) || <User className="w-4 h-4" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-ui font-semibold text-ink truncate">{m.name}</span>
        <span className="block text-[12px] font-ui text-subdued truncate">{m.title} · Xem việc của người này</span>
      </span>
    </>
  );
};
