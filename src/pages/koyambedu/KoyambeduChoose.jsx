// ============================================
// KOYAMBEDU DAILY — "How do you want it?" decision page
// Home banner lands here. The customer picks:
//   • Wholesale · Next-day delivery  → /koyambedu  (existing Koyambedu Daily flow)
//   • Retail · Same-day Express      → /express    (Eptomart Express flow)
// Nothing about either flow changes; this page only routes.
// Both cards are IDENTICAL in size and structure (photo on top, 6 highlights,
// one button) so neither looks like the "lesser" choice, and both fit on one
// phone screen. If the customer's chosen Express store is closed/on hold, the
// Express card says so and points to "Change store" so they can see other
// quick-delivery options. The last choice is remembered ("Your usual").
// ============================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiCheck, FiPauseCircle } from 'react-icons/fi';
import api from '../../utils/api';

const MODE_KEY = 'koyambedu_mode';
const STORE_KEY = 'express_selected_store';

const WHOLESALE = [
  ['💰', 'Wholesale rates'],
  ['🌙', 'Next-day'],
  ['🏪', 'Direct suppliers'],
  ['🅰️', 'Grade choice'],
  ['🕒', 'Pick your slot'],
  ['📦', 'Bulk orders'],
];
const RETAIL = [
  ['⚡', 'Same-day'],
  ['📍', 'Nearest store'],
  ['🛒', 'From 250 g'],
  ['🟢', 'Live stock'],
  ['💳', 'Quick pay'],
  ['🏠', 'Home needs'],
];

function Chips({ items, base = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map(([icon, text], i) => (
        <div key={text} className="kc-pop flex items-center gap-1 rounded-md px-1.5 py-1"
          style={{ animationDelay: `${base + i * 0.06}s`, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <span className="text-[11px] leading-none shrink-0">{icon}</span>
          <span className="text-[10px] font-bold leading-none text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{text}</span>
        </div>
      ))}
    </div>
  );
}

// Same photo-on-top layout for both tiles. Each tile is its own framed card and
// takes EXACTLY half of the available height (flex-1), so both always fit on
// one screen without scrolling. `topBadges` = the pills on the photo.
function ChoiceCard({ img, imgAlt, topBadges, title, sub, onClick, disabled, children, delay, accent }) {
  return (
    <div className="kc-tile flex-1 min-h-[250px] rounded-2xl bg-white"
      style={{ boxShadow: `0 6px 18px ${accent}40`, border: `2px solid ${accent}` }}>
      <button onClick={onClick} disabled={disabled}
        className="kc-rise relative flex flex-col w-full h-full text-left rounded-[14px] overflow-hidden bg-white active:scale-[0.985] transition-transform disabled:active:scale-100"
        style={{ animationDelay: delay }}>
        <div className="relative w-full flex-1 min-h-[104px]">
          <img src={img} alt={imgAlt} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.65))' }} />
          <div className="kc-shine" />
          <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5 flex-wrap">{topBadges}</div>
          <div className="absolute bottom-1.5 left-3 right-3">
            <h2 className="text-white font-black text-[15px] leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{title}</h2>
            <p className="text-white/90 text-[10.5px] font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>{sub}</p>
          </div>
        </div>
        <div className="shrink-0 px-2.5 pt-2 pb-2.5 space-y-1.5">{children}</div>
      </button>
    </div>
  );
}

