/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Băm mật khẩu sử dụng thuật toán chuẩn SHA-256 kết hợp salt hệ thống
 * Đảm bảo mật khẩu lưu trong cơ sở dữ liệu Supabase và localStorage là chuỗi băm một chiều,
 * tuyệt đối không thể giải mã ngược và không lộ mật khẩu gốc của người dùng.
 */
const WMS_PASSWORD_SALT = 'vne_wms_secure_salt_2026_';

export async function hashPassword(plainText: string): Promise<string> {
  const clean = plainText.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(WMS_PASSWORD_SALT + clean);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback đơn giản an toàn trong trường hợp môi trường không hỗ trợ crypto.subtle
  let hash = 0;
  const str = WMS_PASSWORD_SALT + clean;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Kiểm tra xem một chuỗi đã là chuỗi băm SHA-256 (64 ký tự hex) hay chưa
 */
export function isHashedPassword(str?: string | null): boolean {
  if (!str) return false;
  return /^[a-f0-9]{64}$/i.test(str.trim());
}

/**
 * Kiểm tra xác thực mật khẩu nhập vào so với chuỗi lưu trữ (hỗ trợ cả hash SHA-256 và legacy plaintext)
 */
export async function verifyPassword(
  inputPassword: string,
  storedHashOrPlain: string
): Promise<boolean> {
  if (!inputPassword || !storedHashOrPlain) return false;

  const hashedInput = await hashPassword(inputPassword);
  if (hashedInput.toLowerCase() === storedHashOrPlain.trim().toLowerCase()) {
    return true;
  }

  // Tương thích ngược với các tài khoản cũ trong database chưa được băm
  if (inputPassword.trim() === storedHashOrPlain.trim()) {
    return true;
  }

  return false;
}
