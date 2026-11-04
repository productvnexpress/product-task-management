/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  detectClientPlatform,
  getPersonalizedNotificationGuide,
  WebPushPermissionState,
  requestWebPushPermission,
  sendTestWebPushNotification,
  setWebPushEnabledByUser,
  getWebPushPermission,
} from '../utils/webPushNotifications';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Laptop,
} from './vds/icons';

interface PersonalizedWebPushCardProps {
  permission: WebPushPermissionState;
  isEnabled: boolean;
  onPermissionChange: (perm: WebPushPermissionState) => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export const PersonalizedWebPushCard: React.FC<PersonalizedWebPushCardProps> = ({
  permission,
  isEnabled,
  onPermissionChange,
  onToggleEnabled,
}) => {
  const [platform] = useState(() => detectClientPlatform());
  const [isExpanded, setIsExpanded] = useState(permission === 'denied');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const guide = getPersonalizedNotificationGuide(platform, permission);

  const handleRequest = async () => {
    setIsRequesting(true);
    const result = await requestWebPushPermission();
    setIsRequesting(false);
    onPermissionChange(result);
    if (result === 'granted') {
      setTestStatus('✓ Đã bật thông báo thành công!');
      setTimeout(() => setTestStatus(null), 4000);
      sendTestWebPushNotification();
    }
  };

  const handleRecheck = () => {
    const currentPerm = getWebPushPermission();
    onPermissionChange(currentPerm);
    if (currentPerm === 'granted') {
      setTestStatus('✓ Quyền thông báo đã được mở!');
      setTimeout(() => setTestStatus(null), 4000);
    } else {
      setTestStatus('Trình duyệt vẫn đang chặn. Vui lòng làm theo các bước bên dưới.');
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const handleTest = async () => {
    setTestStatus('Đang gửi thông báo...');
    const result = await sendTestWebPushNotification();
    if (result.success) {
      setTestStatus('✓ Đã phát thông báo thử nghiệm!');
    } else {
      setTestStatus(result.reason || 'Chưa gửi được');
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  // --- 1. ĐÃ CẤP QUYỀN (GRANTED) ---
  if (permission === 'granted') {
    return (
      <div className="border-b border-line bg-surface-100 text-xs">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-positive-solid animate-pulse' : 'bg-icon-subdued'}`} />
            <span className="font-ui text-xs font-medium text-ink-lighter truncate">
              Thông báo {platform.browserLabel}:{' '}
              <strong className={isEnabled ? 'text-positive' : 'text-subdued'}>
                {isEnabled ? 'Đang bật' : 'Đã tắt'}
              </strong>
            </span>
            {testStatus && (
              <span className="text-xs font-ui font-semibold text-positive animate-fade-in hidden sm:inline">
                {testStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEnabled && (
              <button
                type="button"
                onClick={handleTest}
                className="px-2.5 py-1 text-xs font-ui text-support bg-surface border border-line hover:bg-surface-200 rounded-vds-md font-medium transition-colors cursor-pointer flex items-center gap-1 "
                title="Gửi 1 thông báo thử nghiệm ra màn hình desktop"
              >
                <Send className="w-2.5 h-2.5" />
                <span>Thử thông báo</span>
              </button>
            )}
            <label
              className="relative inline-flex items-center cursor-pointer"
              title={isEnabled ? 'Tắt thông báo Web Push' : 'Bật thông báo Web Push'}
            >
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onToggleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-line after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition peer-checked:bg-accent-solid" />
            </label>
          </div>
        </div>

        {guide.osTip && (
          <div className="px-4 py-2 bg-surface-100 border-t border-divider text-xs font-ui text-subdued leading-relaxed">
            <div className="flex items-start gap-1.5">
              <span className="text-warning font-bold shrink-0">💡</span>
              <span>{guide.osTip}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 2. BỊ CHẶN (DENIED) ---
  if (permission === 'denied') {
    return (
      <div className="border-b border-line bg-surface-warning text-xs">
        <div className="p-3.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-surface-negative text-negative border border-line flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-title font-bold text-negative text-xs flex items-center gap-1.5">
                <span>{guide.title}</span>
                <span className="text-[10px] font-ui px-1.5 py-0.2 rounded bg-negative-solid text-on-color font-semibold">
                  Bị chặn
                </span>
              </div>
              <p className="text-xs font-ui text-negative mt-0.5 leading-relaxed">
                {guide.summary}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecheck}
            className="px-2.5 py-1.5 rounded-vds-lg bg-surface border border-line text-negative hover:bg-surface-negative font-ui font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            title="Kiểm tra lại sau khi đã cấp quyền"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Kiểm tra lại</span>
          </button>
        </div>

        {/* Các bước mở khóa cụ thể theo trình duyệt */}
        <div className="px-4 pb-3 pt-1 border-t border-line bg-surface-warning space-y-1.5">
          <div className="text-xs font-ui font-semibold text-warning">
            Các bước mở khóa trên {platform.browserLabel}:
          </div>
          <ol className="text-xs font-ui text-warning space-y-1 pl-4 list-decimal leading-relaxed">
            {guide.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {guide.osTip && (
            <div className="mt-2 pt-2 border-t border-line text-xs font-ui text-warning flex items-start gap-1.5">
              <span className="font-bold shrink-0">💡</span>
              <span>{guide.osTip}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 3. CHƯA BẬT (DEFAULT) ---
  return (
    <div className="border-b border-line bg-surface-accent-faint text-xs">
      <div className="p-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-accent-solid/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-title font-bold text-accent text-xs flex items-center gap-1.5">
              <span>{guide.title}</span>
              <span className="text-[10px] font-ui px-1.5 py-0.2 rounded bg-accent-solid text-on-color font-semibold">
                Đề xuất
              </span>
            </div>
            <p className="text-xs font-ui text-accent mt-0.5 leading-relaxed">
              {guide.summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequest}
          disabled={isRequesting}
          className="px-3 py-1.5 rounded-vds-lg bg-accent-solid text-on-color hover:bg-accent-solid-hover font-ui font-semibold text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isRequesting ? 'Đang kết nối...' : 'Bật ngay'}
        </button>
      </div>

      {/* Accordion hướng dẫn */}
      <div className="px-4 py-1.5 bg-surface-accent border-t border-line flex items-center justify-between text-xs font-ui">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-accent hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>Xem cách bật trên {platform.browserLabel}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <span className="text-accent text-[10px] font-medium">
          {platform.osLabel}
        </span>
      </div>

      {isExpanded && (
        <div className="px-4 py-2.5 bg-surface-100 border-t border-line space-y-1.5">
          <ol className="text-xs font-ui text-accent space-y-1 pl-4 list-decimal leading-relaxed">
            {guide.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {guide.osTip && (
            <div className="mt-1.5 text-[10px] font-ui text-accent flex items-start gap-1">
              <span className="font-bold shrink-0">💡</span>
              <span>{guide.osTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
