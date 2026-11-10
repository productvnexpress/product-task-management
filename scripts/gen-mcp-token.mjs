#!/usr/bin/env node
/**
 * Sinh token cho connector Claude của WMS.
 * Dùng: node scripts/gen-mcp-token.mjs tienngoc huyanh
 * Dán dòng kết quả vào biến môi trường WMS_MCP_TOKENS trên Vercel. Không lưu token vào repo.
 */
import { randomBytes } from 'node:crypto';

const usernames = process.argv.slice(2).map((u) => u.trim().toLowerCase()).filter(Boolean);
if (!usernames.length) {
  console.error('Thiếu username. VD: node scripts/gen-mcp-token.mjs tienngoc huyanh');
  process.exit(1);
}

const entries = usernames.map((username) => ({ username, token: randomBytes(32).toString('base64url') }));
const app = process.env.WMS_APP_URL || 'https://product-task-management-qr39.vercel.app';

console.log('\nWMS_MCP_TOKENS (dán vào Vercel > Settings > Environment Variables):\n');
console.log(entries.map((e) => `${e.username}:${e.token}`).join(','));
console.log('\nURL connector gửi riêng cho từng người (dán vào claude.ai > Settings > Connectors):\n');
for (const e of entries) console.log(`${e.username}: ${app}/api/mcp?token=${e.token}`);
console.log('\nThêm người mới: nối thêm ",username:token" vào giá trị cũ rồi Redeploy.\n');
