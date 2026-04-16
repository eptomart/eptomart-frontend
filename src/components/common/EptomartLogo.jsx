// ============================================
// EPTOMART LOGO — Accurate recreation of the real brand logo
//
// The icon: stylised "e" forming a shopping cart body
//   • Yellow→orange gradient ("e"/cart body + handle + wheels)
//   • 3 circuit-antenna lines with dot tips (orange)
//   • Green leaf (yellow-green → dark-green gradient) at top
//   • Two orange wheel dots below
//
// The wordmark: "epto" (green) + "mart" (orange), Inter 800
// Tagline: "Premium Products. Trusted Quality." (gray)
//
// Props:
//   size       : 'xs' | 'sm' | 'md' | 'lg' | 'xl'  (default 'md')
//   iconOnly   : bool  – show icon mark only
//   showTagline: bool  – show tagline below wordmark
//   dark       : bool  – tagline in lighter gray (for dark backgrounds)
//   className  : string
// ============================================
import React from 'react';

// ── Reusable gradient defs (unique IDs per instance via prefix) ──────────────
function Defs({ p }) {
  return (
    <defs>
      <linearGradient id={`${p}cg`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%"   stopColor="#F5C840"/>
        <stop offset="50%"  stopColor="#F5A020"/>
        <stop offset="100%" stopColor="#F06E10"/>
      </linearGradient>
      <linearGradient id={`${p}lg`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#C8E840"/>
        <stop offset="100%" stopColor="#2A8B20"/>
      </linearGradient>
      <linearGradient id={`${p}eg`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#5CC840"/>
        <stop offset="100%" stopColor="#3DAA28"/>
      </linearGradient>
      <linearGradient id={`${p}mg`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#F5A020"/>
        <stop offset="100%" stopColor="#F06810"/>
      </linearGradient>
    </defs>
  );
}

// ── Icon mark: "e" + cart + leaf + circuit lines ─────────────────────────────
// Rendered in a 110×140 viewBox, scaled via width/height props
function IconMark({ size, prefix = 'ico' }) {
  const p = prefix;
  return (
    <svg
      width={size} height={Math.round(size * 1.18)}
      viewBox="0 0 110 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <Defs p={p} />

      {/* Cart handle — horizontal bar top-left */}
      <line x1="8" y1="48" x2="38" y2="48"
            stroke={`url(#${p}cg)`} strokeWidth="9.5" strokeLinecap="round"/>

      {/* Circuit antenna lines (3 stems + dot tips) */}
      <line x1="28" y1="45" x2="14" y2="18"
            stroke="#F5A825" strokeWidth="3.8" strokeLinecap="round"/>
      <circle cx="12" cy="14" r="4.5" fill="#F5A825"/>

      <line x1="40" y1="40" x2="35" y2="12"
            stroke="#F5A825" strokeWidth="3.8" strokeLinecap="round"/>
      <circle cx="34" cy="8" r="4.5" fill="#F5A825"/>

      <line x1="52" y1="37" x2="52" y2="9"
            stroke="#F5A825" strokeWidth="3.8" strokeLinecap="round"/>
      <circle cx="52" cy="5" r="4.5" fill="#F5A825"/>

      {/* Green leaf */}
      <path d="M 56,38 C 57,22 70,17 83,24 C 82,39 68,44 56,38 Z"
            fill={`url(#${p}lg)`}/>
      <path d="M 56,38 Q 70,28 83,24"
            stroke="#228020" strokeWidth="1.2" fill="none" strokeLinecap="round"/>

      {/*
        "e" body (arc) — centre (65,80) radius 34
        Opening on right: arc from ~318° CCW 270° to ~48°
        318°: (65+34·cos318°, 80+34·sin318°) = (65+25, 80-23) = (90,57)
         48°: (65+34·cos48°,  80+34·sin48°)  = (65+23, 80+25) = (88,105)
      */}
      <path d="M 90,57 A 34,34 0 1,0 88,105"
            stroke={`url(#${p}cg)`} strokeWidth="14" fill="none"
            strokeLinecap="round"/>

      {/* Middle crossbar of "e" — cart shelf */}
      <line x1="32" y1="80" x2="87" y2="80"
            stroke={`url(#${p}cg)`} strokeWidth="14" strokeLinecap="round"/>

      {/* Cart base */}
      <line x1="36" y1="118" x2="98" y2="118"
            stroke={`url(#${p}cg)`} strokeWidth="9" strokeLinecap="round"/>

      {/* Wheels */}
      <circle cx="48"  cy="128" r="8.5" fill={`url(#${p}cg)`}/>
      <circle cx="88"  cy="128" r="8.5" fill={`url(#${p}cg)`}/>
    </svg>
  );
}

// ── Full logo (icon + wordmark [+ tagline]) ───────────────────────────────────
function FullLogo({ iconSize, fontSize, tagFontSize, showTagline, dark, prefix = 'full' }) {
  const p = prefix;
  const tagColor = dark ? '#8899AA' : '#6B7280';

  return (
    <svg
      width={iconSize * 4.6}
      height={iconSize * 1.35}
      viewBox="0 0 430 118"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Eptomart"
    >
      <Defs p={p} />

      {/* ── Icon mark ── */}
      {/* Cart handle */}
      <line x1="6" y1="42" x2="34" y2="42"
            stroke={`url(#${p}cg)`} strokeWidth="8.5" strokeLinecap="round"/>

      {/* Circuit lines + dots */}
      <line x1="25" y1="40" x2="12" y2="16"
            stroke="#F5A825" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="10" cy="12" r="4" fill="#F5A825"/>

      <line x1="36" y1="35" x2="31" y2="10"
            stroke="#F5A825" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="30" cy="6" r="4" fill="#F5A825"/>

      <line x1="47" y1="33" x2="47" y2="8"
            stroke="#F5A825" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="47" cy="4" r="4" fill="#F5A825"/>

      {/* Green leaf */}
      <path d="M 51,35 C 52,21 63,16 74,22 C 73,36 62,41 51,35 Z"
            fill={`url(#${p}lg)`}/>
      <path d="M 51,35 Q 63,26 74,22"
            stroke="#228020" strokeWidth="1.1" fill="none" strokeLinecap="round"/>

      {/* "e" arc — centre (59,72) radius 30 */}
      {/* 318°: (59+30·0.743, 72-30·0.669)=(59+22,72-20)=(81,52) */}
      {/* 48°:  (59+30·0.669, 72+30·0.743)=(59+20,72+22)=(79,94) */}
      <path d="M 81,52 A 30,30 0 1,0 79,94"
            stroke={`url(#${p}cg)`} strokeWidth="12.5" fill="none"
            strokeLinecap="round"/>

      {/* "e" crossbar */}
      <line x1="30" y1="72" x2="79" y2="72"
            stroke={`url(#${p}cg)`} strokeWidth="12.5" strokeLinecap="round"/>

      {/* Cart base */}
      <line x1="32" y1="106" x2="89" y2="106"
            stroke={`url(#${p}cg)`} strokeWidth="8" strokeLinecap="round"/>

      {/* Wheels */}
      <circle cx="42" cy="114" r="7.5" fill={`url(#${p}cg)`}/>
      <circle cx="79" cy="114" r="7.5" fill={`url(#${p}cg)`}/>

      {/* ── Wordmark ── */}
      {/* "epto" in green */}
      <text x="104" y="90"
            fontFamily="'Inter', 'Poppins', Arial, sans-serif"
            fontSize="60" fontWeight="800" letterSpacing="-1"
            fill={`url(#${p}eg)`}>epto</text>

      {/* "mart" in orange */}
      <text x="272" y="90"
            fontFamily="'Inter', 'Poppins', Arial, sans-serif"
            fontSize="60" fontWeight="800" letterSpacing="-1"
            fill={`url(#${p}mg)`}>mart</text>

      {/* Tagline */}
      {showTagline && (
        <text x="106" y="112"
              fontFamily="'Inter', Arial, sans-serif"
              fontSize="12" fontWeight="400" letterSpacing="0.3"
              fill={tagColor}>
          Premium Products. Trusted Quality.
        </text>
      )}
    </svg>
  );
}

// ── Size presets ──────────────────────────────────────────────────────────────
const SIZES = {
  xs:  { iconSize: 28 },
  sm:  { iconSize: 36 },
  md:  { iconSize: 44 },
  lg:  { iconSize: 56 },
  xl:  { iconSize: 72 },
  '2xl': { iconSize: 90 },
};

// ── Public component ──────────────────────────────────────────────────────────
let _id = 0;
export default function EptomartLogo({
  size = 'md',
  iconOnly = false,
  showTagline = false,
  className = '',
  dark = false,
}) {
  // Stable unique prefix so multiple logos on one page don't share gradient IDs
  const prefix = React.useRef(`ep${++_id}`).current;
  const { iconSize } = SIZES[size] || SIZES.md;

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <IconMark size={iconSize} prefix={prefix} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      <FullLogo
        iconSize={iconSize}
        showTagline={showTagline}
        dark={dark}
        prefix={prefix}
      />
    </span>
  );
}
