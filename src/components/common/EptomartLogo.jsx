// ============================================
// EPTOMART LOGO — Uses actual brand logo image (transparent background)
//
// variant:
//   'horizontal' — icon mark, transparent bg (277×194)
//   'icon'       — same source, square-constrained for small spaces
//   'full'       — original with navy bg
//
// height: controls rendered height in px (width auto-calculated)
// className, style: forwarded to the <img>
// ============================================
import React from 'react';

const ASPECT = {
  horizontal: 277 / 194,   // logo-nav.png: 277×194 — clean icon, no artifact, no tagline
  icon:       277 / 194,
  full:       1,
};

const SRC = {
  horizontal: '/logo-nav.png',
  icon:       '/logo-nav.png',
  full:       '/logo.png',
};

export default function EptomartLogo({
  variant = 'horizontal',
  height = 40,
  className = '',
  style = {},
  alt = 'Eptomart',
}) {
  const aspect = ASPECT[variant] ?? ASPECT.horizontal;
  const src    = SRC[variant]    ?? SRC.horizontal;

  const imgStyle = {
    height,
    width: Math.round(height * aspect),
    objectFit:      'contain',
    objectPosition: 'center',
    display: 'block',
    flexShrink: 0,
    ...style,
  };

  return (
    <img
      src={src}
      alt={alt}
      style={imgStyle}
      className={className}
      draggable={false}
    />
  );
}
