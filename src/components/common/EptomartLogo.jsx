// ============================================
// EPTOMART LOGO
// Asset : /logo-v3.png  (279 × 192 px, RGBA transparent)
// The ?v=3 query string forces a CDN cache miss so the browser
// always fetches the clean version even after previous deployments.
// ============================================
import React from 'react';

// Exact pixel dimensions of logo-v3.png
const LOGO_W = 279;
const LOGO_H = 192;

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
