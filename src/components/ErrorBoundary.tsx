/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from './vds/icons';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="bg-surface rounded-vds-lg border border-line p-6 max-w-md w-full shadow-pop text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface-negative text-negative flex items-center justify-center mx-auto border border-line">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-title text-base font-bold text-ink">
                {this.props.fallbackTitle || 'Đã xảy ra lỗi hiển thị'}
              </h3>
              <p className="text-xs font-ui text-subdued leading-relaxed">
                Hệ thống gặp sự cố khi xử lý dữ liệu của mục này. Bạn có thể tải lại trang hoặc bấm thử lại.
              </p>
              {this.state.error && (
                <div className="p-2 bg-surface-100 rounded-vds-lg text-xs font-mono text-negative text-left overflow-x-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="h-8 px-4 rounded-vds-lg bg-accent-solid hover:bg-accent-solid-hover text-on-color text-xs font-ui font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
