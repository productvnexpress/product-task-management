/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemberItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { wmsDataService } from '../services/wmsDataService';
import { hashPassword, verifyPassword, isHashedPassword } from './cryptoUtils';

export const DEFAULT_PRODUCT_PASSWORD = '@26022001!';
export const AUTH_USER_KEY = 'vne_auth_username_v1';
export const PASSWORDS_STORAGE_KEY = 'vne_user_passwords_v2';
export const PASSWORD_STATUS_STORAGE_KEY = 'vne_user_password_status_v2';

/**
 * Cấu trúc bản ghi mật khẩu đã lưu trong localStorage
 */
export interface UserCredentialState {
  hash: string;
  isDefault: boolean;
}

/**
 * Đọc bảng ánh xạ thông tin mật khẩu từ localStorage
 */
export const getStoredCredentials = (): Record<string, UserCredentialState> => {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Lỗi khi đọc mật khẩu từ localStorage:', err);
    return {};
  }
};

/**
 * Lưu bảng ánh xạ thông tin mật khẩu vào localStorage
 */
export const saveStoredCredentials = (creds: Record<string, UserCredentialState>): void => {
  try {
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('Lỗi khi lưu credentials vào localStorage:', err);
  }
};

/**
 * Kiểm tra xem người dùng có đang sử dụng mật khẩu mặc định hay chưa đổi mật khẩu
 */
export const isUserUsingDefaultPassword = (username: string): boolean => {
  const normalized = username.trim().toLowerCase();
  const creds = getStoredCredentials();
  const userCred = creds[normalized];

  if (!userCred) {
    // Chưa có bản ghi đổi mật khẩu -> coi như vẫn dùng mật khẩu mặc định
    return true;
  }

  return Boolean(userCred.isDefault);
};

/**
 * Kiểm tra xem người dùng có thuộc nhóm Product không
 */
export const isProductMember = (member: MemberItem): boolean => {
  return member.group === 'Product' || member.department === 'Sản phẩm - Công nghệ';
};

/**
 * Xác thực đăng nhập cho tài khoản
 * - Băm mật khẩu nhập vào và so sánh an toàn
 * - Không để lộ thông tin mật khẩu mặc định trong thông báo lỗi
 * - Tự động phát hiện nếu tài khoản đang dùng mật khẩu mặc định để yêu cầu đổi
 */
export const login = async (
  usernameInput: string,
  passwordInput: string,
  members: MemberItem[]
): Promise<{ success: boolean; user?: MemberItem; mustChangePassword?: boolean; error?: string }> => {
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
      error: 'Tài khoản không tồn tại hoặc không thuộc Ban Sản phẩm - Công nghệ.',
    };
  }

  const effectiveUsername = (user.username || normalizedUser).toLowerCase();
  const creds = getStoredCredentials();
  let userCred = creds[effectiveUsername];

  // Nếu local chưa có, tra cứu Supabase
  if (!userCred) {
    try {
      const dbPassword = await wmsDataService.getStoredPassword(effectiveUsername);
      if (dbPassword) {
        userCred = {
          hash: dbPassword,
          isDefault: !isHashedPassword(dbPassword) || password === DEFAULT_PRODUCT_PASSWORD,
        };
        creds[effectiveUsername] = userCred;
        saveStoredCredentials(creds);
      }
    } catch {
      // Bỏ qua lỗi mạng
    }
  }

  // Mật khẩu dự phòng mặc định nếu tài khoản chưa từng tạo mật khẩu
  const expectedHashOrPlain = userCred?.hash || DEFAULT_PRODUCT_PASSWORD;
  const isMatch = await verifyPassword(password, expectedHashOrPlain);

  if (!isMatch) {
    return {
      success: false,
      error: 'Tên tài khoản hoặc mật khẩu không chính xác.',
    };
  }

  // Nếu mật khẩu trùng với mật khẩu mặc định hoặc bản ghi ghi nhận isDefault
  const isDefault =
    password === DEFAULT_PRODUCT_PASSWORD ||
    userCred?.isDefault === true ||
    userCred === undefined;

  // Tự động nâng cấp hash trong database nếu đang lưu dạng plaintext
  if (!isHashedPassword(userCred?.hash)) {
    try {
      const hashed = await hashPassword(password);
      await wmsDataService.updatePassword(effectiveUsername, hashed, isDefault);
      creds[effectiveUsername] = { hash: hashed, isDefault };
      saveStoredCredentials(creds);
    } catch (e) {
      console.warn('Lỗi auto-upgrade hash mật khẩu:', e);
    }
  }

  // Lưu phiên đăng nhập
  const sessionUsername = user.username || normalizedUser;
  try {
    localStorage.setItem(AUTH_USER_KEY, sessionUsername);
  } catch (err) {
    console.error('Không thể lưu session:', err);
  }

  return {
    success: true,
    user,
    mustChangePassword: isDefault,
  };
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
 * Thay đổi mật khẩu người dùng (tự đổi trong Profile cá nhân)
 */
