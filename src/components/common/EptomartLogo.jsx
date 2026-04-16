// ============================================
// EPTOMART LOGO — Uses the actual brand logo image
//
// Props:
//   variant    : 'full'     — horizontal logo with tagline (default)
//                'icon'     — square icon mark only
//                'wide'     — logo without excess padding (trimmed)
//   height     : number (px) — controls rendered height (default varies by variant)
//   className  : string
// ============================================
import React from 'react';

export default function EptomartLogo({
  variant = 'full',
  height,
  className = '',
  alt = 'Eptomart',
}) {
  // Default heights per variant
  const defaultH = { full: 44, icon: 36, wide: 36 };
  const h = height || defaultH[variant] || 44;

  const src = {
    full: '/logo.png',         // 1024×1024 square (full logo, navy bg)
    icon: '/logo.png',         // same — used at small size as icon
    wide: '/logo-trim.png',    // 755×234 trimmed horizontal logo
  }[variant];

  // For 'wide' we preserve aspect ratio: width = h * (755/234)
  const style = variant === 'wide'
    ? { height: h, width: Math.round(h * 755 / 234), objectFit: 'contain' }
    : variant === 'icon'
    ? { height: h, width: h, objectFit: 'contain', borderRadius: 8 }
    : { height: h, width: h, objectFit: 'contain' };

  return (
    <img
      src={src}
      alt={alt}
      height={h}
      style={style}
      className={className}
      draggable={false}
    />
  );
}
