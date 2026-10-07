// ============================================
// KOYAMBEDU DAILY — "How do you want it?" decision page
// Home banner lands here. The customer picks:
//   • Wholesale · Next-day delivery  → /koyambedu  (existing Koyambedu Daily flow)
//   • Retail · Same-day Express      → /express    (Eptomart Express flow)
// Nothing about either flow changes; this page only routes. The last choice is
// remembered so a returning customer sees it highlighted ("Your usual").
// ============================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import api from '../../utils/api';

const MODE_KEY = 'koyambedu_mode';

const WHOLESALE = [
  ['💰', 'Wholesale market rates'],
  ['🏪', 'Direct from Koyambedu suppliers'],
  ['🌙', 'Order today, delivered next day'],
  ['🅰️', 'Choose your grade & variant'],
  ['🕒', 'Pick your delivery slot'],
  ['📦', 'Best for bulk, restaurants & weekly stock-ups'],
];
const RETAIL = [
  ['⚡', 'Same-day Express delivery'],
  ['📍', 'From the nearest Eptomart store'],
  ['🛒', 'Buy small — 250 g, 500 g, 1 kg'],
  ['🟢', 'Live stock, live delivery time'],
  ['💳', 'Quick online payment'],
  ['🏠', 'Best for daily home needs'],
];

function Highlights({ items, tone }) {
  return (
    <ul className="space-y-2 mt-4">
      {items.map(([icon, text], i) => (
        <li key={text} className="kc-pop flex items-start gap-2.5" style={{ animationDelay: `${0.35 + i * 0.08}s` }}>
          <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[13px]" style={{ background: tone }}>{icon}</span>
          <span className="text-[13px] font-semibold text-white/95 leading-snug pt-0.5">{text}</span>
        </li>
      ))}
    </ul>
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
    <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(180deg,#052e1f 0%,#0b3d2e 28%,#f3f4f6 28.1%)' }}>
      <style>{`
        @keyframes kcFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-10px) rotate(6deg)} }
        @keyframes kcPop { from{opacity:0;transform:translateY(8px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes kcRise { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
        @keyframes kcDrive { 0%{transform:translateX(-30px)} 100%{transform:translateX(120%)} }
        @keyframes kcMoon { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.06)} }
        @keyframes kcPulse { 0%{box-shadow:0 0 0 0 rgba(255,255,255,.55)} 100%{box-shadow:0 0 0 14px rgba(255,255,255,0)} }
        @keyframes kcShine { 0%{transform:translateX(-120%) skewX(-20deg)} 60%,100%{transform:translateX(220%) skewX(-20deg)} }
        .kc-pop{opacity:0;animation:kcPop .45s ease-out forwards}
        .kc-rise{opacity:0;animation:kcRise .6s ease-out forwards}
        .kc-float{animation:kcFloat 4.5s ease-in-out infinite}
        .kc-cta{animation:kcPulse 1.8s ease-out infinite}
        .kc-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .kc-shine::after{content:'';position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:kcShine 4.5s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){ .kc-pop,.kc-rise,.kc-float,.kc-cta,.kc-shine::after{animation:none;opacity:1} }
      `}</style>

      {/* Header */}
      <div className="px-4 pt-4 pb-6 relative overflow-hidden">
        <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-xs font-bold mb-3"><FiArrowLeft size={14} /> Home</Link>
        <span className="kc-float absolute right-6 top-5 text-3xl opacity-90">🥬</span>
        <span className="kc-float absolute right-16 top-14 text-2xl opacity-80" style={{ animationDelay: '1.2s' }}>🍅</span>
        <span className="kc-float absolute right-3 top-16 text-xl opacity-80" style={{ animationDelay: '2.2s' }}>🥕</span>
        <h1 className="kc-rise text-white font-black text-2xl leading-tight">Koyambedu Daily</h1>
        <p className="kc-rise text-emerald-200 text-sm font-semibold mt-1" style={{ animationDelay: '.1s' }}>
          Fresh from Koyambedu market. How would you like it?
        </p>
      </div>

      <div className="px-4 space-y-4 max-w-xl mx-auto">

        {/* WHOLESALE */}
        <button onClick={() => go('wholesale', '/koyambedu')}
          className="kc-rise relative w-full text-left rounded-3xl p-5 overflow-hidden active:scale-[0.98] transition-transform"
          style={{ animationDelay: '.15s', background: 'linear-gradient(140deg,#064e3b 0%,#047857 55%,#10b981 100%)', boxShadow: '0 12px 30px rgba(6,78,59,.35)' }}>
          <div className="kc-shine" />
          <span className="kc-float absolute right-4 top-3 text-5xl opacity-30" style={{ animation: 'kcMoon 5s ease-in-out infinite' }}>🌙</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-400 text-amber-900 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full">Wholesale</span>
            <span className="bg-white/20 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full">Next-day delivery</span>
            {last === 'wholesale' && <span className="bg-white text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"><FiCheck size={10} /> Your usual</span>}
          </div>
          <h2 className="text-white font-black text-xl mt-3 leading-tight">Koyambedu Daily<br />Wholesale</h2>
          <p className="text-emerald-100 text-xs font-semibold mt-1">Order today · delivered tomorrow · market rates</p>
          <Highlights items={WHOLESALE} tone="rgba(255,255,255,.2)" />
          <div className="mt-5 flex items-center justify-between">
            <span className="kc-cta inline-flex items-center gap-2 bg-white text-emerald-800 font-black text-sm px-5 py-2.5 rounded-xl">
              Shop Wholesale <FiArrowRight size={15} />
            </span>
          </div>
        </button>

        {/* RETAIL / EXPRESS */}
        <button onClick={() => expressOn && go('retail', '/express')} disabled={!expressOn}
          className="kc-rise relative w-full text-left rounded-3xl p-5 overflow-hidden active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100"
          style={{ animationDelay: '.3s', background: 'linear-gradient(140deg,#1e1b4b 0%,#3730a3 55%,#6366f1 100%)', boxShadow: '0 12px 30px rgba(49,46,129,.35)' }}>
          <div className="kc-shine" />
          <span className="absolute left-0 top-4 text-3xl opacity-25 pointer-events-none" style={{ animation: 'kcDrive 6s linear infinite' }}>🛵💨</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-yellow-300 text-indigo-900 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full">Retail · Express</span>
            <span className="bg-white/20 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full">Same-day</span>
            {last === 'retail' && expressOn && <span className="bg-white text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"><FiCheck size={10} /> Your usual</span>}
          </div>
          <h2 className="text-white font-black text-xl mt-3 leading-tight">Koyambedu Daily<br />Retail · Eptomart Express</h2>
          <p className="text-indigo-100 text-xs font-semibold mt-1">Order now · get it today · from a store near you</p>
          <Highlights items={RETAIL} tone="rgba(255,255,255,.2)" />
          <div className="mt-5 flex items-center justify-between">
            <span className={`${expressOn ? 'kc-cta' : ''} inline-flex items-center gap-2 bg-white text-indigo-800 font-black text-sm px-5 py-2.5 rounded-xl`}>
              {expressOn === false ? 'Not available right now' : <>Shop Express <FiArrowRight size={15} /></>}
            </span>
          </div>
        </button>

        <p className="text-center text-[11px] text-gray-500 font-medium pt-1">
          Not sure? Wholesale is cheaper per kg for bigger baskets; Express is fastest for today's needs.
        </p>
      </div>
    </div>
  );
}
