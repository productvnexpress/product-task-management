/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectChecklistItem } from '../types';
import { supabase } from '../services/supabaseClient';

export interface ChecklistPhaseMeta {
  id: number;
  title: string;
  shortTitle: string;
  badgeColor: string;
  itemCount: number;
}

export const CHECKLIST_PHASES: ChecklistPhaseMeta[] = [
  {
    id: 1,
    title: 'Giai đoạn 1 — Trước khi bắt đầu',
    shortTitle: 'Trước khi bắt đầu',
    badgeColor: 'bg-[#eef4fb] text-[#1d508d] border-[#c2d7f0]',
    itemCount: 7,
  },
  {
    id: 2,
    title: 'Giai đoạn 2 — Thiết kế & Chuyển giao',
    shortTitle: 'Thiết kế & Chuyển giao',
    badgeColor: 'bg-[#fcf0f5] text-[#b13460] border-[#f3c2d4]',
    itemCount: 7,
  },
  {
    id: 3,
    title: 'Giai đoạn 3 — Sản phẩm BETA',
    shortTitle: 'Sản phẩm BETA',
    badgeColor: 'bg-[#fef9e7] text-[#8f6b00] border-[#fde899]',
    itemCount: 8,
  },
  {
    id: 4,
    title: 'Giai đoạn 4 — Chuẩn bị Release',
    shortTitle: 'Chuẩn bị Release',
    badgeColor: 'bg-[#fff0f1] text-[#da1e28] border-[#ffd0d3]',
    itemCount: 8,
  },
  {
    id: 5,
    title: 'Giai đoạn 5 — Ra mắt',
    shortTitle: 'Ra mắt',
    badgeColor: 'bg-[#e2f6e9] text-[#24a148] border-[#b8e8c4]',
    itemCount: 4,
  },
];

export const RAW_CHECKLIST_DATA: { phaseId: number; phaseTitle: string; items: string[] }[] = [
  {
    phaseId: 1,
    phaseTitle: 'Giai đoạn 1 — Trước khi bắt đầu',
    items: [
      'Dự án giải quyết vấn đề thật nào của độc giả, và vì sao cần làm bây giờ?',
      'Nhóm độc giả nào được phục vụ — ưu tiên OV, DO hay cả hai?',
      'Chỉ số nào đo thành công, baseline hiện tại là bao nhiêu, và dự án phục vụ mục tiêu gì trong năm nay?',
      'Dự án có bao nhiêu giai đoạn và mốc dự kiến của từng giai đoạn là khi nào?',
      'Ai là Product Owner — người chịu trách nhiệm duy nhất về sản phẩm từ đầu đến cuối?',
      'Dự án đã được phê duyệt chưa — qua kênh nào (họp BBT, email, quyết định chính thức)?',
      'Kế hoạch triển khai chi tiết: ai làm gì, phụ thuộc vào ai, và rủi ro lớn nhất về thời gian là gì?',
    ],
  },
  {
    phaseId: 2,
    phaseTitle: 'Giai đoạn 2 — Thiết kế & Chuyển giao',
    items: [
      'Thiết kế đã đủ các màn hình, các trạng thái (empty, loading, error) và trên cả desktop lẫn mobile web/app chưa?',
      'Đã có tài liệu mô tả logic hoạt động chi tiết (INPUT - PROCESS - OUTPUT) cho từng luồng người dùng chưa?',
      'Vị trí quảng cáo đã được chốt chưa — ưu tiên trải nghiệm đọc hay tối ưu doanh thu ở từng zone?',
      'Đã có spec tracking chi tiết chưa: tracking event gì, trigger khi nào, đặt tên theo chuẩn ITM/ADP chưa?',
      'Các yêu cầu SEO đã được mô tả đầy đủ chưa: cấu trúc URL, thẻ meta, schema, canonical, sitemap?',
      'Dự án có phát sinh vấn đề gì về bản quyền, pháp lý, hoặc cần phối hợp với Ban Trị sự / Kế toán / Ban Nhân sự không?',
      'Dữ liệu đầu vào lấy từ đâu, có cần CMS / tool nhập liệu riêng cho Tòa soạn không?',
    ],
  },
  {
    phaseId: 3,
    phaseTitle: 'Giai đoạn 3 — Sản phẩm BETA',
    items: [
      'Đã có giải pháp nhập liệu/vận hành trên CMS Editor và App Editor cho Tòa soạn chưa?',
      'Với tính năng/chuyên trang mới: đã xin ý kiến và thống nhất với Tổng thư ký tòa soạn về vị trí hiển thị trên Trang chủ chưa?',
      'Đã cấu hình đầy đủ menu, folder, widget trên cả desktop và mobile web chưa?',
      'Trên mobile app: đã cấu hình app push, category ID và deep link tương ứng chưa?',
      'Đã kiểm thử trên môi trường staging/beta với các trình duyệt chính (Chrome, Safari) và các thiết bị thực tế (iPhone, Android) chưa?',
      'Tốc độ tải trang có đạt chuẩn Core Web Vitals không (LCP < 2.5s, CLS < 0.1, INP < 200ms)?',
      'Tracking đã hoạt động chính xác trên staging chưa — số liệu có đổ về đúng data stream và đúng định dạng không?',
      'Đã có kế hoạch rollback nếu tính năng gặp sự cố nghiêm trọng sau khi release chưa?',
    ],
  },
  {
    phaseId: 4,
    phaseTitle: 'Giai đoạn 4 — Chuẩn bị Release',
    items: [
      'Ngày giờ release đã được ấn định chưa, và toàn bộ các bên (Tech, Tòa soạn, QC) đã xác nhận sẵn sàng chưa?',
      'Thời gian test sau release đã được dự trù bao lâu, ai là người trực tiếp kiểm tra và nghiệm thu?',
      'Tuyệt đối không release vào cuối tuần hoặc sau 15:00 các ngày trong tuần — lịch release đã tuân thủ quy tắc này chưa?',
      'Đã có form tiếp nhận phản hồi / báo lỗi từ Tòa soạn và độc giả sau khi ra mắt chưa?',
      'Product Owner đã duyệt lần cuối (sign-off) trên môi trường beta/staging chưa?',
      'Đã gửi thông báo kế hoạch release đến các bên liên quan: BBT, BLĐ, Ban Trị sự, Thư ký Tòa soạn, Đội Vận hành SD?',
      'Đã chuẩn bị tài liệu giới thiệu tính năng: ảnh chụp màn hình, bài viết giới thiệu (nếu cần), cập nhật What\'s New trên App Store / Google Play chưa?',
      'Các dashboard đo lường (VnExpress Analytics / PowerBI / SIS) đã sẵn sàng hiển thị số liệu ngay sau khi go-live chưa?',
    ],
  },
  {
    phaseId: 5,
    phaseTitle: 'Giai đoạn 5 — Ra mắt',
    items: [
      'Đã có thông báo / bài viết / banner giới thiệu tính năng mới đến độc giả chưa?',
      'Trong 48 giờ đầu sau go-live: đã theo dõi dữ liệu real-time về lượng truy cập, lỗi (error rate), và phản hồi từ Tòa soạn chưa?',
      'Đã có lịch báo cáo hiệu quả định kỳ: sau 3 ngày, sau 1 tuần, sau 1 tháng chưa?',
      'Đã tổ chức họp / gửi email đánh giá rút kinh nghiệm (Post-mortem / Retrospective) với team dự án chưa?',
    ],
  },
];

