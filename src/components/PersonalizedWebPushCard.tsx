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
} from 'lucide-react';

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
      <div className="border-b border-[#e5e7eb] bg-[#f8fafc] text-xs">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-[#16a34a] animate-pulse' : 'bg-[#94a3b8]'}`} />
            <span className="font-ui text-xs font-medium text-[#334155] truncate">
              Thông báo {platform.browserLabel}:{' '}
              <strong className={isEnabled ? 'text-[#15803d]' : 'text-[#64748b]'}>
                {isEnabled ? 'Đang bật' : 'Đã tắt'}
              </strong>
            </span>
            {testStatus && (
              <span className="text-[11px] font-ui font-semibold text-[#15803d] animate-fade-in hidden sm:inline">
                {testStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEnabled && (
              <button
                type="button"
                onClick={handleTest}
                className="px-2.5 py-1 text-[11px] font-ui text-[#1d508d] bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] rounded-[4px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
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
              <div className="w-8 h-4.5 bg-[#cbd5e1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#963861]" />
            </label>
          </div>
        </div>

        {guide.osTip && (
          <div className="px-4 py-2 bg-[#fdfcfb] border-t border-[#f1f5f9] text-[11px] font-ui text-[#64748b] leading-relaxed">
            <div className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold shrink-0">💡</span>
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
      <div className="border-b border-[#fde68a] bg-[#fffdf7] text-xs">
        <div className="p-3.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-title font-bold text-[#991b1b] text-xs flex items-center gap-1.5">
                <span>{guide.title}</span>
                <span className="text-[10px] font-ui px-1.5 py-0.2 rounded bg-[#dc2626] text-white font-semibold">
                  Bị chặn
                </span>
              </div>
              <p className="text-[11px] font-ui text-[#7f1d1d] mt-0.5 leading-relaxed">
                {guide.summary}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecheck}
            className="px-2.5 py-1.5 rounded-[6px] bg-white border border-[#fca5a5] text-[#b91c1c] hover:bg-[#fef2f2] font-ui font-semibold text-xs transition-colors shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Kiểm tra lại sau khi đã cấp quyền"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Kiểm tra lại</span>
          </button>
        </div>

        {/* Các bước mở khóa cụ thể theo trình duyệt */}
        <div className="px-4 pb-3 pt-1 border-t border-[#fef3c7] bg-[#fffbeb] space-y-1.5">
          <div className="text-[11px] font-ui font-semibold text-[#92400e]">
            Các bước mở khóa trên {platform.browserLabel}:
          </div>
          <ol className="text-[11px] font-ui text-[#78350f] space-y-1 pl-4 list-decimal leading-relaxed">
            {guide.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {guide.osTip && (
            <div className="mt-2 pt-2 border-t border-[#fde68a] text-[11px] font-ui text-[#92400e] flex items-start gap-1.5">
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
    <div className="border-b border-[#f4c2d7] bg-[#fdf2f7] text-xs">
      <div className="p-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#963861]/15 text-[#963861] flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-title font-bold text-[#78234a] text-xs flex items-center gap-1.5">
              <span>{guide.title}</span>
              <span className="text-[10px] font-ui px-1.5 py-0.2 rounded bg-[#963861] text-white font-semibold">
                Tiện ích
              </span>
            </div>
            <p className="text-[11px] font-ui text-[#8a335a] mt-0.5 leading-relaxed">
              {guide.summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequest}
          disabled={isRequesting}
          className="px-3 py-1.5 rounded-[6px] bg-[#963861] text-white hover:bg-[#78234a] font-ui font-semibold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {isRequesting ? 'Đang kết nối...' : 'Bật ngay'}
        </button>
      </div>

      {/* Accordion hướng dẫn 2 bước */}
      <div className="px-4 py-1.5 bg-[#fae8f0] border-t border-[#f4c2d7] flex items-center justify-between text-[11px] font-ui">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#963861] hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>Hướng dẫn thao tác trên {platform.browserLabel}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <span className="text-[#8a335a] text-[10px]">
          Thiết bị: {platform.osLabel}
        </span>
      </div>

      {isExpanded && (
        <div className="px-4 py-2.5 bg-[#fdf8fa] border-t border-[#f4c2d7] space-y-1.5">
          <ol className="text-[11px] font-ui text-[#78234a] space-y-1 pl-4 list-decimal leading-relaxed">
            {guide.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {guide.osTip && (
            <div className="mt-1.5 text-[10px] font-ui text-[#8a335a] flex items-start gap-1">
              <span className="font-bold shrink-0">💡</span>
              <span>{guide.osTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
