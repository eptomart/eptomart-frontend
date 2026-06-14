import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import robotImg from '../assets/robot.png';

// Category quick-pick menu shown on first open
const CATEGORIES = [
  { emoji: '🌿', label: 'Organic & Natural',  query: 'What organic and natural products do you have?' },
  { emoji: '🏋️', label: 'Health & Fitness',   query: 'Show me health and fitness products' },
  { emoji: '🍳', label: 'Kitchen & Cooking',  query: 'What kitchen and cooking products do you have?' },
  { emoji: '🧴', label: 'Beauty & Care',      query: 'Show me beauty and personal care products' },
  { emoji: '🧸', label: 'Kids & Baby',        query: 'What products do you have for kids and babies?' },
  { emoji: '🏆', label: 'Best Sellers',       query: 'What are your best selling products?' },
  { emoji: '🎁', label: 'Gifts & Combos',     query: 'Show me gift sets and combo offers' },
  { emoji: '🌾', label: 'Spices & Masalas',   query: 'Show me spices and masalas' },
];

const POS_KEY = 'eptomart_ai_pos';

// Safe Y: above BottomNav (68px) + any cart/checkout bar (~80px) + padding (20px)
const SAFE_BOTTOM_MARGIN = 180;

const defaultPos = () => ({
  x: 16,
  y: typeof window !== 'undefined' ? window.innerHeight - SAFE_BOTTOM_MARGIN : 500,
});

