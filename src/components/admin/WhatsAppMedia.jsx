// ============================================
// SHARED — WhatsApp inbound media renderer + image zoom lightbox
// Used by both the dedicated WhatsApp Inbox screen (pages/admin/WhatsAppInbox.jsx)
// and the WhatsApp Inbox tab embedded inside the Koyambedu Daily admin panel
// (pages/admin/KoyambeduAdmin.jsx) so both places show the same real
// image/audio/video/document/sticker content — and the same zoomable image
// viewer — instead of two different (and previously placeholder-only)
// implementations drifting apart.
// ============================================
import { useEffect, useState } from 'react';
import api from '../../utils/api';

// ── Full-screen zoom viewer for images/stickers ─────────────────────────────
// Click the thumbnail to open; click the image again to toggle full
// natural-resolution size (scrollable) vs fit-to-screen; click the backdrop
// or ✕ to close.
function ImageZoomModal({ url, alt, caption, onClose }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 overflow-auto" onClick={onClose}>
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white text-2xl font-bold leading-none hover:bg-white/20 transition"
      >
        ✕
      </button>
      <div className="min-h-full flex flex-col items-center justify-center p-4 gap-3">
        <img
          src={url}
          alt={alt}
          onClick={(e) => { e.stopPropagation(); setZoomed(z => !z); }}
          className={zoomed
            ? 'max-w-none cursor-zoom-out'
            : 'max-w-[92vw] max-h-[85vh] object-contain cursor-zoom-in'}
        />
        {caption && !zoomed && (
          <p className="text-sm text-white/80 max-w-[92vw] text-center" onClick={(e) => e.stopPropagation()}>
            {caption}
          </p>
        )}
        {!zoomed && (
          <p className="text-xs text-white/40" onClick={(e) => e.stopPropagation()}>Tap image to zoom in</p>
        )}
      </div>
    </div>
  );
}

// ── Media renderer ──────────────────────────────────────────────────────────
// Images/audio/video/documents/stickers only ever stored a Meta mediaId on the
// message — the admin inbox never actually fetched the binary, so all of these
// silently showed as a placeholder label ("📷 Image", "🎵 Audio message", etc.)
// with nothing to look at or play. This fetches the real file through the
// authenticated proxy endpoint (blob, so the request carries the admin's auth
// header) and renders it properly for each type.
export default function WhatsAppMediaContent({ msg }) {
  const [state, setState] = useState({ loading: true, url: null, error: false, detail: '' });
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    setState({ loading: true, url: null, error: false, detail: '' });

    api.get(`/koyambedu/admin/whatsapp/messages/${msg._id}/media`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setState({ loading: false, url: objectUrl, error: false, detail: '' });
      })
      .catch(async (err) => {
        if (cancelled) return;
        // Error bodies come back as a Blob too (responseType: 'blob') — read the
        // JSON out of it so the admin sees the *actual* reason (expired media,
        // WhatsApp not configured, 404, etc.) instead of one generic message.
        let detail = err?.message || 'Unknown error';
        try {
          const blob = err?.response?.data;
          if (blob instanceof Blob) {
            const text = await blob.text();
            const parsed = JSON.parse(text);
            detail = parsed?.message || detail;
          } else if (err?.response?.data?.message) {
            detail = err.response.data.message;
          }
        } catch { /* keep fallback detail */ }
        console.error('[WhatsApp media] failed to load', msg._id, msg.type, err?.response?.status, detail);
        if (!cancelled) setState({ loading: false, url: null, error: true, detail });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [msg._id]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        Loading {msg.type}…
      </div>
    );
  }

  if (state.error || !state.url) {
    return (
      <p className="text-xs text-red-400 font-semibold">
        ⚠️ Could not load this {msg.type}{state.detail ? ` — ${state.detail}` : ' — the WhatsApp media link may have expired.'}
      </p>
    );
  }

  if (msg.type === 'image' || msg.type === 'sticker') {
    return (
      <>
        <div>
          <img
            src={state.url}
            alt={msg.type}
            onClick={() => setZoomOpen(true)}
            className="max-w-xs max-h-72 rounded-xl border border-gray-200 object-contain cursor-zoom-in hover:opacity-90 transition"
          />
          {msg.mediaCaption && <p className="text-sm text-gray-600 mt-2">{msg.mediaCaption}</p>}
        </div>
        {zoomOpen && (
          <ImageZoomModal
            url={state.url}
            alt={msg.type}
            caption={msg.mediaCaption}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </>
    );
  }

  if (msg.type === 'audio') {
    return <audio controls src={state.url} className="w-full max-w-xs" />;
  }

  if (msg.type === 'video') {
    return (
      <div>
        <video controls src={state.url} className="max-w-xs max-h-72 rounded-xl border border-gray-200" />
        {msg.mediaCaption && <p className="text-sm text-gray-600 mt-2">{msg.mediaCaption}</p>}
      </div>
    );
  }

  if (msg.type === 'document') {
    return (
      <a href={state.url} target="_blank" rel="noreferrer" download={msg.text || 'document'}
        className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition w-fit">
        📄 {msg.text || 'Download document'}
      </a>
    );
  }

  return null;
}