export interface ChecklistTemplateItem {
  id: string;
  phaseId: number;
  phaseTitle: string;
  text: string;
}

export const CHECKLIST_TEMPLATE_STORAGE_KEY = 'wms_master_checklist_template';

/**
 * Sinh danh sách 34 tiêu chuẩn mẫu ban đầu
 */
export function getInitialMasterChecklistTemplate(): ChecklistTemplateItem[] {
  let counter = 1;
  const list: ChecklistTemplateItem[] = [];

  RAW_CHECKLIST_DATA.forEach((phase) => {
    phase.items.forEach((text) => {
      list.push({
        id: `chk-${phase.phaseId}-${counter++}`,
        phaseId: phase.phaseId,
        phaseTitle: phase.phaseTitle,
        text,
      });
    });
  });

  return list;
}

/**
 * Lấy Master Checklist Template từ LocalStorage (hoặc fallback về 34 tiêu chuẩn mẫu ban đầu)
 */
export function getMasterChecklistTemplate(): ChecklistTemplateItem[] {
  try {
    const raw = localStorage.getItem(CHECKLIST_TEMPLATE_STORAGE_KEY);
    if (!raw) return getInitialMasterChecklistTemplate();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((item, idx) => ({
          id: item.id ? String(item.id) : `chk-${item.phaseId || 1}-${idx + 1}`,
          phaseId: Number(item.phaseId) || 1,
          phaseTitle:
            item.phaseTitle ||
            CHECKLIST_PHASES.find((p) => p.id === Number(item.phaseId))?.title ||
            `Giai đoạn ${item.phaseId || 1}`,
          text: String(item.text || '').trim(),
        }))
        .filter((item) => item.text);
    }
  } catch (err) {
    console.warn('Lỗi khi đọc master checklist template:', err);
  }
  return getInitialMasterChecklistTemplate();
}

/**
 * Tải Master Checklist Template từ Supabase (bảng system_settings, key = 'master_checklist_template')
 */
