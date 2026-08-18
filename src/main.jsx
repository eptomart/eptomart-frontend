import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// ============================================
// CHUNK-LOAD FAILURE AUTO-RECOVERY
// After a new deploy, a browser tab that already has the app open (or one
// serving a stale cached index.html) can try to fetch a hashed JS chunk
// filename that no longer exists (e.g. "Home-<oldhash>.js"), throwing
// "Failed to fetch dynamically imported module". Previously this only ever
// surfaced as the ErrorBoundary's static "App Error" card below, requiring
// the user to notice and tap Reload themselves.
//
// This is purely a client-side safety net — it does one automatic reload
// (guarded by sessionStorage so it can never loop) and otherwise falls
// through to the same ErrorBoundary UI unchanged if the reload doesn't help.
// ============================================
// Different browsers phrase a stale-chunk failure differently:
//  - Chrome/Edge/Firefox: "Failed to fetch dynamically imported module" / "Loading chunk ... failed"
//  - Safari/iOS (incl. PWA/WebKit webview): "'text/html' is not a valid JavaScript MIME type" —
//    Vercel's catch-all rewrite serves index.html (200, text/html) for a missing hashed chunk
//    file, and Safari reports that as a MIME-type error rather than a fetch failure.
const CHUNK_ERROR_PATTERN = /dynamically imported module|loading chunk|failed to fetch|not a valid javascript mime type|mime type|unexpected token '<'/i;
const CHUNK_RELOAD_FLAG = 'eptomart_chunk_reload_attempted';

function isChunkLoadError(error) {
  const msg = error?.message || String(error || '');
  return CHUNK_ERROR_PATTERN.test(msg);
}

function tryAutoReloadOnce() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false; // already tried this session
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
    window.location.reload();
    return true;
  } catch {
    return false; // sessionStorage unavailable (e.g. private mode) — fall through to manual UI
  }
}

// Vite fires this on the window when a dynamic import() it manages fails to
// load — catches cases that never reach a React render (e.g. route preloading).
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Eptomart] vite:preloadError — attempting one automatic reload', event.payload);
  if (tryAutoReloadOnce()) event.preventDefault();
});

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
    // A failed lazy()/dynamic-import chunk surfaces here as a normal render
    // error. Try one silent auto-reload before falling back to the visible
    // "App Error" card — most users hitting this never need to see it at all.
    if (isChunkLoadError(error)) {
      tryAutoReloadOnce();
    }
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

// Hide splash after minimum display time
if (typeof window.__hideSplash === 'function') window.__hideSplash();

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
