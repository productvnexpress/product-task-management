/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { animate } from 'motion/react';

let activeScrollAnimation: { stop: () => void } | null = null;

export interface SmoothScrollOptions {
  duration?: number;
  onComplete?: () => void;
}

/**
 * Cuộn mượt mà lên đỉnh trang bằng hiệu ứng vật lý từ Framer Motion (motion/react).
 * Áp dụng đường cong giảm tốc mượt mà cubic-bezier [0.16, 1, 0.3, 1] theo quy chuẩn AGENTS.md 4.8.
 */
export function scrollToTopWithMotion(options?: SmoothScrollOptions): void {
  if (typeof window === 'undefined') return;

  const currentY =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;

  // Nếu đã ở sát đỉnh trang (dưới 6px) thì không cần cuộn
  if (currentY <= 6) {
    options?.onComplete?.();
    return;
  }

  // Dừng animation cuộn trước đó nếu đang thực thi
  if (activeScrollAnimation) {
    activeScrollAnimation.stop();
    activeScrollAnimation = null;
  }

  // Lắng nghe sự tương tác chủ động từ người dùng để ngắt cuộn tự nhiên
  const handleUserInterrupt = () => {
    if (activeScrollAnimation) {
      activeScrollAnimation.stop();
      activeScrollAnimation = null;
    }
    window.removeEventListener('wheel', handleUserInterrupt);
    window.removeEventListener('touchmove', handleUserInterrupt);
  };

  window.addEventListener('wheel', handleUserInterrupt, { passive: true });
  window.addEventListener('touchmove', handleUserInterrupt, { passive: true });

  // Thời lượng hoạt họa tính theo khoảng cách (250ms - 380ms)
  const calculatedDuration =
    options?.duration ??
    Math.min(0.38, Math.max(0.24, Math.log10(currentY + 10) * 0.12));

  activeScrollAnimation = animate(currentY, 0, {
    duration: calculatedDuration,
    ease: [0.16, 1, 0.3, 1], // Chuẩn Framer Motion easeOut từ AGENTS.md 4.8
    onUpdate: (latest) => {
      window.scrollTo({
        top: latest,
        behavior: 'instant' as ScrollBehavior,
      });
    },
    onComplete: () => {
      activeScrollAnimation = null;
      window.removeEventListener('wheel', handleUserInterrupt);
      window.removeEventListener('touchmove', handleUserInterrupt);
      options?.onComplete?.();
    },
  });
}