export async function fetchMasterChecklistTemplateFromSupabase(): Promise<ChecklistTemplateItem[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_checklist_template')
      .maybeSingle();

    if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
      const items: ChecklistTemplateItem[] = data.value
        .map((item: any, idx: number) => ({
          id: item.id ? String(item.id) : `chk-${item.phaseId || 1}-${idx + 1}`,
          phaseId: Number(item.phaseId) || 1,
          phaseTitle:
            item.phaseTitle ||
            CHECKLIST_PHASES.find((p) => p.id === Number(item.phaseId))?.title ||
            `Giai đoạn ${item.phaseId || 1}`,
          text: String(item.text || '').trim(),
        }))
        .filter((item: any) => item.text);

      if (items.length > 0) {
        localStorage.setItem(CHECKLIST_TEMPLATE_STORAGE_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('wms_checklist_template_updated'));
        return items;
      }
    } else if (!error && (!data || !data.value)) {
      // Nếu DB chưa có bản ghi, đẩy danh mục hiện tại lên
      const current = getMasterChecklistTemplate();
      saveMasterChecklistTemplateToSupabase(current).catch(() => {});
    }
  } catch (err) {
    console.warn('[defaultProjectChecklist] fetchMasterChecklistTemplateFromSupabase error:', err);
  }
  return getMasterChecklistTemplate();
}

/**
 * Lưu Master Checklist Template lên Supabase (bảng system_settings)
 */
export async function saveMasterChecklistTemplateToSupabase(
  items: ChecklistTemplateItem[],
  updatedBy?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'master_checklist_template',
      value: items,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    }, { onConflict: 'key' });

    if (error) {
      console.warn('[defaultProjectChecklist] Không thể lưu checklist template lên Supabase (bảng system_settings có thể chưa tạo):', error);
    }
  } catch (err) {
    console.warn('[defaultProjectChecklist] Lỗi ghi checklist template lên Supabase:', err);
  }
}

/**
 * Lưu Master Checklist Template vào LocalStorage và đồng bộ lên Supabase
 */
export function saveMasterChecklistTemplate(items: ChecklistTemplateItem[], updatedBy?: string): void {
  try {
    localStorage.setItem(CHECKLIST_TEMPLATE_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('wms_checklist_template_updated'));
    saveMasterChecklistTemplateToSupabase(items, updatedBy).catch(() => {});
  } catch (err) {
    console.error('Lỗi khi lưu master checklist template:', err);
  }
}

/**
 * Khôi phục Master Checklist Template về 34 tiêu chuẩn gốc và đồng bộ lên Supabase
 */
export function resetMasterChecklistTemplate(updatedBy?: string): ChecklistTemplateItem[] {
  const defaults = getInitialMasterChecklistTemplate();
  saveMasterChecklistTemplate(defaults, updatedBy);
  return defaults;
}

/**
 * Sinh danh sách tiêu chuẩn checklist mặc định cho dự án mới từ Master Template
 */
export function createDefaultProjectChecklist(): ProjectChecklistItem[] {
  const template = getMasterChecklistTemplate();
  return template.map((item) => ({
    id: item.id,
    phaseId: item.phaseId,
    phaseTitle: item.phaseTitle,
    text: item.text,
    status: 'pending',
  }));
}

/**
 * Hợp nhất checklist hiện có với bộ sườn 34 tiêu chuẩn chuẩn hóa.
 * Đảm bảo dự án luôn có đủ 34 tiêu chuẩn theo thứ tự chuẩn,
 * bảo toàn trạng thái (completed/skipped) nếu đã được đánh dấu trước đó.
 * An toàn tuyệt đối trước mọi định dạng (chuỗi JSON, object, null, undefined).
 */
export function normalizeProjectChecklist(existing?: any): ProjectChecklistItem[] {
  const defaults = createDefaultProjectChecklist();
  if (!existing) {
    return defaults;
  }

  let rawList = existing;
  if (typeof rawList === 'string') {
    try {
      rawList = JSON.parse(rawList);
    } catch {
      return defaults;
    }
  }

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return defaults;
  }

  const existingMap = new Map<string, any>();
  rawList.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (item.id) {
      existingMap.set(String(item.id), item);
    }
    if (item.text && typeof item.text === 'string' && item.text.trim()) {
      existingMap.set(item.text.trim(), item);
    }
  });

  return defaults.map((dItem) => {
    const matched = existingMap.get(dItem.id) || (dItem.text ? existingMap.get(dItem.text.trim()) : undefined);
    if (matched) {
      return {
        ...dItem,
        status: matched.status === 'completed' || matched.status === 'skipped' ? matched.status : 'pending',
        completedAt: matched.completedAt || undefined,
        completedBy: matched.completedBy || undefined,
        note: matched.note || undefined,
      };
    }
    return dItem;
  });
}

/**
 * Tính toán số liệu tổng hợp checklist của dự án
 */
export function calculateChecklistStats(checklist?: any) {
  const list = normalizeProjectChecklist(checklist);
  const total = list.length;
  const completed = list.filter((i) => i.status === 'completed').length;
  const skipped = list.filter((i) => i.status === 'skipped').length;
  const pending = list.filter((i) => i.status === 'pending').length;
  const effectiveTotal = Math.max(1, total - skipped);
  const percent = Math.round((completed / effectiveTotal) * 100);

  return {
    total,
    completed,
    skipped,
    pending,
    percent: Math.min(100, Math.max(0, percent || 0)),
    list,
  };
}
