import React, { useState, useRef, useEffect } from 'react';
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

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1 px-1">
    {[0,1,2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-orange-400 opacity-60"
        style={{ animation: `ai-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const BotFace = ({ size = 24, animated = false }) => (
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

      {/* Floating button — pill with robot + "EPTO AI" text */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="AI Shopping Assistant"
        className="fixed bottom-6 right-6 z-50 flex items-center shadow-2xl transition-transform hover:scale-105 active:scale-95 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#0a1628,#0f2040)',
          borderRadius: open ? '50%' : '999px',
          width: open ? '52px' : 'auto',
          height: '52px',
          padding: open ? '0' : '0 16px 0 4px',
          border: '2px solid #22c55e',
          boxShadow: '0 0 18px rgba(34,197,94,0.3), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {open ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <>
            {/* Robot icon */}
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <BotFace size={56} animated={true} />
            </div>
            {/* EPTO AI text */}
            <div className="flex flex-col items-start ml-1 mr-1">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-sm font-black tracking-tight" style={{ color: '#22c55e' }}>EPTO</span>
                <span className="text-sm font-black tracking-tight" style={{ color: '#f97316' }}>AI</span>
              </div>
              <span className="text-[9px] font-semibold tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>ASSISTANT</span>
            </div>
            {/* Pulse dot */}
            <span className="w-2 h-2 rounded-full bg-green-400 ml-1 flex-shrink-0"
              style={{ boxShadow: '0 0 6px #22c55e' }}>
            </span>
          </>
        )}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-10"
            style={{ background: '#22c55e' }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="ai-chat-window fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '75vh', background: '#fff', border: '1px solid #fde8d0' }}>

          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#0a1628,#0f2040)' }}>
            {/* Robot avatar */}
            <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
              <BotFace size={80} animated={true} />
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              {/* EPTO AI row */}
              <div className="flex items-baseline gap-1 leading-none">
                <span className="text-xl font-black tracking-tight" style={{ color: '#22c55e' }}>EPTO</span>
                <span className="text-xl font-black tracking-tight" style={{ color: '#f97316' }}>AI</span>
              </div>
              {/* ASSISTANT */}
              <div className="text-sm font-extrabold tracking-widest mt-0.5" style={{ color: '#f97316', letterSpacing: '0.15em' }}>
                ASSISTANT
              </div>
              {/* Green separator */}
              <div className="mt-1.5 mb-1.5 rounded-full" style={{ height: '2px', background: 'linear-gradient(90deg,#22c55e,#16a34a,transparent)', width: '90%' }}/>
              {/* Powered by Claude pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                {/* Anthropic asterisk */}
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                  <path d="M10 1v18M1 10h18M3.22 3.22l13.56 13.56M16.78 3.22L3.22 16.78" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Powered by</span>
                <span className="text-[10px] font-extrabold tracking-wide" style={{ color: '#f97316' }}>CLAUDE</span>
              </div>
            </div>

            {/* Online badge */}
            <div className="flex flex-col items-center gap-1 self-start pt-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
              <span className="text-[9px] font-semibold text-green-400">LIVE</span>
            </div>
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
                    Hey{user?.name && user.name.toLowerCase() !== 'eptomart' ? ` ${user.name.split(' ')[0]}` : ''}! I'm Priya
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Your personal Eptomart Shopping Assistant</p>
                  <p className="text-xs text-orange-600 font-medium mt-2">✨ What are you shopping for today?</p>
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
                    <div className="w-9 h-9 flex items-center justify-center mr-2 flex-shrink-0">
                      <BotFace size={36} animated={true} />
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

          <div className="text-center pb-2 pt-1">
            <span className="text-[9px] font-medium" style={{ color: '#9ca3af' }}>Eptomart Smart Shopping · AI Powered</span>
          </div>
        </div>
      )}
    </>
  );
}
