// ============================================
// FRUIT BASKETS & HAMPERS — "Royal" theme constants
// Deep purple + gold palette used consistently across every Fruit Basket
// surface (shop, checkout, common-cart tab, home banner, admin panel).
// Centralised here so the look stays consistent and future tweaks only
// need to happen in one place. Purely a set of style values — importing
// this file changes nothing by itself.
// ============================================

export const FB_THEME = {
  // Core palette
  purple900: '#1a0a2e',
  purple800: '#2e1065',
  purple700: '#4c1d95',
  purple600: '#6d28d9',
  purple500: '#8b5cf6',
  purple100: '#ede9fe',
  purple50:  '#f5f3ff',

  gold:      '#d4af37',
  goldDark:  '#b8860b',
  goldLight: '#f5d576',
  goldPale:  '#fff8e1',

  // Gradients
  gradientHero:    'linear-gradient(120deg, #1a0a2e 0%, #4c1d95 55%, #7c3aed 100%)',
  gradientHeader:  'linear-gradient(135deg, #2e1065, #6d28d9)',
  gradientGold:    'linear-gradient(135deg, #b8860b 0%, #d4af37 55%, #f5d576 100%)',
  gradientButton:  'linear-gradient(135deg, #6d28d9, #4c1d95)',

  // Shadows / borders
  shadowPurple:    '0 8px 28px rgba(76,29,149,0.35)',
  shadowGold:      '0 4px 16px rgba(212,175,55,0.35)',
  borderGold:      '1px solid rgba(212,175,55,0.4)',
  cardShadow:      '0 2px 14px rgba(76,29,149,0.08)',
};

export default FB_THEME;
