/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MemberItem, ProjectItem, TaskItem } from '../types';
import {
  analyzeTeamPerformance,
  getPerfPeriod,
  PerfPeriodType,
  StreamPerf,
  MemberPerf,
  TaskPerf,
  Verdict,
  VERDICT_LABEL,
} from '../utils/teamPerformance';
import { formatDateWithEnDay } from '../utils/formatters';
import { ChevronDown, ChevronLeft, ChevronRight, Info, Lock, TrendingUp } from './vds/icons';

interface TeamPerformanceViewProps {
  tasks: TaskItem[];
  projects: ProjectItem[];
  members: MemberItem[];
  onOpenTaskDetail?: (task: TaskItem) => void;
}

type ViewMode = 'members' | 'projects';

const fmt = (x: number) => x.toFixed(1).replace('.', ',');
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

const VERDICT_CHIP: Record<Verdict, string> = {
  worth: 'bg-surface-positive text-positive',
  review: 'bg-surface-warning text-warning',
  not_worth: 'bg-surface-negative text-negative',
};
const VERDICT_BAR: Record<Verdict, string> = {
  worth: 'bg-positive-solid',
  review: 'bg-warning-solid',
  not_worth: 'bg-negative-solid',
};
const VERDICTS: Verdict[] = ['worth', 'review', 'not_worth'];

const expand = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

const VerdictChip: React.FC<{ v: Verdict }> = ({ v }) => (
  <span className={`inline-block whitespace-nowrap rounded-vds-sm px-1.5 py-0.5 text-[11px] font-ui font-bold ${VERDICT_CHIP[v]}`}>
    {VERDICT_LABEL[v]}
  </span>
);

const VerdictBar: React.FC<{ days: Record<Verdict, number>; height?: string }> = ({ days, height = 'h-2' }) => {
  const total = VERDICTS.reduce((a, v) => a + days[v], 0);
  return (
    <div className={`flex ${height} w-full overflow-hidden rounded-vds-sm bg-surface-200`}>
      {total > 0 &&
        VERDICTS.map((v) =>
          days[v] > 0 ? <i key={v} className={`block h-full ${VERDICT_BAR[v]}`} style={{ width: `${(100 * days[v]) / total}%` }} /> : null
        )}
    </div>
  );
};

const onTimeTone = (r: number | null) =>
  r === null ? 'text-subdued' : r >= 0.85 ? 'text-positive' : r >= 0.7 ? 'text-warning' : 'text-negative';

// ------------------------------------------
// Danh sách task trong một dòng việc
// ------------------------------------------
const TaskList: React.FC<{ tasks: TaskPerf[]; showAssignee?: boolean; onOpen?: (t: TaskItem) => void }> = ({ tasks, showAssignee, onOpen }) => (
  <ul className="divide-y divide-line border-t border-line">
    {[...tasks]
      .sort((a, b) => (a.task.dueDate || '').localeCompare(b.task.dueDate || ''))
      .map((p) => {
        const late = p.lateDays !== null && p.lateDays > 0;
        return (
          <li key={p.task.id} className="flex items-start gap-3 py-1.5 text-xs">
            <span className="w-24 shrink-0 font-num text-subdued">{formatDateWithEnDay(p.task.dueDate)}</span>
            <button
              type="button"
              onClick={() => onOpen?.(p.task)}
              className="min-w-0 flex-1 cursor-pointer text-left font-body text-ink hover:text-link hover:underline"
            >
              {p.task.title}
              {showAssignee && <span className="ml-1.5 text-subdued">· {p.task.assignee}</span>}
            </button>
            <span className="w-16 shrink-0 text-right font-num text-ink-lighter">{fmt(p.personDays)} ngày</span>
            <span
              className={`w-20 shrink-0 text-right font-ui ${
                p.isOpenOverdue ? 'text-negative font-bold' : late ? 'text-warning' : p.lateDays === null ? 'text-subdued' : 'text-positive'
              }`}
            >
              {p.isOpenOverdue ? 'Quá hạn' : p.lateDays === null ? 'Chưa xong' : late ? `Trễ ${p.lateDays} ngày` : 'Đúng hạn'}
            </span>
          </li>
        );
      })}
  </ul>
);

