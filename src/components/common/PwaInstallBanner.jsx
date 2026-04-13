// ============================================
// PWA INSTALL BANNER + NOTIFICATION PROMPT
// ============================================
import React, { useState, useEffect } from 'react';
import { FiX, FiBell, FiDownload } from 'react-icons/fi';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

export default function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const { permission, isSubscribed, subscribe } = usePushNotifications();

  // Capture install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);

      // Show banner after 5 seconds
      setTimeout(() => setShowInstall(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show notification prompt for new users
  useEffect(() => {
    const shown = sessionStorage.getItem('notif_prompt_shown');
    if (!shown && permission === 'default' && !isSubscribed) {
      setTimeout(() => setShowNotifPrompt(true), 10000); // After 10 seconds
    }
  }, [permission, isSubscribed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Eptomart installed! 📲', { duration: 3000 });
    }
    setShowInstall(false);
    setInstallPrompt(null);
  };

  const handleEnableNotifications = async () => {
    sessionStorage.setItem('notif_prompt_shown', 'true');
    const result = await subscribe();
    if (result.success) {
      toast.success('🔔 Notifications enabled! You\'ll get order updates.');
    }
    setShowNotifPrompt(false);
  };

  return (
    <>
      {/* Install PWA Banner */}
      {showInstall && installPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-gray-900 text-white rounded-2xl p-4 shadow-2xl z-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="font-bold">E</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Install Eptomart App</p>
            <p className="text-xs text-gray-300">Faster shopping, works offline!</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <FiDownload size={12} /> Install
            </button>
            <button onClick={() => setShowInstall(false)} className="text-gray-400 hover:text-white p-1">
              <FiX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Notification Permission Prompt */}
      {showNotifPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xl z-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiBell className="text-primary-500" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-800">Get Order Updates 🔔</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Enable notifications to get instant updates on your orders and deals.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-1 transition-colors hover:bg-primary-600"
                >
                  Enable
                </button>
                <button
                  onClick={() => { setShowNotifPrompt(false); sessionStorage.setItem('notif_prompt_shown', 'true'); }}
                  className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button onClick={() => setShowNotifPrompt(false)} className="text-gray-400 p-1">
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
