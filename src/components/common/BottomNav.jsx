// ============================================
// SHARED GLASS BOTTOM NAV
// Shown on mobile across Home, Uzhavar Fresh, Koyambedu Daily
// ============================================
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid } from 'react-icons/fi';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'home',      Icon: FiHome, emoji: null,  label: 'Home',      path: '/'          },
    { id: 'uzhavar',   Icon: null,   emoji: '🌾',  label: 'Uzhavar',   path: '/uzhavar'   },
    { id: 'koyambedu', Icon: null,   emoji: '🥬',  label: 'Koyambedu', path: '/koyambedu' },
    { id: 'categories',Icon: FiGrid, emoji: null,  label: 'Browse',    path: '/shop'      },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9980] md:hidden safe-bottom">
      <div
        className="border-t border-gray-200/50 px-1 pt-2 pb-2"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.10)',
        }}
      >
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-90 relative min-w-[56px]"
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />
                )}

                {/* Icon area */}
                <div className={`w-11 h-9 flex items-center justify-center rounded-xl transition-all
                  ${active ? 'bg-orange-50' : ''}`}>
                  {tab.emoji ? (
                    <span className={`text-[22px] transition-all ${active ? 'scale-110' : 'opacity-55 grayscale'}`}
                      style={{ filter: active ? 'none' : 'grayscale(0.6)' }}>
                      {tab.emoji}
                    </span>
                  ) : (
                    <tab.Icon
                      size={21}
                      className={`transition-all ${active ? 'text-orange-500' : 'text-gray-400'}`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-bold transition-all leading-none
                  ${active ? 'text-orange-500' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
