/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Kiểm tra tiêu đề công việc chung chung (không rõ làm gì cụ thể).
 * Ví dụ bị cảnh báo: "Tối ưu", "Nâng cấp hệ thống", "Fix bug", "Review design", "Họp".
 * Ví dụ hợp lệ: "Tối ưu tốc độ tải trang chủ mobile dưới 2 giây".
 */

export interface TitleQualityResult {
  isVague: boolean;
  reason?: string;
  hint?: string;
}

export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Động từ mở đầu dễ gây mơ hồ nếu không kèm đối tượng cụ thể
const VAGUE_VERBS = [
  'toi uu', 'nang cap', 'cai thien', 'cai tien', 'xu ly', 'lam', 'lam viec', 'check', 'kiem tra',
  'review', 'hop', 'fix', 'sua', 'sua loi', 'update', 'cap nhat', 'ho tro', 'theo doi',
  'nghien cuu', 'trien khai', 'chuan bi', 'bao cao', 'tong hop', 'xem xet', 'xem', 'ra soat',
  'phoi hop', 'test', 'thu', 'hoan thien', 'dieu chinh', 'chinh sua', 'bo sung', 'trao doi',
  'lam ro', 'danh gia', 'thiet ke', 'phan tich', 'xay dung', 'viet', 'gui', 'follow', 'support',
];

// Từ chung chung không xác định được đối tượng
const GENERIC_WORDS = new Set([
  'he', 'thong', 'giao', 'dien', 'tinh', 'nang', 'bug', 'loi', 'web', 'app', 'trang', 'du', 'an',
  'san', 'pham', 'trai', 'nghiem', 'nguoi', 'dung', 'ui', 'ux', 'design', 'hieu', 'suat', 'toc',
  'do', 'noi', 'dung', 'van', 'de', 'cong', 'viec', 'task', 'phan', 'muc', 'chuc', 'cac', 'nhung',
  'mot', 'so', 'lai', 'them', 'chung', 'tong', 'the', 'toan', 'bo', 'cho', 'va', 've', 'cua', 'voi',
  'phia', 'ben', 'team', 'nhom', 'tai', 'lieu', 'file', 'data', 'du', 'lieu', 'so', 'lieu', 'it',
  'tiep', 'nua', 'xong', 'nay', 'kia', 'do', 'flow', 'luong', 'bao', 'cao', 'ke', 'hoach', 'plan',
]);

const HINT = 'Ghi rõ: làm gì + cho cái gì + kết quả. VD: "Tối ưu tốc độ tải trang chủ mobile dưới 2 giây".';

export function checkTitleQuality(rawTitle: string): TitleQualityResult {
  const title = rawTitle.trim();
  if (!title) return { isVague: false };

  const normalized = stripDiacritics(title.toLowerCase())
    .replace(/[^a-z0-9\s/%.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = normalized.split(' ').filter(Boolean);

  if (words.length <= 2) {
    return { isVague: true, reason: 'Tiêu đề quá ngắn, chưa rõ làm gì.', hint: HINT };
  }

  const verb = VAGUE_VERBS.filter((v) => normalized === v || normalized.startsWith(v + ' ')).sort(
    (a, b) => b.length - a.length
  )[0];

  if (verb) {
    const rest = normalized.slice(verb.length).trim().split(' ').filter(Boolean);
    const specific = rest.filter((w) => !GENERIC_WORDS.has(w) || /\d/.test(w));
    if (specific.length < 2) {
      return {
        isVague: true,
        reason: 'Tiêu đề chung chung, chưa nói rõ đối tượng cụ thể.',
        hint: HINT,
      };
    }
  }

  return { isVague: false };
}
