// ============================================
// EPTOMART LOGO
// Asset : /logo-v3.png  (774 × 244 px, RGBA transparent)
// Full horizontal logo: cart icon + "eptomart" wordmark
// The ?v=3 query string forces a CDN cache miss so the browser
// always fetches the clean version even after previous deployments.
// ============================================
import React from 'react';

// Exact pixel dimensions of logo-v3.png (cart icon + wordmark, no tagline)
const LOGO_W = 774;
const LOGO_H = 244;

export default function EptomartLogo({
  height = 44,
  className = '',
  style = {},
  alt = 'Eptomart',
  variant,   // legacy prop — ignored, kept for compatibility
}) {
  const w = Math.round(height * LOGO_W / LOGO_H);

  return (
    <img
      src={`/logo-v3.png?v=3`}
      alt={alt}
      width={w}
      height={height}
      style={{
        width: w,
        height: height,
        display: 'block',
        flexShrink: 0,
        overflow: 'visible',
        objectFit: 'contain',
        ...style,
      }}
      className={className}
      draggable={false}
    />
  );
}
