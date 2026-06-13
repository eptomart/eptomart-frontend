// ============================================
// UZHAVAR FRESH — Home Popup
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UzhavarPopup() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem('uzhavar_popup_dismissed');
    if (!dismissed) {
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('uzhavar_popup_dismissed', '1');
    setShow(false);
  };

  const go = () => {
    dismiss();
    navigate('/uzhavar');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={dismiss}>
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Green earthy header */}
        <div className="relative bg-gradient-to-br from-green-700 via-green-600 to-lime-500 px-6 pt-8 pb-16 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />

          <div className="text-5xl mb-2">🌱</div>
          <h2 className="text-2xl font-black text-white tracking-tight">FARMER FRESH</h2>
          <p className="text-green-100 text-sm mt-1 font-medium">உழவர் சந்தை உங்கள் வீட்டு வாசலில்</p>
        </div>

        {/* White content area overlapping header */}
        <div className="relative -mt-8 mx-4 bg-white rounded-2xl shadow-lg px-5 py-5 text-center">
          <p className="text-gray-700 font-semibold text-base leading-snug mb-1">
            Buy from farmers @ your doorstep
          </p>
          <p className="text-gray-400 text-xs mb-4">
            Fresh vegetables & fruits · Direct from farm · No middlemen
          </p>

          {/* Trust badges */}
          <div className="flex justify-center gap-4 mb-5 text-xs text-gray-500">
            <span className="flex flex-col items-center gap-1"><span className="text-xl">🥕</span>Farm fresh</span>
            <span className="flex flex-col items-center gap-1"><span className="text-xl">⚡</span>Same day</span>
            <span className="flex flex-col items-center gap-1"><span className="text-xl">💰</span>Best price</span>
          </div>

          <button onClick={go}
            className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg active:scale-95 transition-transform">
            🌾 Check Farmers Near Me
          </button>

          <button onClick={dismiss}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Maybe later
          </button>
        </div>

        <div className="h-4" />

        {/* Close */}
        <button onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-sm hover:bg-white/30 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}
