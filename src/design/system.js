// ============================================
// EPTOMART UNIFIED DESIGN SYSTEM
// Single source of truth for colors, spacing,
// shadows, radii — used by every sub-app
// ============================================

export const COLORS = {
  // Global background
  pageBg:        '#F5F4F2',
  cardBg:        '#FFFFFF',

  // Koyambedu (green)
  kbd: {
    gradient:    'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
    primary:     '#065f46',
    accent:      '#16a34a',
    light:       '#f0fdf4',
    text:        '#15803d',
  },

  // EptoFresh (orange)
  epf: {
    gradient:    'linear-gradient(135deg, #ea6c0a 0%, #f4941c 50%, #f9b048 100%)',
    primary:     '#f4941c',
    accent:      '#f97316',
    light:       '#fff4e6',
    text:        '#ea580c',
  },

  // Uzhavar (teal-green)
  uzh: {
    gradient:    'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
    primary:     '#0d9488',
    accent:      '#059669',
    light:       '#f0fdfa',
    text:        '#0f766e',
  },

  // Status
  success:       '#16a34a',
  warning:       '#d97706',
  danger:        '#dc2626',
  info:          '#0284c7',
};

export const SHADOWS = {
  card:    '0 2px 12px rgba(0,0,0,0.06)',
  cardMd:  '0 4px 20px rgba(0,0,0,0.09)',
  header:  '0 4px 24px rgba(0,0,0,0.12)',
  button:  '0 4px 14px rgba(0,0,0,0.18)',
  float:   '0 8px 32px rgba(0,0,0,0.18)',
};

export const RADIUS = {
  xs:  '8px',
  sm:  '12px',
  md:  '16px',
  lg:  '20px',
  xl:  '24px',
  pill:'999px',
};

// Standard page wrapper — always `pb-28` to clear BottomNav
export const PAGE_WRAPPER = {
  minHeight: '100vh',
  background: COLORS.pageBg,
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
  overflowX: 'hidden',
};

// Standard sub-app header (sticky, gradient)
export const HEADER_WRAPPER = (gradient, shadow = SHADOWS.header) => ({
  background: gradient,
  boxShadow: shadow,
  paddingTop: 'env(safe-area-inset-top)',
});

// Floating cart bar (above BottomNav)
export const CART_BAR_STYLE = {
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
};

// Card base style
export const CARD = {
  background: '#FFFFFF',
  borderRadius: RADIUS.xl,
  boxShadow: SHADOWS.card,
  border: '1px solid rgba(0,0,0,0.04)',
};