export default function KoyambeduChoose() {
  const navigate = useNavigate();
  const [expressOn, setExpressOn] = useState(null);       // null = checking
  const [last, setLast] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);       // { name, closed, otherOpen }

  useEffect(() => {
    try { setLast(localStorage.getItem(MODE_KEY)); } catch { /* ignore */ }
    api.get('/express/status')
      .then(r => setExpressOn(!!r.data?.isEnabled))
      .catch(() => setExpressOn(false));

    // Is the customer's chosen Express store closed? (paused, or switched off
    // so it no longer appears in the active list.) If so, we steer them to
    // "Change store" to see the other quick-delivery options.
    let chosen = null;
    try { chosen = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { /* ignore */ }
    if (chosen?._id) {
      api.get('/express/active-stores')
        .then(({ data }) => {
          const list = data.stores || [];
          const me = list.find(s => String(s._id) === String(chosen._id));
          const closed = !me || !!me.isPaused;
          const otherOpen = list.filter(s => !s.isPaused && String(s._id) !== String(chosen._id)).length;
          setStoreInfo({ name: me?.name || chosen.name, closed, otherOpen, message: me?.pauseMessage || null });
        })
        .catch(() => {});
    }
  }, []);

  const go = (mode, to) => {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
    navigate(to);
  };

  const storeClosed = !!storeInfo?.closed;
  // Express always opens Express itself; changing store is offered inside (shop screen).
  const expressTarget = '/express';

  const pill = (cls, text) => <span key={text} className={`${cls} text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow`}>{text}</span>;

  return (
    <div className="bg-gray-100 flex flex-col" style={{ height: 'calc(100dvh - var(--bottom-nav-h, 0px))', minHeight: 600 }}>
      <style>{`
        @keyframes kcFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-6px) rotate(6deg)} }
        @keyframes kcPop { from{opacity:0;transform:translateY(6px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes kcRise { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes kcPulseGreen { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 100%{box-shadow:0 0 0 10px rgba(5,150,105,0)} }
        @keyframes kcPulseRed { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)} 100%{box-shadow:0 0 0 10px rgba(239,68,68,0)} }
        @keyframes kcPulseAmber { 0%{box-shadow:0 0 0 0 rgba(217,119,6,.55)} 100%{box-shadow:0 0 0 10px rgba(217,119,6,0)} }
        @keyframes kcShine { 0%{transform:translateX(-120%) skewX(-20deg)} 60%,100%{transform:translateX(260%) skewX(-20deg)} }
        .kc-pop{opacity:0;animation:kcPop .4s ease-out forwards}
        .kc-rise{opacity:0;animation:kcRise .55s ease-out forwards}
        .kc-float{animation:kcFloat 4.5s ease-in-out infinite}
        .kc-cta-green{animation:kcPulseGreen 1.8s ease-out infinite}
        .kc-cta-red{animation:kcPulseRed 1.6s ease-out infinite}
        .kc-cta-amber{animation:kcPulseAmber 1.6s ease-out infinite}
        .kc-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .kc-shine::after{content:'';position:absolute;top:0;bottom:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:kcShine 4.5s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .kc-pop,.kc-rise,.kc-float,.kc-cta-green,.kc-cta-red,.kc-cta-amber,.kc-shine::after{animation:none;opacity:1} }
      `}</style>

      {/* Slim title bar */}
      <div className="shrink-0 px-3 py-2.5 flex items-center gap-3 relative overflow-hidden" style={{ background: 'linear-gradient(90deg,#052e1f,#0b3d2e)' }}>
        <Link to="/" className="text-white/85 flex items-center" aria-label="Home"><FiArrowLeft size={18} /></Link>
        <div className="leading-tight">
          <h1 className="text-white font-black text-[17px]">Koyambedu Daily</h1>
          <p className="text-emerald-200 text-[11px] font-semibold">How would you like it today?</p>
        </div>
        <span className="kc-float absolute right-4 top-1.5 text-xl">🥬</span>
        <span className="kc-float absolute right-12 top-3 text-base opacity-80" style={{ animationDelay: '1.2s' }}>🍅</span>
      </div>

      {/* Two separate tiles, equal height */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 max-w-xl w-full mx-auto">

        {/* WHOLESALE */}
        <ChoiceCard
          img="/images/koyambedu-wholesale-truck.jpg"
          imgAlt="Eptomart truck loaded with fresh Koyambedu vegetables"
          topBadges={<>
            {pill('bg-amber-400 text-amber-900', 'Wholesale')}
            {pill('bg-black/55 text-white', 'Next-day delivery')}
            {last === 'wholesale' && <span className="bg-white text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow ml-auto"><FiCheck size={9} /> Your usual</span>}
          </>}
          title="Koyambedu Daily · Wholesale"
          sub="Order today · delivered tomorrow"
          onClick={() => go('wholesale', '/koyambedu')}
          delay=".12s" accent="#059669"
        >
          <Chips items={WHOLESALE} base={0.3} />
          <span className="kc-cta-green flex items-center justify-center gap-1.5 text-white font-black text-[13px] px-4 py-2 rounded-xl"
            style={{ background: 'linear-gradient(90deg,#047857,#10b981)' }}>
            Shop Wholesale <FiArrowRight size={14} />
          </span>
        </ChoiceCard>

        {/* RETAIL · EXPRESS */}
        <ChoiceCard
          img="/images/express-delivery-rider.png"
          imgAlt="Eptomart Express — Express Delivery, Fast, Safe, Right to Your Door"
          topBadges={<>
            {pill('bg-red-600 text-white', '⚡ Fastest')}
            {storeClosed && expressOn
              ? <span key="closed" className="bg-amber-500 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow inline-flex items-center gap-1"><FiPauseCircle size={10} /> Store closed</span>
              : pill('bg-black/55 text-white', 'Retail · Same-day')}
            {last === 'retail' && expressOn && !storeClosed && <span className="bg-white text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow ml-auto"><FiCheck size={9} /> Your usual</span>}
          </>}
          title="Koyambedu Daily · Retail Express"
          sub={storeClosed && expressOn
            ? `${storeInfo.name ? storeInfo.name + ' is closed' : 'Your store is closed'} — you can switch store inside`
            : 'Order now · get it today · from a store near you'}
          onClick={() => expressOn && go('retail', expressTarget)}
          disabled={!expressOn}
          delay=".27s" accent="#dc2626"
        >
          <Chips items={RETAIL} base={0.45} />
          <span className={`${expressOn ? 'kc-cta-red' : ''} flex items-center justify-center gap-1.5 text-white font-black text-[13px] px-4 py-2 rounded-xl`}
            style={{ background: expressOn === false ? '#9ca3af' : 'linear-gradient(90deg,#dc2626,#ef4444)' }}>
            {expressOn === false
              ? 'Not available right now'
              : <>Shop Express — Get it Today <FiArrowRight size={14} /></>}
          </span>
        </ChoiceCard>
      </div>
    </div>
  );
}
