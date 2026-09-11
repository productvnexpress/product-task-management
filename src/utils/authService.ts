/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { wmsDataService } from '../services/wmsDataService';

export const DEFAULT_PRODUCT_PASSWORD = '@26022001!';
export const AUTH_USER_KEY = 'vne_auth_username_v1';
export const PASSWORDS_STORAGE_KEY = 'vne_user_passwords_v1';

/**
 * Lấy danh sách mật khẩu đã lưu từ localStorage
 */
export const getStoredPasswords = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Lỗi khi đọc mật khẩu từ localStorage:', err);
    return {};
  }
};

/**
 * Lấy mật khẩu hiệu lực của một username (nếu chưa đổi thì dùng mật khẩu mặc định)
 */
export const getUserPassword = (username: string): string => {
  const normalized = username.trim().toLowerCase();
  const passwords = getStoredPasswords();
  return passwords[normalized] || DEFAULT_PRODUCT_PASSWORD;
};

/**
 * Kiểm tra xem người dùng có thuộc nhóm Product không
 */
export const isProductMember = (member: MemberItem): boolean => {
  return member.group === 'Product' || member.department === 'Sản phẩm - Công nghệ';
};

/**
 * Xác thực đăng nhập cho tài khoản
 */
export const login = (
  usernameInput: string,
  passwordInput: string,
  members: MemberItem[]
): { success: boolean; user?: MemberItem; error?: string } => {
  const normalizedUser = usernameInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!normalizedUser) {
    return { success: false, error: 'Vui lòng nhập tên tài khoản (username).' };
  }
  if (!password) {
    return { success: false, error: 'Vui lòng nhập mật khẩu.' };
  }

  // Tìm nhân sự trong nhóm Product theo username hoặc email prefix hoặc id
  const user = members.find((m) => {
    if (!isProductMember(m)) return false;
    const u = (m.username || '').toLowerCase();
    const emailPrefix = (m.email || '').split('@')[0].toLowerCase();
    return u === normalizedUser || emailPrefix === normalizedUser || (m.id || '').toLowerCase() === normalizedUser;
  });

  if (!user) {
    return {
      success: false,
      error: `Tài khoản "${usernameInput}" không tồn tại hoặc không thuộc Ban Sản phẩm - Công nghệ.`,
    };
  }

  const effectivePassword = getUserPassword(user.username || normalizedUser);

  if (password !== effectivePassword) {
    return {
      success: false,
      error: 'Mật khẩu không chính xác. Mật khẩu mặc định ban đầu là @26022001!',
    };
  }

  // Lưu phiên đăng nhập
  const sessionUsername = user.username || normalizedUser;
  try {
    localStorage.setItem(AUTH_USER_KEY, sessionUsername);
  } catch (err) {
    console.error('Không thể lưu session:', err);
  }

  return { success: true, user };
};

/**
 * Lấy thông tin người dùng đang đăng nhập từ phiên hiện tại
 */
export const getCurrentAuthUser = (members: MemberItem[]): MemberItem | null => {
  try {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (!saved) return null;
    const normalized = saved.trim().toLowerCase();

    const user = members.find((m) => {
      if (!isProductMember(m)) return false;
      const u = (m.username || '').toLowerCase();
      const emailPrefix = (m.email || '').split('@')[0].toLowerCase();
      return u === normalized || emailPrefix === normalized || (m.id || '').toLowerCase() === normalized;
    });

    return user || null;
  } catch (err) {
    console.error('Lỗi khi đọc phiên đăng nhập:', err);
    return null;
  }
};

/**
 * Thay đổi mật khẩu người dùng
 */
export const changePassword = (
  username: string,
  currentPasswordInput: string,
  newPasswordInput: string
): { success: boolean; error?: string } => {
  const normalized = username.trim().toLowerCase();
  const currentPassword = currentPasswordInput.trim();
  const newPassword = newPasswordInput.trim();

  if (!currentPassword) {
    return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại.' };
  }
  if (!newPassword) {
    return { success: false, error: 'Vui lòng nhập mật khẩu mới.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }

  const expectedPassword = getUserPassword(normalized);
  if (currentPassword !== expectedPassword) {
    return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
  }

  if (newPassword === expectedPassword) {
    return { success: false, error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
  }

  try {
    const passwords = getStoredPasswords();
    passwords[normalized] = newPassword;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));

    // Đồng bộ mật khẩu mới lên Supabase
    wmsDataService.updatePassword(normalized, newPassword).catch((err) => {
      console.error('Không thể đồng bộ mật khẩu mới lên Supabase:', err);
    });

    return { success: true };
  } catch (err) {
    console.error('Lỗi khi lưu mật khẩu mới:', err);
    return { success: false, error: 'Không thể lưu mật khẩu. Vui lòng thử lại.' };
  }
};

/**
 * Đồng bộ mật khẩu từ Supabase về localStorage khi khởi động
 */
export const syncPasswordsFromSupabase = async (): Promise<void> => {
  try {
    const { data: creds } = await supabase
      .from('member_credentials')
      .select('username, password_hash');
    if (creds && creds.length > 0) {
      const passwords = getStoredPasswords();
      creds.forEach((c) => {
        if (c.username && c.password_hash) {
          passwords[c.username.toLowerCase()] = c.password_hash;
        }
      });
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
    }
  } catch (err) {
    console.warn('Không thể đồng bộ mật khẩu từ Supabase:', err);
  }
};

/**
 * Đăng xuất
 */
export const logout = (): void => {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (err) {
    console.error('Lỗi khi đăng xuất:', err);
  }
};
