/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

/**
 * Giao diện sáng/tối theo VDS: đặt data-theme="dark" trên <html>, token màu tự đổi.
 * Mặc định Sáng. Lựa chọn lưu ở localStorage `wms_theme`; script trong index.html áp dụng trước khi vẽ trang.
 */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'wms_theme';
const EVENT = 'wms_theme_changed';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export const getThemePref = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'system' || v === 'dark' ? v : 'light';
  } catch {
    return 'light';
  }
};

const applyTheme = (pref: ThemePref) => {
  const dark = pref === 'dark' || (pref === 'system' && darkQuery().matches);
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
};

export const setThemePref = (pref: ThemePref) => {
  try {
    if (pref === 'light') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {}
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(EVENT));
};

/** Lựa chọn hiện tại + tự theo hệ điều hành khi đang ở chế độ "Theo hệ thống" */
export const useThemePref = (): [ThemePref, (p: ThemePref) => void] => {
  const [pref, setPref] = useState<ThemePref>(getThemePref);

  useEffect(() => {
    const sync = () => setPref(getThemePref());
    const mq = darkQuery();
    const onSystem = () => getThemePref() === 'system' && applyTheme('system');
    window.addEventListener(EVENT, sync);
    mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener(EVENT, sync);
      mq.removeEventListener('change', onSystem);
    };
  }, []);

  return [pref, setThemePref];
};
