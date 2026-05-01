// ============================================
// CATEGORY ICON — Vibrant circle + white silhouette icon
// Matches the style: solid colored circle, white React Icon, long shadow
// ============================================
import React from 'react';
import {
  FiShoppingCart, FiFeather, FiShoppingBag, FiSmartphone,
  FiHome, FiHeart, FiActivity, FiBookOpen, FiTruck,
  FiWatch, FiGift, FiStar, FiTag, FiCoffee, FiSun,
  FiDroplet, FiMusic, FiCamera, FiPenTool, FiPackage,
  FiAnchor, FiZap, FiUmbrella, FiTool, FiBox,
} from 'react-icons/fi';

// ── Keyword → icon + fallback color ───────────────────────────────────
const ICON_RULES = [
  { kw: ['grocer','supermark','vegetable','fruit','fresh','daily','staple','rice','pulses'],  icon: FiShoppingCart, color: '#22c55e' },
  { kw: ['herb','spice','botanical','plant','leaf','organic','natural','turmeric','masala'],   icon: FiFeather,      color: '#16a34a' },
  { kw: ['fashion','cloth','apparel','dress','wear','garment','textile','saree','silk'],       icon: FiShoppingBag,  color: '#e91e8c' },
  { kw: ['electron','mobile','phone','tech','gadget','device','computer','laptop','camera'],   icon: FiSmartphone,   color: '#2563eb' },
  { kw: ['home','furnit','decor','interior','living','bedroom','kitchen','appliance'],         icon: FiHome,         color: '#7c3aed' },
  { kw: ['pharma','medic','medicine','hospital','drug','clinic','health care'],                icon: FiHeart,        color: '#dc2626' },
  { kw: ['health','fitness','wellness','nutrition','supplement','vitamin'],                    icon: FiActivity,     color: '#ea580c' },
  { kw: ['beauty','cosmetic','skin','makeup','hair','personal care','grooming'],               icon: FiSun,          color: '#db2777' },
  { kw: ['sport','gym','outdoor','exercise','cricket','football','yoga','cycling'],            icon: FiZap,          color: '#d97706' },
  { kw: ['book','stationery','study','school','education','notebook','pen'],                   icon: FiBookOpen,     color: '#92400e' },
  { kw: ['auto','vehicle','car','bike','transport','motor','tyre','spare'],                    icon: FiTruck,        color: '#475569' },
  { kw: ['jewel','watch','accessory','ornament','gold','silver','necklace'],                   icon: FiWatch,        color: '#b45309' },
  { kw: ['toy','baby','kid','child','infant','game','play'],                                   icon: FiGift,         color: '#7c3aed' },
  { kw: ['pet','animal','dog','cat','bird','aquarium'],                                        icon: FiAnchor,       color: '#0891b2' },
  { kw: ['food','restaurant','snack','beverage','drink','bakery','sweet','coffee','tea'],      icon: FiCoffee,       color: '#f97316' },
  { kw: ['art','craft','paint','drawing','creative','handmade','fabric'],                      icon: FiPenTool,      color: '#7c3aed' },
  { kw: ['music','instrument','audio','sound','headphone'],                                    icon: FiMusic,        color: '#0f766e' },
  { kw: ['tool','hardware','repair','plumbing','electric','workshop'],                         icon: FiTool,         color: '#64748b' },
  { kw: ['packag','box','bag','container','storage'],                                          icon: FiBox,          color: '#ca8a04' },
  { kw: ['rain','weather','outdoor','camping','hiking','travel'],                              icon: FiUmbrella,     color: '#0284c7' },
];

// Rotating palette used when no keyword matches
const DEFAULT_PALETTE = [
  '#e91e8c','#22c55e','#2563eb','#f97316','#7c3aed',
  '#0891b2','#dc2626','#16a34a','#d97706','#0f766e',
  '#db2777','#64748b','#b45309','#475569','#ca8a04',
];

function resolve(cat, index) {
  const text = ((cat.name || '') + ' ' + (cat.icon || '')).toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.kw.some(k => text.includes(k))) {
      return { Icon: rule.icon, color: cat.color || rule.color };
    }
  }
  return {
    Icon: FiTag,
    color: cat.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
  };
}

/**
 * CategoryIcon
 * @param {object}  cat     - category object { name, icon, image, color }
 * @param {number}  index   - position in list (for default color cycling)
 * @param {number}  size    - circle diameter in px (default 64)
 * @param {string}  className
 */
export default function CategoryIcon({ cat, index = 0, size = 64, className = '' }) {
  // If admin uploaded an actual image, show it in a circle
  if (cat?.image?.url) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{
          width: size, height: size,
          boxShadow: '4px 6px 18px rgba(0,0,0,0.18)',
        }}
      >
        <img src={cat.image.url} alt={cat.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const { Icon, color } = resolve(cat, index);
  const iconPx = Math.round(size * 0.42);

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        // Vibrant solid circle with subtle inner depth
        background: `linear-gradient(150deg, ${color}ff 0%, ${color}cc 100%)`,
        // Long shadow: coloured outer glow + dark diagonal long shadow
        boxShadow: `
          ${Math.round(size * 0.08)}px ${Math.round(size * 0.12)}px ${Math.round(size * 0.3)}px ${color}55,
          ${Math.round(size * 0.06)}px ${Math.round(size * 0.1)}px ${Math.round(size * 0.06)}px rgba(0,0,0,0.18),
          inset 0 -${Math.round(size * 0.05)}px ${Math.round(size * 0.08)}px rgba(0,0,0,0.12)
        `,
      }}
    >
      {/* White silhouette icon */}
      <Icon size={iconPx} color="white" strokeWidth={1.75} />
    </div>
  );
}
