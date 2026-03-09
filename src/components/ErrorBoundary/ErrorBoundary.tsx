import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for debugging; a real app would send to an error reporting service
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isChinese = document.documentElement.lang.startsWith('zh');

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: '32px',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
          {isChinese ? '页面出错了' : 'Something went wrong'}
        </h1>
        <p style={{ fontSize: '15px', color: '#516074', maxWidth: '400px' }}>
          {isChinese
            ? '应用遇到了意外错误。请刷新页面重试。'
            : 'The application encountered an unexpected error. Please reload the page to try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            background: '#1d4ed8',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isChinese ? '刷新页面' : 'Reload page'}
        </button>
      </div>
    );
  }
}
