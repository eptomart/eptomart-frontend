// ============================================
// EPTOMART LOGO — Reusable logo component
// Usage:
//   <EptomartLogo />              — full logo (icon + wordmark)
//   <EptomartLogo iconOnly />     — icon only (square)
//   <EptomartLogo size="sm|md|lg|xl" />
//   <EptomartLogo dark />         — light text variant for dark backgrounds
// ============================================
import React from 'react';

// The icon mark: shopping cart with 'e', leaf, circuit
function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="eptoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D1B3E"/>
          <stop offset="100%" stopColor="#1E3A5F"/>
        </linearGradient>
        <linearGradient id="eptoCart" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E"/>
          <stop offset="100%" stopColor="#16A34A"/>
        </linearGradient>
        <linearGradient id="eptoWheel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316"/>
          <stop offset="100%" stopColor="#EA580C"/>
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="512" height="512" rx="96" ry="96" fill="url(#eptoBg)"/>
      {/* Circuit dots top-left */}
      <circle cx="68" cy="68" r="8" fill="#22C55E" opacity="0.5"/>
      <circle cx="108" cy="68" r="8" fill="#22C55E" opacity="0.3"/>
      <line x1="76" y1="68" x2="100" y2="68" stroke="#22C55E" strokeWidth="4" opacity="0.3"/>
      <line x1="68" y1="76" x2="68" y2="108" stroke="#22C55E" strokeWidth="4" opacity="0.25"/>
      {/* Circuit dots bottom-right */}
      <circle cx="444" cy="444" r="8" fill="#F97316" opacity="0.5"/>
      <circle cx="404" cy="444" r="8" fill="#F97316" opacity="0.3"/>
      <line x1="412" y1="444" x2="436" y2="444" stroke="#F97316" strokeWidth="4" opacity="0.3"/>
      <line x1="444" y1="404" x2="444" y2="436" stroke="#F97316" strokeWidth="4" opacity="0.25"/>
      {/* Cart handle + body */}
      <polyline points="92,168 138,168 186,340 390,340"
        stroke="url(#eptoCart)" strokeWidth="22" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="158" y1="196" x2="400" y2="196" stroke="url(#eptoCart)" strokeWidth="22" strokeLinecap="round"/>
      {/* Cart shelf lines */}
      <line x1="158" y1="245" x2="378" y2="245" stroke="#22C55E" strokeWidth="10" opacity="0.4" strokeLinecap="round"/>
      <line x1="168" y1="294" x2="378" y2="294" stroke="#22C55E" strokeWidth="10" opacity="0.4" strokeLinecap="round"/>
      {/* Wheels */}
      <circle cx="216" cy="378" r="32" fill="url(#eptoWheel)"/>
      <circle cx="216" cy="378" r="16" fill="#0D1B3E"/>
      <circle cx="348" cy="378" r="32" fill="url(#eptoWheel)"/>
      <circle cx="348" cy="378" r="16" fill="#0D1B3E"/>
      {/* 'e' letter */}
      <text x="278" y="308" fontFamily="Arial, Helvetica, sans-serif" fontSize="120" fontWeight="900"
        fill="white" textAnchor="middle" dominantBaseline="auto">e</text>
      {/* Green leaf */}
      <path d="M370 148 Q420 100 460 148 Q420 196 370 148 Z" fill="#22C55E"/>
      <line x1="370" y1="148" x2="460" y2="148" stroke="#16A34A" strokeWidth="3"/>
      <line x1="415" y1="100" x2="415" y2="196" stroke="#16A34A" strokeWidth="2.5" opacity="0.5"/>
    </svg>
  );
}

const SIZES = {
  xs:  { icon: 24, font: 'text-sm',  tagFont: 'text-[8px]' },
  sm:  { icon: 28, font: 'text-base',tagFont: 'text-[8px]' },
  md:  { icon: 36, font: 'text-xl',  tagFont: 'text-[9px]' },
  lg:  { icon: 48, font: 'text-2xl', tagFont: 'text-[10px]' },
  xl:  { icon: 64, font: 'text-3xl', tagFont: 'text-xs' },
  '2xl':{ icon: 80, font: 'text-4xl', tagFont: 'text-sm' },
};

export default function EptomartLogo({
  size = 'md',
  iconOnly = false,
  showTagline = false,
  className = '',
  dark = false,  // true = on dark bg (tagline in gray-400)
}) {
  const s = SIZES[size] || SIZES.md;

  if (iconOnly) {
    return <LogoIcon size={s.icon} />;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={s.icon} />
      <div className="flex flex-col leading-none">
        <span className={`font-extrabold ${s.font} tracking-tight leading-none`}>
          <span className="text-green-500">epto</span>
          <span className="text-orange-500">mart</span>
        </span>
        {showTagline && (
          <span className={`${s.tagFont} font-medium tracking-widest uppercase mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Premium · Trusted
          </span>
        )}
      </div>
    </div>
  );
}
