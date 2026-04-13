import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// ============================================
// ERROR BOUNDARY — catches ALL React crashes
// Shows visible error instead of blank page
// ============================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Eptomart] React crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error);
      const stack = this.state.error?.stack || '';
      return (
        <div style={{
          padding: '24px',
          fontFamily: 'monospace',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          margin: '20px',
          maxWidth: '600px',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>⚠️ App Error</h2>
          <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: '14px' }}>{msg}</p>
          <pre style={{
            margin: '0',
            fontSize: '11px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '200px',
            overflow: 'auto',
            background: '#fecaca',
            padding: '8px',
            borderRadius: '4px',
          }}>{stack.slice(0, 800)}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px', maxWidth: '350px' },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </HelmetProvider>
  </ErrorBoundary>
);
