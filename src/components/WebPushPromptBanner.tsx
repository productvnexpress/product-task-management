/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  isWebPushSupported,
  getWebPushPermission,
  detectClientPlatform,
  requestWebPushPermission,
  WebPushPermissionState,
} from '../utils/webPushNotifications';
import { BellRing, AlertTriangle, X, ChevronRight } from './vds/icons';

interface WebPushPromptBannerProps {
  onOpenNotifications: () => void;
}

const STORAGE_KEY_DISMISSED = 'vne_web_push_banner_dismissed_v1';

export const WebPushPromptBanner: React.FC<WebPushPromptBannerProps> = ({
  onOpenNotifications,
}) => {
  const [permission, setPermission] = useState<WebPushPermissionState>('granted');
  const [isDismissed, setIsDismissed] = useState(true);
  const [platform] = useState(() => detectClientPlatform());

  useEffect(() => {
    if (!isWebPushSupported()) return;

    const currentPerm = getWebPushPermission();
    setPermission(currentPerm);

    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    setIsDismissed(dismissed === 'true' || currentPerm === 'granted');
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  };

  const handleQuickEnable = async () => {
    const res = await requestWebPushPermission();
    setPermission(res);
    if (res === 'granted') {
      setIsDismissed(true);
    } else {
      onOpenNotifications();
    }
  };

  if (isDismissed || permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  const isDenied = permission === 'denied';

  return (
    <div
      className={`rounded-vds-lg px-3 py-2 flex items-center justify-between gap-3 text-xs font-ui transition border ${
        isDenied
          ? 'bg-surface-warning border-line text-warning'
          : 'bg-surface-100 border-line text-accent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isDenied ? (
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
        ) : (
          <BellRing className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
        <span className="truncate">
          {isDenied ? (
            <>
              <strong>{platform.browserLabel}</strong> đang tắt thông báo WMS. Hãy mở lại để không lỡ việc khẩn cấp.
            </>
          ) : (
            <>
              Bật thông báo trên <strong>{platform.browserLabel} ({platform.osLabel})</strong> để nhận việc tức thì.
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isDenied ? (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="px-2 py-0.5 rounded-vds-md bg-warning-solid text-on-color hover:bg-warning-solid font-semibold text-xs transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <span>Xem cách mở</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleQuickEnable}
            className="px-2 py-0.5 rounded-vds-md bg-accent-solid text-on-color hover:bg-accent-solid-hover font-semibold text-xs transition-colors cursor-pointer"
          >
            Bật ngay
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-subdued-lighter hover:text-ink-lighter hover:bg-black/5 rounded transition-colors cursor-pointer"
          title="Không nhắc lại"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
