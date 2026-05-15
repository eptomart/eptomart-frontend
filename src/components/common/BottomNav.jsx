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
      {/* Ultra-thin top edge line */}
      <div className="h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06) 20%, rgba(0,0,0,0.06) 80%, transparent)' }} />
      <div
        className="px-2 pt-1.5 pb-2"
        style={{
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'saturate(200%) blur(36px)',
          WebkitBackdropFilter: 'saturate(200%) blur(36px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-end justify-around">
          {tabs.map(tab => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-2xl transition-all duration-200 active:scale-90 relative"
              >
                {/* Soft active pill */}
                {active && (
                  <span className="absolute inset-0 rounded-2xl"
                    style={{ background: 'rgba(249,115,22,0.09)' }} />
                )}

                {/* Icon */}
                <div className={`relative flex items-center justify-center w-10 h-8 transition-all duration-200
                  ${active ? 'scale-110' : 'scale-100'}`}>
                  {tab.emoji ? (
                    <span
                      className={`text-[22px] transition-all duration-200 ${active ? '' : 'opacity-45'}`}
                      style={{ filter: active ? 'none' : 'grayscale(1) brightness(1.1)' }}
                    >
                      {tab.emoji}
                    </span>
                  ) : (
                    <tab.Icon
                      size={20}
                      className={`transition-all duration-200 ${active ? 'text-orange-500' : 'text-gray-400'}`}
                      strokeWidth={active ? 2.4 : 1.7}
                    />
                  )}
                  {/* Active indicator dot */}
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[9.5px] font-bold tracking-tight leading-none transition-all duration-200
                  ${active ? 'text-orange-500' : 'text-gray-400/75'}`}>
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
