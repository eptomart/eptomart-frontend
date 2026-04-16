// ============================================
// EPTOMART LOGO — Uses actual brand logo image (transparent background)
//
// variant:
//   'horizontal' — wide trimmed logo (icon + wordmark + tagline), transparent bg
//   'icon'       — square icon mark, transparent bg (for small spaces)
//   'full'       — full 1:1 logo with original navy bg (use only on navy pages)
//
// height: controls rendered height in px (width auto-calculated)
// className, style: forwarded to the <img>
// ============================================
import React from 'react';

const ASPECT = {
  horizontal: 755 / 175,   // clean nav logo — no tagline
  icon:       1,            // square
  full:       1,            // square (original navy bg)
};

const SRC = {
  horizontal: '/logo-nav.png',               // clean: icon + wordmark only, no tagline
  icon:       '/logo-nav.png',              // left-crop for small spaces
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
    width: variant === 'icon'
      ? height                           // force square crop (shows icon portion)
      : Math.round(height * aspect),
    objectFit:      'contain',
    objectPosition: variant === 'icon' ? 'left center' : 'center',
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