export const changePassword = async (
  username: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; error?: string }> => {
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
  if (newPassword === DEFAULT_PRODUCT_PASSWORD) {
    return { success: false, error: 'Không được đặt lại mật khẩu mặc định ban đầu.' };
  }

  const creds = getStoredCredentials();
  const userCred = creds[normalized];
  const expectedHashOrPlain = userCred?.hash || DEFAULT_PRODUCT_PASSWORD;

  const isCurrentValid = await verifyPassword(currentPassword, expectedHashOrPlain);
  if (!isCurrentValid) {
    return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
  }

  if (newPassword === currentPassword) {
    return { success: false, error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
  }

  try {
    const hashedNew = await hashPassword(newPassword);
    creds[normalized] = {
      hash: hashedNew,
      isDefault: false,
    };
    saveStoredCredentials(creds);

    // Đồng bộ mật khẩu đã băm lên Supabase
    await wmsDataService.updatePassword(normalized, hashedNew, false);

    return { success: true };
  } catch (err) {
    console.error('Lỗi khi lưu mật khẩu mới:', err);
    return { success: false, error: 'Không thể lưu mật khẩu. Vui lòng thử lại.' };
  }
};

/**
 * Đổi mật khẩu bắt buộc ngay sau khi đăng nhập (Force Change Password)
 */
export const forceUpdatePassword = async (
  username: string,
  newPasswordInput: string
): Promise<{ success: boolean; error?: string }> => {
  const normalized = username.trim().toLowerCase();
  const newPassword = newPasswordInput.trim();

  if (!newPassword) {
    return { success: false, error: 'Vui lòng nhập mật khẩu mới.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }
  if (newPassword === DEFAULT_PRODUCT_PASSWORD) {
    return { success: false, error: 'Không được đặt lại mật khẩu mặc định ban đầu.' };
  }

  try {
    const hashedNew = await hashPassword(newPassword);
    const creds = getStoredCredentials();
    creds[normalized] = {
      hash: hashedNew,
      isDefault: false,
    };
    saveStoredCredentials(creds);

    // Cập nhật lên Supabase
    await wmsDataService.updatePassword(normalized, hashedNew, false);

    return { success: true };
  } catch (err) {
    console.error('Lỗi khi cập nhật mật khẩu bắt buộc:', err);
    return { success: false, error: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' };
  }
};

/**
 * Admin Reset mật khẩu của một tài khoản nhân sự
 * - resetType = 'default': đặt lại về mật khẩu mặc định và đánh dấu isDefault = true (bắt buộc đổi khi đăng nhập)
 * - resetType = 'custom': đặt mật khẩu tạm thời và đánh dấu isDefault = true
 */
export const adminResetPassword = async (
  username: string,
  resetType: 'default' | 'custom' = 'default',
  customPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const normalized = username.trim().toLowerCase();
  const passwordToSet =
    resetType === 'custom' && customPassword && customPassword.trim()
      ? customPassword.trim()
      : DEFAULT_PRODUCT_PASSWORD;

  if (passwordToSet.length < 6) {
    return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
  }

  try {
    const hashed = await hashPassword(passwordToSet);
    const creds = getStoredCredentials();
    creds[normalized] = {
      hash: hashed,
      isDefault: true, // Bắt buộc user đổi mật khẩu ở lần đăng nhập tiếp theo
    };
    saveStoredCredentials(creds);

    // Cập nhật lên Supabase
    await wmsDataService.updatePassword(normalized, hashed, true);

    const message =
      resetType === 'default'
        ? `Đã đặt lại mật khẩu mặc định cho @${normalized}. User sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.`
        : `Đã cập nhật mật khẩu mới cho @${normalized}. User sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.`;

    return { success: true, message };
  } catch (err: any) {
    console.error('Lỗi khi Admin reset mật khẩu:', err);
    return { success: false, error: err.message || 'Không thể reset mật khẩu.' };
  }
};

/**
 * Kiểm tra và tự động đăng xuất nếu tài khoản đang đăng nhập chưa đổi mật khẩu mặc định
 * Trả về true nếu đã đăng xuất
 */
export const checkAndLogoutIfDefaultPassword = (members: MemberItem[]): boolean => {
  const currentUser = getCurrentAuthUser(members);
  if (!currentUser) return false;

  const username = (currentUser.username || currentUser.id).toLowerCase();
  const isDefault = isUserUsingDefaultPassword(username);

  if (isDefault) {
    logout();
    return true;
  }

  return false;
};

/**
 * Đồng bộ mật khẩu và trạng thái từ Supabase về localStorage khi khởi động
 */
export const syncPasswordsFromSupabase = async (): Promise<void> => {
  try {
    const credsList = await wmsDataService.fetchMemberCredentials();
    if (credsList && credsList.length > 0) {
      const stored = getStoredCredentials();
      credsList.forEach((c) => {
        if (c.username) {
          const u = c.username.toLowerCase();
          const isDef =
            c.is_default_password !== undefined
              ? Boolean(c.is_default_password)
              : !isHashedPassword(c.password_hash);

          stored[u] = {
            hash: c.password_hash || stored[u]?.hash || '',
            isDefault: isDef,
          };
        }
      });
      saveStoredCredentials(stored);
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
