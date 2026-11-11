/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gợi ý việc tiếp theo cho app WMS, dùng Claude Haiku.
 *
 * Địa chỉ: POST /api/suggest
 * Thân yêu cầu (JSON):
 *   { action: "suggest", username, credential, trigger: "created" | "completed",
 *     task: { id, title, assignee, projectId } }
 *   { action: "accept", username, credential, logId, title }
 * Xác thực: `credential` là chuỗi băm mật khẩu app đang giữ, đối chiếu với bảng `member_credentials`.
 * Biến môi trường (đặt trên Vercel, KHÔNG đưa vào repo):
 *   - ANTHROPIC_API_KEY          Khoá API Claude.
 *   - SUPABASE_SERVICE_ROLE_KEY  Service key của Supabase.
 *   - WMS_AI_MODEL               (tuỳ chọn) mặc định claude-haiku-5-5.
 *   - WMS_AI_DAILY_PER_USER      (tuỳ chọn) số lượt gợi ý mỗi người mỗi ngày, mặc định 30.
 *   - WMS_AI_DAILY_TOTAL         (tuỳ chọn) tổng lượt mỗi ngày, mặc định 300.
 * Tiết kiệm token: việc không thuộc dự án cụ thể thì trả rỗng, không gọi Claude; lời nhắc chỉ mang
 * dữ liệu cần thiết; tắt suy luận mở rộng; trần đầu ra thấp.
 * Bảng cần có: `ai_suggestion_log` (xem docs/sql/2026-11-claude-assist.sql). Thiếu bảng thì từ chối
 * phục vụ, vì không đếm được lượt dùng để giới hạn chi phí.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fold, isProductMember, vnToday } from './_wms/domain.js';
import { gatherNextContext, hasProjectContext } from './_wms/next.js';
import { SupabaseStore } from './_wms/store.js';
import {
  SUGGEST_SYSTEM_PROMPT,
  SuggestionSchema,
  buildSuggestPrompt,
  refineSuggestions,
  type RawSuggestion,
} from './_wms/suggest.js';

process.env.TZ = 'Asia/Ho_Chi_Minh';

const DEFAULT_SUPABASE_URL = 'https://hyhtykhfnyrrvydizwta.supabase.co';
const DEFAULT_MODEL = 'claude-haiku-5-5';
const MAX_BODY_BYTES = 8_000;

type Request = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('Thân yêu cầu quá lớn.');
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

const str = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const digest = (value: string) => createHash('sha256').update(value).digest();
const positiveInt = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Đối chiếu chuỗi băm mật khẩu app gửi lên với bản lưu trên Supabase, theo thời gian hằng. */
async function verifyMember(db: SupabaseClient, username: string, credential: string): Promise<boolean> {
  if (!/^[a-z0-9._-]{2,40}$/.test(username) || !/^[a-f0-9]{64}$/i.test(credential)) return false;
  const { data, error } = await db
    .from('member_credentials')
    .select('password_hash')
    .eq('username', username)
    .maybeSingle();
  const stored = String(data?.password_hash || '').trim().toLowerCase();
  // Bản lưu chưa băm (tài khoản cũ chưa đăng nhập lại) thì không chấp nhận.
  if (error || !/^[a-f0-9]{64}$/.test(stored)) return false;
  return timingSafeEqual(digest(stored), digest(credential.toLowerCase()));
}

/** Đầu ngày hôm nay theo giờ Việt Nam, dạng ISO. */
const vnDayStart = (now: Date) => `${vnToday(now)}T00:00:00+07:00`;

async function countToday(db: SupabaseClient, since: string, username?: string): Promise<number | null> {
  let q = db.from('ai_suggestion_log').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if (username) q = q.eq('username', username);
  const { count, error } = await q;
  return error ? null : count ?? 0;
}

async function askClaude(apiKey: string, model: string, prompt: string) {
  const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model,
    // Ba gợi ý ngắn chỉ cần khoảng 300 token: đặt trần thấp để một phản hồi lỗi không đốt token.
    max_tokens: 700,
    // Việc ngắn, cần phản hồi nhanh trong giao diện: tắt suy luận mở rộng, effort thấp.
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: zodOutputFormat(SuggestionSchema) },
    system: SUGGEST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw: RawSuggestion[] =
    response.stop_reason === 'refusal' || !response.parsed_output ? [] : response.parsed_output.suggestions;
  return { raw, usage: response.usage };
}

