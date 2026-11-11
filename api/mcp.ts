/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Connector Claude cho WMS: máy chủ MCP (Streamable HTTP, không trạng thái) chạy dạng Vercel Function.
 *
 * Địa chỉ: POST /api/mcp
 * Xác thực: `Authorization: Bearer <token>` hoặc `?token=<token>` (mỗi nhân sự một token).
 * Biến môi trường (đặt trên Vercel, KHÔNG đưa vào repo):
 *   - WMS_MCP_TOKENS            `username:token`, nhiều người cách nhau bằng dấu phẩy.
 *   - SUPABASE_SERVICE_ROLE_KEY  Service key của Supabase, chỉ dùng phía máy chủ.
 *   - SUPABASE_URL               (tuỳ chọn) mặc định dùng project của WMS.
 *   - WMS_APP_URL                (tuỳ chọn) địa chỉ app để tạo link mở công việc.
 * Hướng dẫn đầy đủ: docs/CLAUDE_CONNECTOR.md
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { extractToken, matchToken, parseTokens } from './_wms/auth.js';
import { SupabaseStore } from './_wms/store.js';
import { createWmsServer } from './_wms/tools.js';

// Nhật ký công việc hiển thị giờ theo múi giờ Việt Nam, giống app.
process.env.TZ = 'Asia/Ho_Chi_Minh';

const DEFAULT_SUPABASE_URL = 'https://hyhtykhfnyrrvydizwta.supabase.co';

type Request = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

const rpcError = (message: string) => ({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });

async function readJsonBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

export default async function handler(req: Request, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    // Máy chủ không trạng thái: không mở luồng SSE (GET) và không có phiên để huỷ (DELETE).
    sendJson(res, 405, rpcError('Chỉ hỗ trợ POST.'), { Allow: 'POST' });
    return;
  }

  const tokens = parseTokens(process.env.WMS_MCP_TOKENS);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!tokens.length || !serviceKey) {
    // Chỉ nêu tên biến, không lộ giá trị, để Admin biết cần sửa gì trên Vercel.
    const missing: string[] = [];
    if (!process.env.WMS_MCP_TOKENS) missing.push('WMS_MCP_TOKENS (chưa có)');
    else if (!tokens.length) missing.push('WMS_MCP_TOKENS (sai định dạng, cần username:token, token ≥ 32 ký tự)');
    if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (chưa có)');
    console.error(`[wms-mcp] Thiếu cấu hình: ${missing.join('; ')}.`);
    sendJson(res, 503, rpcError(`Connector chưa được cấu hình: ${missing.join('; ')}. Báo Admin WMS.`));
    return;
  }

  const username = matchToken(extractToken(req), tokens);
  if (!username) {
    sendJson(res, 401, rpcError('Token không hợp lệ.'), { 'WWW-Authenticate': 'Bearer realm="vnexpress-wms"' });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: 'JSON không hợp lệ.' }, id: null });
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const appUrl = process.env.WMS_APP_URL || `https://${Array.isArray(host) ? host[0] : host}`;

  const server = createWmsServer({
    store: new SupabaseStore(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL, serviceKey),
    actorUsername: username,
    appUrl,
  });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error('[wms-mcp] Lỗi xử lý yêu cầu MCP:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: 'Lỗi máy chủ.' }, id: null });
    }
  }
}
