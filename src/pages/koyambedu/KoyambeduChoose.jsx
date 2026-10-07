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
  ['🌙', 'Next-day delivery'],
  ['🏪', 'Direct suppliers'],
  ['🅰️', 'Grade & variant'],
  ['🕒', 'Choose your slot'],
  ['📦', 'Bulk & weekly'],
];
const RETAIL = [
  ['⚡', 'Same-day delivery'],
  ['📍', 'Nearest store'],
  ['🛒', 'Buy from 250 g'],
  ['🟢', 'Live stock & ETA'],
  ['💳', 'Quick online pay'],
  ['🏠', 'Daily home needs'],
];

function Chips({ items, base = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2">
      {items.map(([icon, text], i) => (
        <div key={text} className="kc-pop flex items-center gap-1 rounded-lg px-1.5 py-1.5"
          style={{ animationDelay: `${base + i * 0.06}s`, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
          <span className="text-[12px] leading-none shrink-0">{icon}</span>
          <span className="text-[10px] font-bold leading-tight text-gray-800">{text}</span>
        </div>
      ))}
    </div>
  );
}

// Same photo-on-top layout for both cards. `children` = the card body below.
function ChoiceCard({ img, imgAlt, badge, badgeTone, tag, title, sub, usual, onClick, disabled, children, delay, accent }) {
  return (
    <div className="kc-card rounded-2xl" style={{ boxShadow: `0 10px 26px ${accent}55` }}>
      <button onClick={onClick} disabled={disabled}
        className="kc-rise relative block w-full text-left rounded-2xl overflow-hidden bg-white active:scale-[0.985] transition-transform disabled:active:scale-100"
        style={{ animationDelay: delay }}>
        <div className="relative w-full" style={{ aspectRatio: '2/1' }}>
          <img src={img} alt={imgAlt} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.62))' }} />
          <div className="kc-shine" />
          <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5 flex-wrap">
            <span className={`${badgeTone} text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow`}>{badge}</span>
            <span className="bg-black/55 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">{tag}</span>
            {usual && <span className="bg-white text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow ml-auto"><FiCheck size={9} /> Your usual</span>}
          </div>
          <div className="absolute bottom-1.5 left-3 right-3">
            <h2 className="text-white font-black text-[15px] leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,.7)' }}>{title}</h2>
            <p className="text-white/90 text-[10.5px] font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>{sub}</p>
          </div>
        </div>
        <div className="px-3 pb-3 pt-1">{children}</div>
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
  const expressTarget = storeClosed ? '/express/location?mode=stores' : '/express';

  return (
    <div className="min-h-screen pb-6" style={{ background: 'linear-gradient(180deg,#052e1f 0%,#0b3d2e 110px,#f3f4f6 110px)' }}>
      <style>{`
        @keyframes kcFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-8px) rotate(6deg)} }
        @keyframes kcPop { from{opacity:0;transform:translateY(6px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes kcRise { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes kcPulse { 0%{box-shadow:0 0 0 0 rgba(255,255,255,.6)} 100%{box-shadow:0 0 0 12px rgba(255,255,255,0)} }
        @keyframes kcPulseGreen { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 100%{box-shadow:0 0 0 12px rgba(5,150,105,0)} }
        @keyframes kcPulseRed { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)} 100%{box-shadow:0 0 0 12px rgba(239,68,68,0)} }
        @keyframes kcPulseAmber { 0%{box-shadow:0 0 0 0 rgba(217,119,6,.5)} 100%{box-shadow:0 0 0 12px rgba(217,119,6,0)} }
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

      {/* Compact header */}
      <div className="px-4 pt-3 pb-3 relative overflow-hidden">
        <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-[11px] font-bold"><FiArrowLeft size={13} /> Home</Link>
        <span className="kc-float absolute right-5 top-2 text-2xl">🥬</span>
        <span className="kc-float absolute right-14 top-8 text-xl opacity-80" style={{ animationDelay: '1.2s' }}>🍅</span>
        <h1 className="kc-rise text-white font-black text-xl leading-tight mt-1">Koyambedu Daily</h1>
        <p className="kc-rise text-emerald-200 text-xs font-semibold" style={{ animationDelay: '.1s' }}>How would you like it today?</p>
      </div>

      <div className="px-3 space-y-3 max-w-xl mx-auto">

        {/* WHOLESALE */}
        <ChoiceCard
          img="/images/koyambedu-wholesale-truck.jpg"
          imgAlt="Eptomart truck loaded with fresh Koyambedu vegetables"
          badge="Wholesale" badgeTone="bg-amber-400 text-amber-900"
          tag="Next-day delivery"
          title="Koyambedu Daily · Wholesale"
          sub="Order today · delivered tomorrow"
          usual={last === 'wholesale'}
          onClick={() => go('wholesale', '/koyambedu')}
          delay=".12s" accent="#047857"
        >
          <Chips items={WHOLESALE} base={0.3} />
          <span className="kc-cta-green mt-2.5 flex items-center justify-center gap-1.5 text-white font-black text-sm px-4 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(90deg,#047857,#10b981)' }}>
            Shop Wholesale <FiArrowRight size={15} />
          </span>
        </ChoiceCard>

        {/* RETAIL · EXPRESS */}
        <ChoiceCard
          img="/images/express-delivery-rider.png"
          imgAlt="Eptomart Express — Express Delivery, Fast, Safe, Right to Your Door"
          badge="⚡ Fastest" badgeTone="bg-red-600 text-white"
          tag="Retail · Same-day"
          title="Koyambedu Daily · Retail Express"
          sub="Order now · get it today · from a store near you"
          usual={last === 'retail' && !!expressOn}
          onClick={() => expressOn && go('retail', expressTarget)}
          disabled={!expressOn}
          delay=".27s" accent="#dc2626"
        >
          {storeClosed && expressOn && (
            <div className="mt-2 flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
              <FiPauseCircle className="text-amber-600 shrink-0 mt-0.5" size={15} />
              <p className="text-[11px] leading-snug text-amber-900 font-semibold">
                {storeInfo.name ? `${storeInfo.name} is closed right now. ` : 'Your store is closed right now. '}
                <span className="font-black">Change store</span>{' '}
                {storeInfo.otherOpen > 0
                  ? `— ${storeInfo.otherOpen} other store${storeInfo.otherOpen > 1 ? 's are' : ' is'} open for quick delivery.`
                  : 'to see other quick-delivery options.'}
              </p>
            </div>
          )}
          <Chips items={RETAIL} base={0.45} />
          <span className={`${expressOn ? (storeClosed ? 'kc-cta-amber' : 'kc-cta-red') : ''} mt-2.5 flex items-center justify-center gap-1.5 text-white font-black text-sm px-4 py-2.5 rounded-xl`}
            style={{ background: expressOn === false ? '#9ca3af' : storeClosed ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)' }}>
            {expressOn === false
              ? 'Not available right now'
              : storeClosed
                ? <>Change store — see open stores <FiArrowRight size={15} /></>
                : <>Shop Express — Get it Today <FiArrowRight size={15} /></>}
          </span>
        </ChoiceCard>
      </div>
    </div>
  );
}
