import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { autoCacheService } from './services/autoCacheService';
import './index.css';

// Kích hoạt cơ chế tự động dọn dẹp bộ nhớ đệm mỗi 6 giờ và phát hiện bản release mới
autoCacheService.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Đã xảy ra sự cố khi tải ứng dụng">
      {/* reducedMotion="user": tự động tắt mọi hoạt họa Framer Motion (Drawer, Modal, Tab...)
          khi hệ điều hành bật "Reduce Motion" — áp dụng 1 lần duy nhất cho toàn hệ thống
          thay vì phải kiểm tra useReducedMotion() ở từng component riêng lẻ. */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
