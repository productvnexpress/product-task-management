/**
 * Chạy connector Claude của WMS trên máy để thử trước khi deploy.
 *
 *   WMS_MCP_TOKENS="tienngoc:<token>" SUPABASE_SERVICE_ROLE_KEY="<key>" npx tsx scripts/mcp-dev-server.ts
 *
 * Rồi trỏ MCP Inspector hoặc curl tới http://localhost:3939/api/mcp
 */
import { createServer } from 'node:http';
import handler from '../api/mcp.js';

const port = Number(process.env.PORT || 3939);
process.env.WMS_APP_URL ||= 'https://product-task-management-qr39.vercel.app';

createServer((req, res) => {
  if (!(req.url || '').startsWith('/api/mcp')) {
    res.writeHead(404).end('Not found');
    return;
  }
  void handler(req, res);
}).listen(port, () => console.log(`WMS MCP: http://localhost:${port}/api/mcp`));
