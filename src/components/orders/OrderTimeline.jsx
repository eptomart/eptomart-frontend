// ============================================
// UNIFIED ORDER TIMELINE — renders the canonical
// timeline[] from the v2 Orders API.
// Only events that actually happened are shown.
// ============================================
import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const NEGATIVE_EVENTS = ['cancelled', 'order_cancelled', 'review_rejected', 'rejected', 'auto_cancelled'];

export default function OrderTimeline({ timeline = [] }) {
  if (!timeline.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Order Timeline</h3>
      <ol className="relative stagger">
        {timeline.map((ev, i) => {
          const negative = NEGATIVE_EVENTS.includes(ev.event);
          const last = i === timeline.length - 1;
          return (
            <li key={i} className="relative pl-8 pb-4 last:pb-0">
              {!last && (
                <span className="absolute left-[9px] top-5 bottom-0 w-px bg-gray-200" aria-hidden />
              )}
              <span className={`absolute left-0 top-0.5 w-[19px] h-[19px] rounded-full flex items-center justify-center
                ${negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                {negative ? <FiX size={11} /> : <FiCheck size={11} />}
              </span>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{ev.label}</p>
              {ev.description && <p className="text-xs text-gray-500 mt-0.5">{ev.description}</p>}
              <p className="text-[11px] text-gray-400 mt-0.5">
                {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                }) : ''}
                {ev.actorRole && ev.actorRole !== 'system' ? ` · ${String(ev.actorRole).replace(/_/g, ' ')}` : ''}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
