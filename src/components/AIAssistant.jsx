import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SUGGESTED = [
  'What products do you have for weight loss?',
  'Tell me about organic spices',
  'What are your best sellers?',
  'How long does delivery take?',
];

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1 px-1">
    {[0,1,2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-orange-400 opacity-60"
        style={{ animation: `ai-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

// Friendly AI bot face — used in the fab button, header, and message bubbles
const BotFace = ({ size = 24, animated = false }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Antenna */}
    <line x1="24" y1="4" x2="24" y2="10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="24" cy="3" r="2.5" fill="white" opacity="0.9">
      {animated && <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite"/>}
    </circle>
    {/* Head */}
    <rect x="8" y="10" width="32" height="28" rx="9" fill="white" opacity="0.15"/>
    <rect x="8" y="10" width="32" height="28" rx="9" stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
    {/* Eyes */}
    <rect x="14" y="18" width="8" height="7" rx="3" fill="white">
      {animated && <animate attributeName="height" values="7;1;7" dur="3.5s" repeatCount="indefinite"/>}
    </rect>
    <rect x="26" y="18" width="8" height="7" rx="3" fill="white">
      {animated && <animate attributeName="height" values="7;1;7" dur="3.5s" repeatCount="indefinite"/>}
    </rect>
    {/* Eye shine */}
    <circle cx="20" cy="20" r="1.5" fill="rgba(249,115,22,0.8)"/>
    <circle cx="32" cy="20" r="1.5" fill="rgba(249,115,22,0.8)"/>
    {/* Smile */}
    <path d="M17 31 Q24 37 31 31" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    {/* Ear bolts */}
    <circle cx="8" cy="22" r="2.5" fill="white" opacity="0.7"/>
    <circle cx="40" cy="22" r="2.5" fill="white" opacity="0.7"/>
  </svg>
);

export default function AIAssistant() {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! 👋 I'm Eptomart's AI shopping assistant. How can I help you today?`,
    },
  ]);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

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
        messages: next.filter(m => m.role !== 'assistant' || next.indexOf(m) > 0)
          .map(m => ({ role: m.role, content: m.content })),
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
      {/* Keyframes injected once */}
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
        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: '#f97316' }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="ai-chat-window fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '70vh', background: '#fff', border: '1px solid #fde8d0' }}>

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
              <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                ✦ Smart Shopping Assistant
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#fafafa' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 self-end"
                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                    <BotFace size={18} />
                  </div>
                )}
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'text-gray-800 rounded-bl-sm'
                }`}
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg,#f97316,#ea580c)' }
                    : { background: '#fff', border: '1px solid #ffe4cc', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
                  }>
                  {m.content}
                </div>
              </div>
            ))}

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

          {/* Suggested chips — shown when only opening message exists */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-orange-100 flex items-center gap-2 bg-white">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask me anything…"
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

          <p className="text-center text-[10px] pb-2" style={{ color: '#cbd5e1' }}>
            ⚡ Powered by Claude AI &nbsp;·&nbsp; Eptomart Smart Shopping
          </p>
        </div>
      )}
    </>
  );
}
