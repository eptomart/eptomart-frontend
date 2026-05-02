import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

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

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1 px-1">
    {[0,1,2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-orange-400 opacity-60"
        style={{ animation: `ai-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

// Cute cartoon robot — orange antenna, round white head, green eyes
const BotFace = ({ size = 24, animated = false }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Antenna stem */}
    <line x1="32" y1="5" x2="32" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Antenna ball — orange like in the logo */}
    <circle cx="32" cy="4" r="4" fill="#f97316">
      {animated && <animate attributeName="r" values="4;5;4" dur="1.8s" repeatCount="indefinite"/>}
    </circle>
    <circle cx="30.5" cy="2.5" r="1.2" fill="white" opacity="0.6"/>

    {/* Head — big round white helmet style */}
    <ellipse cx="32" cy="34" rx="20" ry="22" fill="white" opacity="0.95"/>
    {/* Head shading top */}
    <ellipse cx="32" cy="34" rx="20" ry="22" fill="url(#headGrad)"/>

    {/* Visor / face screen — dark teal like the image */}
    <rect x="16" y="22" width="32" height="20" rx="10" fill="#0d3d3a"/>
    <rect x="16" y="22" width="32" height="20" rx="10" fill="url(#visorGrad)" opacity="0.4"/>

    {/* Left eye */}
    <circle cx="24" cy="32" r="5.5" fill="#22c55e">
      {animated && <animate attributeName="r" values="5.5;4;5.5" dur="3.5s" repeatCount="indefinite"/>}
    </circle>
    <circle cx="24" cy="32" r="3.2" fill="#16a34a"/>
    <circle cx="22.5" cy="30.5" r="1.2" fill="white" opacity="0.9"/>

    {/* Right eye */}
    <circle cx="40" cy="32" r="5.5" fill="#22c55e">
      {animated && <animate attributeName="r" values="5.5;4;5.5" dur="3.5s" repeatCount="indefinite"/>}
    </circle>
    <circle cx="40" cy="32" r="3.2" fill="#16a34a"/>
    <circle cx="38.5" cy="30.5" r="1.2" fill="white" opacity="0.9"/>

    {/* Smile */}
    <path d="M26 39 Q32 44 38 39" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" fill="none"/>

    {/* Ear bolts */}
    <circle cx="12" cy="33" r="3.5" fill="#e2e8f0"/>
    <circle cx="12" cy="33" r="2" fill="#cbd5e1"/>
    <circle cx="52" cy="33" r="3.5" fill="#e2e8f0"/>
    <circle cx="52" cy="33" r="2" fill="#cbd5e1"/>

    {/* Body (small, peeking out) */}
    <rect x="22" y="54" width="20" height="8" rx="5" fill="white" opacity="0.6"/>
    <circle cx="28" cy="58" r="2" fill="#22c55e" opacity="0.8"/>
    <circle cx="36" cy="58" r="2" fill="#22c55e" opacity="0.8"/>

    {/* Sparkles */}
    {animated && <>
      <text x="52" y="14" fontSize="6" fill="#fbbf24" opacity="0.9">✦
        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.1s" repeatCount="indefinite"/>
      </text>
      <text x="8" y="18" fontSize="4" fill="#fbbf24" opacity="0.7">✦
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.7s" repeatCount="indefinite"/>
      </text>
    </>}

    <defs>
      <radialGradient id="headGrad" cx="40%" cy="30%">
        <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.1"/>
      </radialGradient>
      <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#0d3d3a" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function AIAssistant() {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Show welcome + category menu when chat opens for the first time
  const isWelcome = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

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

  return (
    <>
      <style>{`
        @keyframes ai-bounce {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-5px)}
        }
        @keyframes ai-slide-up {
          from{opacity:0;transform:translateY(20px) scale(.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        .ai-chat-window { animation: ai-slide-up .25s ease-out both }
        .ai-cat-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(249,115,22,0.18); }
        .ai-cat-btn { transition: transform .15s, box-shadow .15s; }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="AI Shopping Assistant"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <BotFace size={28} animated={true} />
        )}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: '#f97316' }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="ai-chat-window fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '75vh', background: '#fff', border: '1px solid #fde8d0' }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#0B1729,#1a2f4a)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
              <BotFace size={24} animated={true} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold text-white leading-none tracking-wide">EPTOMART</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>AI</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>✦ Smart Shopping Assistant</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#fafafa' }}>

            {/* ── Welcome screen with category picker ── */}
            {isWelcome && !loading && (
              <div className="p-4">
                {/* Greeting card */}
                <div className="rounded-2xl p-4 mb-4 text-center"
                  style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa' }}>
                  <div className="text-2xl mb-1">👋</div>
                  <p className="font-bold text-gray-800 text-sm">
                    Hi{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm Priya
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Your Eptomart AI Shopping Assistant</p>
                  <p className="text-xs text-orange-600 font-medium mt-2">What are you shopping for today?</p>
                </div>

                {/* Category grid */}
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

                <p className="text-center text-[11px] text-gray-400 mt-3">
                  — or type your question below —
                </p>
              </div>
            )}

            {/* ── Conversation messages ── */}
            {!isWelcome && (
              <div className="p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 self-end"
                        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                        <BotFace size={18} />
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

                {/* Quick-pick chips after AI reply — back to menu or common follow-ups */}
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

                {/* Typing indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                      <BotFace size={18} animated={true} />
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
          <div className="p-3 border-t border-orange-100 flex items-center gap-2 bg-white">
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

          <div className="flex items-center justify-center gap-1.5 pb-2.5 pt-1">
            <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>Powered by</span>
            <span className="text-[11px] font-extrabold tracking-wide" style={{ color: '#f97316' }}>Claude</span>
            <span className="text-[9px]" style={{ color: '#cbd5e1' }}>· Eptomart AI</span>
          </div>
        </div>
      )}
    </>
  );
}
