// ============================================
// KOYAMBEDU DAILY — "How do you want it?" decision page
// Home banner lands here. The customer picks:
//   • Wholesale · Next-day delivery  → /koyambedu  (existing Koyambedu Daily flow)
//   • Retail · Same-day Express      → /express    (Eptomart Express flow)
// Nothing about either flow changes; this page only routes. Laid out so BOTH
// choices fit on one phone screen without scrolling (compact chips, short
// header). Express gets the larger, brighter card with the bike-rider art.
// The last choice is remembered ("Your usual").
// ============================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import api from '../../utils/api';

const MODE_KEY = 'koyambedu_mode';

const WHOLESALE = [
  ['💰', 'Wholesale rates'],
  ['🌙', 'Next-day delivery'],
  ['🏪', 'Direct suppliers'],
  ['🅰️', 'Grade & variant choice'],
];
const RETAIL = [
  ['⚡', 'Same-day delivery'],
  ['📍', 'Nearest store'],
  ['🛒', 'Buy from 250 g'],
  ['🟢', 'Live stock & ETA'],
  ['💳', 'Quick online pay'],
  ['🏠', 'Daily home needs'],
];

function Chips({ items, cols, dark, base = 0 }) {
  return (
    <div className={`grid gap-1.5 mt-2.5 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {items.map(([icon, text], i) => (
        <div key={text} className="kc-pop flex items-center gap-1.5 rounded-lg px-2 py-1.5"
          style={{
            animationDelay: `${base + i * 0.07}s`,
            background: dark ? 'rgba(255,255,255,.16)' : '#fff7d6',
            border: dark ? '1px solid rgba(255,255,255,.18)' : '1px solid #fde68a',
          }}>
          <span className="text-[13px] leading-none">{icon}</span>
          <span className={`text-[10.5px] font-bold leading-tight ${dark ? 'text-white' : 'text-indigo-950'}`}>{text}</span>
        </div>
      ))}
    </div>
  );
}

export default function KoyambeduChoose() {
  const navigate = useNavigate();
  const [expressOn, setExpressOn] = useState(null); // null = checking
  const [last, setLast] = useState(null);

  useEffect(() => {
    try { setLast(localStorage.getItem(MODE_KEY)); } catch { /* ignore */ }
    api.get('/express/status')
      .then(r => setExpressOn(!!r.data?.isEnabled))
      .catch(() => setExpressOn(false));
  }, []);

  const go = (mode, to) => {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
    navigate(to);
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: 'linear-gradient(180deg,#052e1f 0%,#0b3d2e 150px,#f3f4f6 150px)' }}>
      <style>{`
        @keyframes kcFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-8px) rotate(6deg)} }
        @keyframes kcPop { from{opacity:0;transform:translateY(6px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes kcRise { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes kcBike { 0%,100%{transform:translate(0,0)} 50%{transform:translate(5px,-3px)} }
        @keyframes kcMoon { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-5px) scale(1.08)} }
        @keyframes kcPulse { 0%{box-shadow:0 0 0 0 rgba(255,255,255,.6)} 100%{box-shadow:0 0 0 12px rgba(255,255,255,0)} }
        @keyframes kcPulseRed { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)} 100%{box-shadow:0 0 0 12px rgba(239,68,68,0)} }
        @keyframes kcShine { 0%{transform:translateX(-120%) skewX(-20deg)} 60%,100%{transform:translateX(260%) skewX(-20deg)} }
        @keyframes kcGlow { 0%,100%{box-shadow:0 10px 28px rgba(239,68,68,.30),0 0 0 2px rgba(250,204,21,.9)} 50%{box-shadow:0 10px 34px rgba(239,68,68,.50),0 0 0 3px rgba(250,204,21,1)} }
        .kc-pop{opacity:0;animation:kcPop .4s ease-out forwards}
        .kc-rise{opacity:0;animation:kcRise .55s ease-out forwards}
        .kc-float{animation:kcFloat 4.5s ease-in-out infinite}
        .kc-cta{animation:kcPulse 1.8s ease-out infinite}
        .kc-cta-red{animation:kcPulseRed 1.6s ease-out infinite}
        .kc-glow{animation:kcGlow 2.4s ease-in-out infinite}
        .kc-bike{animation:kcBike 1.1s ease-in-out infinite}
        .kc-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .kc-shine::after{content:'';position:absolute;top:0;bottom:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:kcShine 4s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .kc-pop,.kc-rise,.kc-float,.kc-cta,.kc-cta-red,.kc-glow,.kc-bike,.kc-shine::after{animation:none;opacity:1} }
      `}</style>

      {/* Compact header */}
      <div className="px-4 pt-3 pb-3 relative overflow-hidden">
        <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-[11px] font-bold"><FiArrowLeft size={13} /> Home</Link>
        <span className="kc-float absolute right-5 top-2 text-2xl">🥬</span>
        <span className="kc-float absolute right-14 top-8 text-xl opacity-80" style={{ animationDelay: '1.2s' }}>🍅</span>
        <h1 className="kc-rise text-white font-black text-xl leading-tight mt-1">Koyambedu Daily</h1>
        <p className="kc-rise text-emerald-200 text-xs font-semibold" style={{ animationDelay: '.1s' }}>How would you like it today?</p>
      </div>

      <div className="px-3 space-y-3 max-w-xl mx-auto">

        {/* WHOLESALE — compact */}
        <button onClick={() => go('wholesale', '/koyambedu')}
          className="kc-rise relative w-full text-left rounded-2xl p-3.5 overflow-hidden active:scale-[0.98] transition-transform"
          style={{ animationDelay: '.12s', background: 'linear-gradient(140deg,#064e3b 0%,#047857 55%,#10b981 100%)', boxShadow: '0 8px 22px rgba(6,78,59,.30)' }}>
          <div className="kc-shine" />
          <span className="absolute right-3 top-2 text-4xl opacity-25" style={{ animation: 'kcMoon 5s ease-in-out infinite' }}>🌙</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-amber-400 text-amber-900 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">Wholesale</span>
            <span className="bg-white/20 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">Next-day delivery</span>
            {last === 'wholesale' && <span className="bg-white text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1"><FiCheck size={9} /> Your usual</span>}
          </div>
          <h2 className="text-white font-black text-base mt-1.5 leading-tight">Koyambedu Daily · Wholesale</h2>
          <p className="text-emerald-100 text-[11px] font-semibold">Order today · delivered tomorrow</p>
          <Chips items={WHOLESALE} cols={2} dark base={0.3} />
          <span className="kc-cta mt-3 inline-flex items-center gap-1.5 bg-white text-emerald-800 font-black text-xs px-4 py-2 rounded-xl">
            Shop Wholesale <FiArrowRight size={13} />
          </span>
        </button>

        {/* RETAIL · EXPRESS — hero card with the bike-rider art */}
        {/* Glow lives on this wrapper, entrance (kc-rise) on the button: both set the
            CSS `animation` property, so on ONE element the glow replaced the entrance
            and left the card stuck at opacity:0 (it flashed, then vanished). */}
        <div className="kc-glow rounded-2xl">
        <button onClick={() => expressOn && go('retail', '/express')} disabled={!expressOn}
          className="kc-rise relative block w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100 bg-white"
          style={{ animationDelay: '.27s' }}>
          {/* Rider art — static base + masked bouncing copy of the rider (left ~45%),
              so the bike moves while the wordmark stays still. */}
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <img src="/images/express-delivery-rider.png" alt="Eptomart Express — Express Delivery, Fast, Safe, Right to Your Door"
              className="absolute inset-0 w-full h-full object-cover" />
            <img src="/images/express-delivery-rider.png" alt="" aria-hidden="true"
              className="kc-bike absolute inset-0 w-full h-full object-cover"
              style={{ maskImage: 'linear-gradient(to right, black 0%, black 34%, transparent 46%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, black 34%, transparent 46%)' }} />
            <div className="kc-shine" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span className="bg-red-600 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow">⚡ Fastest</span>
              {last === 'retail' && expressOn && <span className="bg-white text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow"><FiCheck size={9} /> Your usual</span>}
            </div>
          </div>

          <div className="px-3.5 pb-3.5 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-indigo-950 font-black text-base leading-tight">Koyambedu Daily · Retail Express</h2>
                <p className="text-red-600 text-[11px] font-bold">Order now · get it today · from a store near you</p>
              </div>
            </div>
            <Chips items={RETAIL} cols={3} base={0.45} />
            <span className={`${expressOn ? 'kc-cta-red' : ''} mt-3 flex items-center justify-center gap-1.5 text-white font-black text-sm px-4 py-2.5 rounded-xl`}
              style={{ background: expressOn === false ? '#9ca3af' : 'linear-gradient(90deg,#dc2626,#ef4444)' }}>
              {expressOn === false ? 'Not available right now' : <>Shop Express — Get it Today <FiArrowRight size={15} /></>}
            </span>
          </div>
        </button>
        </div>
      </div>
    </div>
  );
}
