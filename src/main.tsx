import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { autoCacheService } from './services/autoCacheService';
import './index.css';

// Kích hoạt cơ chế tự động dọn dẹp bộ nhớ đệm mỗi 6 giờ và phát hiện bản release mới
autoCacheService.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Đã xảy ra sự cố khi tải ứng dụng">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
