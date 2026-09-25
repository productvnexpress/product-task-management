/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Kiểm tra xem một chuỗi có phải là đường dẫn URL hợp lệ hay không.
 * Chấp nhận:
 * - URL có protocol: https://figma.com/..., http://localhost:3000, http://192.168.1.1/...
 * - URL không có protocol nhưng là domain/path hợp lệ: figma.com/..., vnexpress.net, docs.google.com/...
 * Từ chối:
 * - Chuỗi rỗng, khoảng trắng, chuỗi có dấu cách: "xong roi", "da lam", "link o day"
 * - Chuỗi vô nghĩa không có domain hợp lệ: "done", "test", "abc", "123", "http://", "https://"
 * - Tên miền không có đuôi TLD hợp lệ (ít nhất 2 ký tự: .com, .vn, .net, .org, .internal, .io...)
 */
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // URL không được chứa khoảng trắng hoặc ký tự xuống dòng
  if (/[\s\r\n]/.test(trimmed)) return false;

  // Chuẩn bị URL để parse qua URL API
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);

    // Giao thức bắt buộc là http hoặc https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return false;

    // Chấp nhận localhost
    if (hostname === 'localhost') return true;

    // Kiểm tra IP address hợp lệ (ví dụ: 192.168.1.1, 10.0.0.1)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      // Đảm bảo phần host trong input ban đầu cũng có dạng IP 4 cụm, tránh trường hợp số nguyên đơn lẻ (như 12345)
      const rawHost = withProtocol.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
      if (!ipv4Regex.test(rawHost)) return false;

      const parts = hostname.split('.').map(Number);
      return parts.every((p) => p >= 0 && p <= 255);
    }

    // Hostname phải có ít nhất 1 dấu chấm
    if (!hostname.includes('.')) return false;

    // Phải tuân theo quy chuẩn Domain Name:
    // Các phần cách nhau bởi dấu chấm, không bắt đầu/kết thúc bằng dấu gạch ngang,
    // và TLD (phần cuối) phải có ít nhất 2 ký tự chữ cái (hoặc punycode xn--)
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

    return domainRegex.test(hostname);
  } catch {
    return false;
  }
};

/**
 * Chuẩn hóa URL để lưu vào hệ thống và gắn thẻ <a>:
 * Tự động thêm tiền tố 'https://' nếu người dùng nhập domain mà không có protocol.
 */
export const normalizeUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Kiểm tra và trả về thông báo lỗi ngắn gọn theo chuẩn EDITOR.md
 */
export const validateResultLink = (
  url: string | null | undefined
): { isValid: boolean; error?: string; normalizedUrl?: string } => {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Chưa nhập link hoàn thành.',
    };
  }

  if (!isValidUrl(trimmed)) {
    return {
      isValid: false,
      error: 'Link không đúng định dạng URL (ví dụ: https://figma.com/..., vnexpress.net/...).',
    };
  }

  return {
    isValid: true,
    normalizedUrl: normalizeUrl(trimmed),
  };
};
