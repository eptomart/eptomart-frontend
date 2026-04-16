// ============================================
// EPTOMART LOGO — Clean transparent PNG, native aspect ratio
//
// Asset: /logo-nav.png  277×194 px
//   → cart icon + orange "e" + green leaf, no tagline, no artifact
//
// Usage:
//   <EptomartLogo height={44} />          — navbar mobile
//   <EptomartLogo height={40} />          — navbar desktop
//   <EptomartLogo height={88} />          — login / loader
// ============================================
import React from 'react';

const SRC = '/logo-nav.png';

export default function EptomartLogo({
  height = 44,
  className = '',
  style = {},
  alt = 'Eptomart',
  // legacy props kept for compatibility — ignored
  variant,
}) {
  return (
    <img
      src={SRC}
      alt={alt}
      height={height}
      style={{
        height,
        width: 'auto',          // browser preserves 277:194 aspect ratio natively
        maxWidth: '100%',
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
        imageRendering: 'auto',
        ...style,
      }}
      className={className}
      draggable={false}
    />
  );
}