const loadPos = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      // Reset if saved in the danger zone (bottom 150px — covers checkout bars)
      const dangerZone = window.innerHeight - 150;
      if (saved.x > window.innerWidth / 2 || saved.y > dangerZone) return defaultPos();
      return {
        x: Math.max(0, Math.min(saved.x, window.innerWidth  - 60)),
        y: Math.max(0, Math.min(saved.y, dangerZone)),
      };
    }
  } catch {}
  return defaultPos();
};

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1 px-1">
    {[0,1,2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-orange-400 opacity-60"
        style={{ animation: `ai-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const BotFace = ({ size = 24 }) => (
  <img
    src={robotImg}
    alt="Epto AI"
    width={size}
    height={size}
    style={{ objectFit: 'contain', display: 'block' }}
  />
);

export default function AIAssistant() {
  const { user } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false); // collapsed to small circle
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [messages,  setMessages]  = useState([]);

  // Auto-minimize to small circle after 3 seconds on mount
  useEffect(() => {
    const t = setTimeout(() => setMinimized(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // ── Drag state ─────────────────────────────────────────────
  const [pos, setPos]   = useState(loadPos);     // { x, y } = top-left of button
  const drag            = useRef(null);           // { startMouseX, startMouseY, startPosX, startPosY }
  const isDragging      = useRef(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const btnRef     = useRef(null);

  const isWelcome = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Pointer-based drag ──────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    // Only trigger on primary button (left click / touch)
    if (e.button !== undefined && e.button !== 0) return;
    isDragging.current = false;
    drag.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX:   pos.x,
      startPosY:   pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startMouseX;
    const dy = e.clientY - drag.current.startMouseY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isDragging.current = true;
    }
    if (!isDragging.current) return;

    const maxY = window.innerHeight - 150; // never drag into checkout/nav zone
    const newX = Math.max(0, Math.min(drag.current.startPosX + dx, window.innerWidth  - 60));
    const newY = Math.max(0, Math.min(drag.current.startPosY + dy, maxY));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!drag.current) return;
    drag.current = null;
    if (isDragging.current) {
      // Save final position
      setPos(prev => {
        localStorage.setItem(POS_KEY, JSON.stringify(prev));
        return prev;
      });
      isDragging.current = false;
    }
  }, []);

  // Click: minimized → expand pill; pill → open chat; open → close
  const handleBtnClick = useCallback(() => {
    if (isDragging.current) return;
    if (minimized) {
      setMinimized(false); // expand pill, don't open chat yet
      return;
    }
    setOpen(o => !o);
  }, [minimized]);

  // ── AI send ─────────────────────────────────────────────────
  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        messages: next.map(m => ({ role: m.role, content: m.content })),
        userName: user?.name || null,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      const errContent = serverMsg
        ? `⚠️ ${serverMsg}`
        : "Sorry, I'm having a moment. Please try again! 🙏";
      setMessages(prev => [...prev, { role: 'assistant', content: errContent }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Chat window positioning — open above/beside button ──────
  const CHAT_W = 384;
  const CHAT_H = Math.min(window.innerHeight * 0.75, 600);
  const BTN_W  = (open || minimized) ? 52 : 160;
  const BTN_H  = 52;
  const PAD    = 10;

  // Horizontal: prefer to left of button, but clamp
  let chatLeft = pos.x + BTN_W - CHAT_W;
  chatLeft = Math.max(PAD, Math.min(chatLeft, window.innerWidth - CHAT_W - PAD));

  // Vertical: prefer above button, fall back to below
  let chatTop = pos.y - CHAT_H - PAD;
  if (chatTop < PAD) chatTop = pos.y + BTN_H + PAD;
  chatTop = Math.max(PAD, Math.min(chatTop, window.innerHeight - CHAT_H - PAD));

  return (
    <>
      <style>{`
        @keyframes ai-bounce {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-5px)}
        }
        @keyframes ai-slide-up {
          from{opacity:0;transform:translateY(10px) scale(.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        .ai-chat-window { animation: ai-slide-up .2s ease-out both }
        .ai-cat-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(249,115,22,0.18); }
        .ai-cat-btn { transition: transform .15s, box-shadow .15s; }
        .ai-drag-btn { touch-action: none; user-select: none; }
      `}</style>

      {/* ── Floating draggable button ── */}
      <div
        ref={btnRef}
        className="ai-drag-btn"
        style={{
          position: 'fixed',
          left:     pos.x,
          top:      pos.y,
          zIndex:   9999,
          cursor:   isDragging.current ? 'grabbing' : 'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <button
          onClick={handleBtnClick}
          aria-label="AI Shopping Assistant"
          className="flex items-center shadow-2xl overflow-hidden"
          style={{
            background:   'linear-gradient(135deg,#0a1628,#0f2040)',
            borderRadius: '50%',
            width:        minimized ? '44px' : open ? '52px' : 'auto',
            height:       minimized ? '44px' : '52px',
            padding:      (minimized || open) ? '0' : '0 16px 0 4px',
            border:       '2px solid #22c55e',
            boxShadow:    minimized
              ? '0 0 10px rgba(34,197,94,0.25), 0 2px 10px rgba(0,0,0,0.35)'
              : '0 0 18px rgba(34,197,94,0.3), 0 4px 20px rgba(0,0,0,0.4)',
            transition:   'width 0.25s ease, border-radius 0.25s ease, box-shadow 0.2s',
          }}
        >
          {/* Minimized: tiny circle with just the bot face */}
          {minimized && (
            <div className="w-full h-full flex items-center justify-center">
              <BotFace size={30} />
            </div>
          )}

          {/* Open (chat visible): X close button */}
          {!minimized && open && (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* Default pill: bot + label */}
          {!minimized && !open && (
            <>
              <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                <BotFace size={56} />
              </div>
              <div className="flex flex-col items-start ml-1 mr-1">
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-sm font-black tracking-tight" style={{ color: '#22c55e' }}>EPTO</span>
                  <span className="text-sm font-black tracking-tight" style={{ color: '#f97316' }}>AI</span>
                </div>
                <span className="text-[9px] font-semibold tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>ASSISTANT</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-green-400 ml-1 flex-shrink-0"
                style={{ boxShadow: '0 0 6px #22c55e' }} />
            </>
          )}

          {/* Ping ring — only on minimized */}
          {minimized && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-10"
              style={{ background: '#22c55e', animationDuration: '2.5s' }} />
          )}
        </button>
      </div>

      {/* ── Chat window ── */}
      {open && (
        <div
          className="ai-chat-window"
          style={{
            position:  'fixed',
            left:      chatLeft,
            top:       chatTop,
            width:     Math.min(CHAT_W, window.innerWidth - 2 * PAD),
            maxHeight: CHAT_H,
            zIndex:    9998,
            background: '#fff',
            border:    '1px solid #fde8d0',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            display:   'flex',
            flexDirection: 'column',
            overflow:  'hidden',
          }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#0a1628,#0f2040)', flexShrink: 0 }}>
            <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
              <BotFace size={80} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-xl font-black tracking-tight" style={{ color: '#22c55e' }}>EPTO</span>
                <span className="text-xl font-black tracking-tight" style={{ color: '#f97316' }}>AI</span>
              </div>
              <div className="text-sm font-extrabold tracking-widest mt-0.5" style={{ color: '#f97316', letterSpacing: '0.15em' }}>
                ASSISTANT
              </div>
              <div className="mt-1.5 mb-1.5 rounded-full" style={{ height: '2px', background: 'linear-gradient(90deg,#22c55e,#16a34a,transparent)', width: '90%' }}/>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                  <path d="M10 1v18M1 10h18M3.22 3.22l13.56 13.56M16.78 3.22L3.22 16.78" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Powered by</span>
                <span className="text-[10px] font-extrabold tracking-wide" style={{ color: '#f97316' }}>CLAUDE</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 self-start pt-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
              <span className="text-[9px] font-semibold text-green-400">LIVE</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#fafafa' }}>
            {isWelcome && !loading && (
              <div className="p-4">
                <div className="rounded-2xl p-4 mb-4 text-center"
                  style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa' }}>
                  <div className="text-2xl mb-1">👋</div>
                  <p className="font-bold text-gray-800 text-sm">
                    Hey{user?.name && user.name.toLowerCase() !== 'eptomart' ? ` ${user.name.split(' ')[0]}` : ''}! I'm Zya
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Your personal Eptomart Shopping Assistant</p>
                  <p className="text-xs text-orange-600 font-medium mt-2">✨ What are you shopping for today?</p>
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Browse by category</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.label}
                      onClick={() => send(cat.query)}
                      className="ai-cat-btn text-left px-3 py-2.5 rounded-xl bg-white border border-orange-100 flex items-center gap-2"
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700 leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-3">— or type your question below —</p>
              </div>
            )}

            {!isWelcome && (
              <div className="p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-9 h-9 flex items-center justify-center mr-2 flex-shrink-0 self-end">
                        <BotFace size={36} />
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      m.role === 'user' ? 'text-white rounded-br-sm' : 'text-gray-800 rounded-bl-sm'
                    }`}
                      style={m.role === 'user'
                        ? { background: 'linear-gradient(135deg,#f97316,#ea580c)' }
                        : { background: '#fff', border: '1px solid #ffe4cc', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
                      }>
                      {m.content}
                    </div>
                  </div>
                ))}

                {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      onClick={() => setMessages([])}
                      className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
                      ← Browse categories
                    </button>
                    <button
                      onClick={() => send('Show me more options')}
                      className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                      Show more ↓
                    </button>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-9 h-9 flex items-center justify-center mr-2 flex-shrink-0">
                      <BotFace size={36} />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-bl-sm"
                      style={{ background: '#fff', border: '1px solid #ffe4cc' }}>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-orange-100 flex items-center gap-2 bg-white" style={{ flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Type a product or question…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50"
              disabled={loading}
              maxLength={500}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          <div className="text-center pb-2 pt-1" style={{ flexShrink: 0 }}>
            <span className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>Eptomart Smart Shopping · AI Powered</span>
          </div>
        </div>
      )}
    </>
  );
}