export default async function handler(req: Request, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Chỉ hỗ trợ POST.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !serviceKey) {
    const missing = [!apiKey ? 'ANTHROPIC_API_KEY' : '', !serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''].filter(Boolean);
    console.error(`[wms-suggest] Thiếu cấu hình: ${missing.join(', ')}.`);
    sendJson(res, 503, { error: `Gợi ý chưa được cấu hình: thiếu ${missing.join(', ')}.` });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = ((await readJsonBody(req)) || {}) as Record<string, unknown>;
  } catch {
    sendJson(res, 400, { error: 'JSON không hợp lệ.' });
    return;
  }

  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const username = str(body.username, 40).toLowerCase();

  if (!(await verifyMember(db, username, str(body.credential, 64)))) {
    sendJson(res, 401, { error: 'Phiên đăng nhập không hợp lệ. Đăng nhập lại WMS.' });
    return;
  }

  try {
    // Ghi nhận gợi ý được dùng, để đo tỷ lệ chấp nhận.
    if (body.action === 'accept') {
      const logId = str(body.logId, 80);
      const title = str(body.title, 200);
      const { data } = await db
        .from('ai_suggestion_log')
        .select('accepted_titles')
        .eq('id', logId)
        .eq('username', username)
        .maybeSingle();
      if (data && title) {
        const accepted = Array.isArray(data.accepted_titles) ? (data.accepted_titles as string[]) : [];
        if (!accepted.includes(title)) {
          await db.from('ai_suggestion_log').update({ accepted_titles: [...accepted, title] }).eq('id', logId);
        }
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    const task = (body.task || {}) as Record<string, unknown>;
    const title = str(task.title, 300);
    const assigneeName = str(task.assignee, 80);
    const trigger = body.trigger === 'completed' ? 'completed' : 'created';
    if (title.length < 3 || !assigneeName) {
      sendJson(res, 400, { error: 'Thiếu tiêu đề hoặc người phụ trách.' });
      return;
    }

    // Việc không gắn dự án cụ thể: không có mốc, thành viên hay checklist để dựa vào. Không gọi Claude.
    const projectId = str(task.projectId, 80);
    if (!hasProjectContext(projectId)) {
      sendJson(res, 200, { logId: '', suggestions: [] });
      return;
    }

    // Giới hạn lượt dùng để chặn chi phí: theo người và toàn hệ thống.
    const now = new Date();
    const since = vnDayStart(now);
    const [mine, total] = await Promise.all([countToday(db, since, username), countToday(db, since)]);
    if (mine === null || total === null) {
      console.error('[wms-suggest] Không đọc được bảng ai_suggestion_log. Chạy docs/sql/2026-11-claude-assist.sql.');
      sendJson(res, 503, { error: 'Gợi ý chưa được cấu hình: thiếu bảng ai_suggestion_log.' });
      return;
    }
    if (
      mine >= positiveInt(process.env.WMS_AI_DAILY_PER_USER, 30) ||
      total >= positiveInt(process.env.WMS_AI_DAILY_TOTAL, 300)
    ) {
      sendJson(res, 429, { error: 'Đã hết lượt gợi ý hôm nay.' });
      return;
    }

    const store = new SupabaseStore(url, serviceKey);
    const members = await store.members();
    const actor = members.find((m) => (m.username || '').toLowerCase() === username);
    const assignee = members.find((m) => fold(m.name) === fold(assigneeName));
    if (!actor || !isProductMember(actor) || !assignee) {
      sendJson(res, 400, { error: 'Không tìm thấy nhân sự.' });
      return;
    }

    const ctx = await gatherNextContext(
      store,
      { title, assignee: assignee.name, projectId, trigger, taskId: str(task.id, 80) || undefined },
      members,
      vnToday(now)
    );

    // Dự án không có mốc, thành viên hay checklist nào: gợi ý sẽ chỉ là đoán. Bỏ qua, không tốn token.
    if (!ctx.project || (!ctx.milestones.length && !ctx.teammates.length && !ctx.checklistPending)) {
      sendJson(res, 200, { logId: '', suggestions: [] });
      return;
    }

    const model = process.env.WMS_AI_MODEL || DEFAULT_MODEL;
    const { raw, usage } = await askClaude(apiKey, model, buildSuggestPrompt(ctx));
    const suggestions = refineSuggestions(raw, ctx);

    const logId = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: logErr } = await db.from('ai_suggestion_log').insert({
      id: logId,
      username,
      trigger,
      task_id: str(task.id, 80) || null,
      task_title: title,
      suggestions,
      accepted_titles: [],
      model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      created_at: now.toISOString(),
    });
    if (logErr) console.warn('[wms-suggest] Không ghi được nhật ký gợi ý:', logErr.message);

    sendJson(res, 200, { logId, suggestions });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      sendJson(res, 429, { error: 'Dịch vụ gợi ý đang quá tải. Thử lại sau.' });
    } else if (err instanceof Anthropic.AuthenticationError) {
      console.error('[wms-suggest] ANTHROPIC_API_KEY không hợp lệ.');
      sendJson(res, 503, { error: 'Gợi ý chưa được cấu hình đúng: khoá API không hợp lệ.' });
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[wms-suggest] Lỗi API Claude ${err.status}:`, err.message);
      sendJson(res, 502, { error: 'Không lấy được gợi ý.' });
    } else {
      console.error('[wms-suggest] Lỗi xử lý:', err);
      sendJson(res, 500, { error: 'Lỗi máy chủ.' });
    }
  }
}