// ------------------------------------------
// Một dòng việc / dự án (dùng cho cả 2 lớp)
// ------------------------------------------
const StreamRow: React.FC<{ s: StreamPerf; showPeople?: boolean; onOpen?: (t: TaskItem) => void }> = ({ s, showPeople, onOpen }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 text-left hover:bg-surface-100 md:grid-cols-[minmax(0,1fr)_56px_72px_56px_88px_20px]"
      >
        <div className="min-w-0">
          <div className="font-ui text-sm font-bold text-ink">{s.label}</div>
          {s.projectMeta && <div className="mt-0.5 text-[11px] text-subdued">{s.projectMeta}</div>}
          {showPeople && (
            <div className="mt-0.5 text-[11px] text-ink-lighter">
              {s.members.map((m) => `${m.name.split(' ').slice(-1)[0]} ${fmt(m.personDays)}`).join(' · ')}
            </div>
          )}
        </div>
        <div className="hidden text-right font-num text-sm text-ink md:block">{s.tasks.length}</div>
        <div className="hidden text-right font-num text-sm font-bold text-ink md:block">{fmt(s.personDays)}</div>
        <div className={`hidden text-right font-num text-sm md:block ${s.lateCount ? 'text-warning' : 'text-subdued'}`}>
          {s.lateCount}/{s.tasks.length}
        </div>
        <div className="row-start-1 text-right md:row-auto">
          <VerdictChip v={s.verdict} />
          <div className="mt-1 font-num text-[11px] text-subdued md:hidden">
            {fmt(s.personDays)} ngày · {s.tasks.length} task
          </div>
        </div>
        <ChevronDown className={`hidden h-4 w-4 self-center text-icon-subdued transition-transform md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...expand} className="overflow-hidden">
            <div className="space-y-2 pb-4">
              <ul className="space-y-1">
                {s.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink">
                    <span className={`font-ui font-bold ${r.tone === 'plus' ? 'text-positive' : 'text-negative'}`}>{r.tone === 'plus' ? '+' : '−'}</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
              <TaskList tasks={s.tasks} showAssignee={showPeople} onOpen={onOpen} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StreamHeader: React.FC<{ firstLabel: string }> = ({ firstLabel }) => (
  <div className="hidden grid-cols-[minmax(0,1fr)_56px_72px_56px_88px_20px] gap-x-4 border-b border-line-strong pb-1.5 text-[11px] font-ui font-bold text-ink-lighter md:grid">
    <span>{firstLabel}</span>
    <span className="text-right">Task</span>
    <span className="text-right">Ngày công</span>
    <span className="text-right">Trễ</span>
    <span className="text-right">Đánh giá</span>
    <span />
  </div>
);

// ------------------------------------------
// Một thành viên
// ------------------------------------------
const MemberBlock: React.FC<{ m: MemberPerf; onOpen?: (t: TaskItem) => void }> = ({ m, onOpen }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 text-left hover:bg-surface-100 md:grid-cols-[minmax(0,1.2fr)_48px_64px_64px_minmax(0,1fr)_20px]"
      >
        <div className="min-w-0">
          <div className="font-ui text-sm font-bold text-ink">{m.member.name}</div>
          <div className="text-[11px] text-subdued">
            {m.member.team}
            {m.leaveDays > 0 && ` · nghỉ ${fmt(m.leaveDays)} ngày`}
          </div>
        </div>
        <div className="hidden text-right font-num text-sm md:block">{m.taskCount}</div>
        <div className="hidden text-right font-num text-sm font-bold md:block">{fmt(m.personDays)}</div>
        <div className={`text-right font-num text-sm font-bold ${onTimeTone(m.onTimeRate)}`}>{pct(m.onTimeRate)}</div>
        <div className="col-span-2 md:col-span-1">
          <VerdictBar days={m.verdictDays} />
          <div className="mt-1 font-num text-[11px] text-subdued">
            {fmt(m.verdictDays.worth)} · {fmt(m.verdictDays.review)} · {fmt(m.verdictDays.not_worth)}
          </div>
        </div>
        <ChevronDown className={`hidden h-4 w-4 text-icon-subdued transition-transform md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...expand} className="overflow-hidden">
            <div className="space-y-4 pb-6 md:pl-4">
              <p className="border-l-2 border-line-accent pl-3 text-sm text-ink">{m.summary}</p>
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <div><dt className="text-subdued">Task / xong</dt><dd className="font-num font-bold text-ink">{m.taskCount} / {m.doneCount}</dd></div>
                <div><dt className="text-subdued">Trễ 1 ngày / ≥2 ngày</dt><dd className="font-num font-bold text-ink">{m.late1} / {m.late2}</dd></div>
                <div><dt className="text-subdued">Ngày công / khả dụng</dt><dd className="font-num font-bold text-ink">{fmt(m.personDays)} / {fmt(m.capacityDays)}</dd></div>
                <div><dt className="text-subdued">Ngoài dự án</dt><dd className="font-num font-bold text-ink">{Math.round(m.othersShare * 100)}%</dd></div>
                <div><dt className="text-subdued">Gia hạn / nghẽn</dt><dd className="font-num font-bold text-ink">{m.extensions} / {m.blocked}</dd></div>
              </dl>
              {m.flags.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-lighter">
                  {m.flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
              {m.streams.length > 0 && (
                <div>
                  <StreamHeader firstLabel="Dòng việc" />
                  {m.streams.map((s) => <StreamRow key={s.key} s={s} onOpen={onOpen} />)}
                </div>
              )}
              {m.vagueTitles.length > 0 && (
                <div className="text-xs">
                  <div className="mb-1 font-ui font-bold text-ink-lighter">Tiêu đề cần ghi rõ hơn</div>
                  <ul className="space-y-0.5 text-ink">
                    {m.vagueTitles.map((p) => (
                      <li key={p.task.id}>
                        <button type="button" onClick={() => onOpen?.(p.task)} className="cursor-pointer text-left hover:text-link hover:underline">
                          “{p.task.title}”
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ------------------------------------------
// VIEW CHÍNH
// ------------------------------------------
export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({ tasks, projects, members, onOpenTaskDetail }) => {
  const [type, setType] = useState<PerfPeriodType>('week');
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<ViewMode>('members');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all');

  const period = useMemo(() => getPerfPeriod(type, offset), [type, offset]);
  const report = useMemo(() => analyzeTeamPerformance(tasks, projects, members, period), [tasks, projects, members, period]);
  const prev = useMemo(
    () => analyzeTeamPerformance(tasks, projects, members, getPerfPeriod(type, offset - 1)),
    [tasks, projects, members, type, offset]
  );

  const totalVerdict = VERDICTS.reduce((a, v) => a + report.verdictDays[v], 0);
  const onTimeDelta = report.onTimeRate !== null && prev.onTimeRate !== null ? report.onTimeRate - prev.onTimeRate : null;
  const recoverable = report.recommendations.reduce((a, r) => a + r.recoverableDays, 0);
  const projectList = report.projects.filter((p) => verdictFilter === 'all' || p.verdict === verdictFilter);

  const switchType = (t: PerfPeriodType) => {
    setType(t);
    setOffset(0);
  };

  return (
    <div className="w-full space-y-8">
      {/* Tiêu đề & bộ chọn kỳ */}
      <header className="space-y-4 border-b border-line-strong pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-title text-2xl font-bold text-ink">Hiệu quả team</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-subdued">
              <Lock className="h-3.5 w-3.5" /> Chỉ tài khoản tienngoc. Phân tích trên dữ liệu WMS, không dùng AI.
            </p>
          </div>
          <div className="inline-flex rounded-vds-md border border-line p-0.5" role="tablist" aria-label="Chọn kỳ phân tích">
            {(['week', 'month'] as PerfPeriodType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={type === t}
                onClick={() => switchType(t)}
                className={`cursor-pointer rounded-vds-sm px-3 py-1.5 font-ui text-xs font-bold transition-colors ${
                  type === t ? 'bg-accent-solid text-on-color' : 'text-ink-lighter hover:text-ink'
                }`}
              >
                {t === 'week' ? 'Theo tuần' : 'Theo tháng'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Kỳ trước" className="cursor-pointer rounded-vds-md border border-line p-1.5 hover:bg-surface-200">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-0 font-ui text-sm font-bold text-ink">{period.label}</span>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="Kỳ sau"
            className="cursor-pointer rounded-vds-md border border-line p-1.5 hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="cursor-pointer font-ui text-xs font-bold text-link hover:underline">
              {type === 'week' ? 'Tuần này' : 'Tháng này'}
            </button>
          )}
        </div>
      </header>

      {/* Số liệu chính */}
      <section className="grid grid-cols-2 border-y border-line md:grid-cols-4">
        {[
          { v: `${report.doneCount}/${report.taskCount}`, l: 'task có hạn trong kỳ đã xong', tone: 'text-ink' },
          {
            v: pct(report.onTimeRate),
            l: onTimeDelta === null ? 'đúng hạn' : `đúng hạn · ${onTimeDelta >= 0 ? '+' : ''}${Math.round(onTimeDelta * 100)} điểm so với kỳ trước`,
            tone: onTimeTone(report.onTimeRate),
          },
          { v: fmt(report.personDays), l: `ngày công · ${report.workingDays} ngày làm việc`, tone: 'text-ink' },
          { v: fmt(recoverable), l: 'ngày công có thể lấy lại', tone: 'text-ink' },
        ].map((f, i) => (
          <div key={i} className={`space-y-0.5 px-3 py-3 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line md:border-t-0 md:border-l' : ''} ${i === 0 ? 'pl-0' : ''}`}>
            <div className={`font-title text-2xl font-bold tabular-nums ${f.tone}`}>{f.v}</div>
            <div className="text-xs text-ink-lighter">{f.l}</div>
          </div>
        ))}
      </section>

      {/* Phân bổ công theo đánh giá */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-ui text-sm font-bold text-ink">Công theo đánh giá dòng việc</h2>
          <span className="text-[11px] text-subdued">{report.unclassifiedCount} task chưa gắn dự án, đã gom theo tiền tố tiêu đề hoặc folder</span>
        </div>
        <VerdictBar days={report.verdictDays} height="h-3" />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {VERDICTS.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5">
              <i className={`inline-block h-2.5 w-2.5 rounded-vds-sm ${VERDICT_BAR[v]}`} />
              <b className="font-ui text-ink">{VERDICT_LABEL[v]}</b>
              <span className="font-num text-ink-lighter">
                {fmt(report.verdictDays[v])} ngày · {totalVerdict ? Math.round((100 * report.verdictDays[v]) / totalVerdict) : 0}%
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Lớp xem */}
      <section className="space-y-4">
        <div className="flex border-b border-line-strong" role="tablist" aria-label="Lớp xem">
          {([
            ['members', `Theo thành viên (${report.members.length})`],
            ['projects', `Theo dự án (${report.projects.length})`],
          ] as [ViewMode, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={mode === k}
              onClick={() => setMode(k)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 font-ui text-sm font-bold transition-colors ${
                mode === k ? 'border-line-accent text-accent' : 'border-transparent text-ink-lighter hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {mode === 'members' ? (
              <div>
                <div className="hidden grid-cols-[minmax(0,1.2fr)_48px_64px_64px_minmax(0,1fr)_20px] gap-x-4 border-b border-line-strong pb-1.5 text-[11px] font-ui font-bold text-ink-lighter md:grid">
                  <span>Nhân sự</span>
                  <span className="text-right">Task</span>
                  <span className="text-right">Ngày công</span>
                  <span className="text-right">Đúng hạn</span>
                  <span>Đáng · Xem lại · Không đáng (ngày)</span>
                  <span />
                </div>
                {report.members.map((m) => <MemberBlock key={m.member.id} m={m} onOpen={onOpenTaskDetail} />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(['all', ...VERDICTS] as (Verdict | 'all')[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVerdictFilter(v)}
                      aria-pressed={verdictFilter === v}
                      className={`cursor-pointer rounded-vds-sm border px-2.5 py-1 font-ui text-xs font-bold transition-colors ${
                        verdictFilter === v ? 'border-line-strong bg-surface-200 text-ink' : 'border-line text-ink-lighter hover:text-ink'
                      }`}
                    >
                      {v === 'all' ? 'Tất cả' : VERDICT_LABEL[v]}
                    </button>
                  ))}
                </div>
                <div>
                  <StreamHeader firstLabel="Dự án / dòng việc" />
                  {projectList.map((s) => <StreamRow key={s.key} s={s} showPeople onOpen={onOpenTaskDetail} />)}
                  {projectList.length === 0 && <p className="py-6 text-center text-sm text-subdued">Không có dự án nào ở mức này.</p>}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Khuyến nghị */}
      {report.recommendations.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-ui text-sm font-bold text-ink">
            <TrendingUp className="h-4 w-4 text-accent" /> Việc nên xử lý
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {report.recommendations.map((r, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-ui font-bold text-ink">{r.title}</div>
                  <div className="text-xs text-ink-lighter">{r.owner} · {r.detail}</div>
                </div>
                <div className="text-right font-num text-xs text-ink-lighter">
                  {r.recoverableDays > 0 ? `~${fmt(r.recoverableDays)} ngày` : 'Cần quyết định'}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cách tính */}
      <details className="rounded-vds-md border border-line bg-surface-100 p-4 text-xs text-ink-lighter">
        <summary className="flex cursor-pointer items-center gap-1.5 font-ui font-bold text-ink">
          <Info className="h-4 w-4" /> Cách tính
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><b>Task trong kỳ:</b> task có hạn nằm trong kỳ. Đúng hạn tính theo thời điểm hoàn thành sau điều chỉnh (cho phép đóng bù).</li>
          <li><b>Ngày công:</b> mỗi ngày làm việc (đã trừ lễ, nghỉ phép) chia đều cho các task đang mở trong ngày, từ lúc "Đang làm" đến lúc bấm "Hoàn thành". Là ước tính, task nghẽn lâu có thể bị tính dư.</li>
          <li><b>Dòng việc:</b> gom theo dự án. Task ở Others hoặc folder được gom theo tiền tố tiêu đề ("Giải bóng rổ trẻ | …") hoặc tên folder.</li>
          <li><b>Đánh giá:</b> cộng điểm khi dự án chiến lược, có KPI, nhiều đầu ra (order, spec, publish, release). Trừ điểm khi chưa có dự án mà tốn ≥3 ngày, làm lại ≥40%, trễ ≥40%, điều phối ≥50%, báo cáo định kỳ, việc nhỏ chiếm trọn ngày, dự án quá hạn. Điểm ≥1: Đáng; ≤−2: Không đáng; còn lại: Xem lại.</li>
          <li>Không dùng API AI: toàn bộ phân tích chạy trên trình duyệt từ dữ liệu đã tải. Bấm từng dòng để xem lý do và danh sách task.</li>
        </ul>
      </details>
    </div>
  );
};

export default TeamPerformanceView;
