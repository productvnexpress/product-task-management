/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/** Token ngắn hơn mức này bị từ chối khi nạp cấu hình (tránh token đoán được). */
export const MIN_TOKEN_LENGTH = 32;

export interface TokenEntry {
  username: string;
  token: string;
}

/**
 * Đọc biến môi trường WMS_MCP_TOKENS.
 * Định dạng: `username:token`, nhiều người cách nhau bằng dấu phẩy hoặc xuống dòng.
 * VD: `tienngoc:4f9c…,huyanh:a81e…`
 */
export function parseTokens(raw: string | undefined): TokenEntry[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx <= 0) return null;
      return {
        username: part.slice(0, idx).trim().toLowerCase(),
        token: part.slice(idx + 1).trim(),
      };
    })
    .filter((e): e is TokenEntry => Boolean(e && e.username && e.token.length >= MIN_TOKEN_LENGTH));
}

/** Lấy token từ header `Authorization: Bearer …` hoặc tham số `?token=…` trên URL. */
export function extractToken(req: IncomingMessage): string {
  const header = req.headers.authorization;
  if (typeof header === 'string') {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return (url.searchParams.get('token') || '').trim();
  } catch {
    return '';
  }
}

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * So khớp token theo thời gian hằng (không lộ thông tin qua độ trễ).
 * Trả về username của chủ token, hoặc null nếu không khớp.
 */
export function matchToken(token: string, entries: TokenEntry[]): string | null {
  if (!token) return null;
  const given = digest(token);
  let matched: string | null = null;
  for (const entry of entries) {
    if (timingSafeEqual(given, digest(entry.token))) matched = entry.username;
  }
  return matched;
}
