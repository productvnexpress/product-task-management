import { createClient } from '@supabase/supabase-js';
import { INITIAL_MEMBERS, INITIAL_PROJECTS, INITIAL_TASKS } from '../src/data/initialData';

const SUPABASE_URL = 'https://hyhtykhfnyrrvydizwta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aHR5a2hmbnlycnZ5ZGl6d3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Mzk5ODYsImV4cCI6MjEwNDMxNTk4Nn0.58KeAN-L1zkMD-gW-RJDe9akhMQgW8s5xeQbPJdZNcA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  const parts = s.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

async function runSeed() {
  console.log('🚀 Bắt đầu đồng bộ dữ liệu vào Supabase...');

  // 1. Members
  console.log(`1. Đang nạp ${INITIAL_MEMBERS.length} nhân sự...`);
  const memberRows = INITIAL_MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    salutation: m.salutation || null,
    last_name: m.lastName || null,
    first_name: m.firstName || null,
    username: m.username || m.id,
    region: m.region || 'Hà Nội',
    department: m.department || 'Sản phẩm - Công nghệ',
    group_type: m.group || (m.department === 'Sản phẩm - Công nghệ' ? 'Product' : 'Stakeholder'),
    team: m.team,
    title: m.title,
    ip_phone: m.ipPhone || null,
    email: m.email,
    gmail: m.gmail || null,
    join_date: parseDateToIso(m.joinDate),
    status: m.status || 'Sẵn sàng',
  }));

  for (let i = 0; i < memberRows.length; i += 20) {
    const batch = memberRows.slice(i, i + 20);
    const { error } = await supabase.from('members').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Lỗi khi nạp members batch:', error);
    }
  }

  // 2. Member credentials (cho nhóm Product)
  console.log('2. Đang nạp tài khoản đăng nhập (mật khẩu mặc định @26022001!)...');
  const productMembers = memberRows.filter((m) => m.group_type === 'Product' && m.username);
  const credRows = productMembers.map((m) => ({
    username: m.username,
    password_hash: '@26022001!',
    is_default_password: true,
  }));
  const { error: credErr } = await supabase.from('member_credentials').upsert(credRows, { onConflict: 'username' });
  if (credErr) console.error('Lỗi khi nạp member_credentials:', credErr);

  // 3. Projects, Phases, Notes, Logs
  console.log(`3. Đang nạp ${INITIAL_PROJECTS.length} dự án, giai đoạn và lịch sử...`);
  for (const p of INITIAL_PROJECTS) {
    const projectRow = {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description || null,
      objective: p.objective || null,
      product_owner: p.productOwner || null,
      lead_name: p.leadName || null,
      start_date: parseDateToIso(p.startDate),
      target_date: parseDateToIso(p.targetDate) || '2026-12-31',
      status: p.status,
      roles: p.roles || { pm: [], designer: [], seo: [], data: [] },
      link_order_tech: p.linkOrderTech || p.links?.orderTech || null,
      link_chat: p.linkChat || p.links?.chat || null,
      link_dashboard: p.linkDashboard || p.links?.dashboard || null,
      link_report: p.linkReport || p.links?.report || null,
      link_beta: p.linkBeta || p.links?.beta || null,
      link_production: p.linkProduction || p.links?.production || null,
      custom_links: p.customLinks || p.links?.custom || [],
      created_by: p.createdBy || 'Trần Huy Anh',
    };

    const { error: projErr } = await supabase.from('projects').upsert(projectRow, { onConflict: 'id' });
    if (projErr) {
      console.error(`Lỗi nạp dự án ${p.id}:`, projErr);
      continue;
    }

    // Phases
    if (p.phases && p.phases.length > 0) {
      const phaseRows = p.phases.map((ph, idx) => ({
        id: ph.id,
        project_id: p.id,
        name: ph.name,
        due_date: parseDateToIso(ph.dueDate),
        status: ph.status,
        description: ph.description || null,
        sort_order: idx + 1,
      }));
      const { error: phErr } = await supabase.from('project_phases').upsert(phaseRows, { onConflict: 'id' });
      if (phErr) console.error(`Lỗi nạp phases của ${p.id}:`, phErr);
    }

    // Notes
    if (p.notes && p.notes.length > 0) {
      const noteRows = p.notes.map((n) => ({
        id: n.id,
        project_id: p.id,
        author: n.author,
        content: n.content,
        created_at: n.createdAt || new Date().toISOString(),
      }));
      const { error: noteErr } = await supabase.from('project_notes').upsert(noteRows, { onConflict: 'id' });
      if (noteErr) console.error(`Lỗi nạp notes của ${p.id}:`, noteErr);
    }

    // History Logs
    if (p.history && p.history.length > 0) {
      const histRows = p.history.map((h) => ({
        id: h.id,
        project_id: p.id,
        author: h.author,
        action: h.action,
        changes: h.changes || [],
        note: h.note || null,
        created_at: h.timestamp || new Date().toISOString(),
      }));
      const { error: histErr } = await supabase.from('project_logs').upsert(histRows, { onConflict: 'id' });
      if (histErr) console.error(`Lỗi nạp logs của ${p.id}:`, histErr);
    }
  }

  // 4. Tasks & Task Logs
  console.log(`4. Đang nạp ${INITIAL_TASKS.length} công việc và lịch sử thay đổi...`);
  for (const t of INITIAL_TASKS) {
    const taskRow = {
      id: t.id,
      title: t.title,
      project_id: t.projectId,
      project_name: t.projectName,
      phase_id: t.phaseId || null,
      phase_name: t.phaseName || null,
      team: t.team,
      assignee: t.assignee,
      product_owners: t.productOwners || [],
      status: t.status,
      priority: t.priority,
      due_date: parseDateToIso(t.dueDate) || '2026-12-31',
      progress: t.progress ?? (t.status === 'Hoàn thành' ? 100 : 0),
      details: t.details || null,
      blocker_reason: t.blockerReason || null,
      work_link: t.workLink || null,
      result_link: t.resultLink || null,
      latest_update_note: t.latestUpdateNote || null,
      created_by: t.createdBy || t.assignee || 'Trần Huy Anh',
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString(),
    };

    const { error: taskErr } = await supabase.from('tasks').upsert(taskRow, { onConflict: 'id' });
    if (taskErr) {
      console.error(`Lỗi nạp task ${t.id}:`, taskErr);
      continue;
    }

    // Task Logs
    if (t.logs && t.logs.length > 0) {
      const taskLogRows = t.logs.map((l) => ({
        id: l.id,
        task_id: t.id,
        author: l.author,
        action: l.action,
        changes: l.changes || [],
        note: l.note || null,
        created_at: l.timestamp || new Date().toISOString(),
      }));
      const { error: tlErr } = await supabase.from('task_logs').upsert(taskLogRows, { onConflict: 'id' });
      if (tlErr) console.error(`Lỗi nạp logs của task ${t.id}:`, tlErr);
    }
  }

  console.log('✅ Hoàn tất đồng bộ dữ liệu vào Supabase!');
}

runSeed().catch(console.error);
