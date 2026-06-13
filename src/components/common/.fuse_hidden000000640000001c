// ============================================
// PREMIUM DARK BOTTOM NAV — 5 tabs (no search)
// Navy glass matches main Navbar (#0B1729)
// ============================================
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiPackage, FiUser } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav() {
  const location       = useLocation();
  const navigate       = useNavigate();
  const { cartCount }  = useCart();
  const { isLoggedIn } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const tabs = [
    { id: 'home',       Icon: FiHome,         label: 'Home',       path: '/',           onClick: () => navigate('/') },
    { id: 'categories', Icon: FiGrid,          label: 'Categories', path: '/categories', onClick: () => navigate('/categories') },
    { id: 'cart',       Icon: FiShoppingCart,  label: 'Cart',       path: '/cart',       onClick: () => navigate('/cart'),   badge: cartCount },
    { id: 'orders',     Icon: FiPackage,        label: 'Orders',     path: '/orders',     onClick: () => navigate('/orders') },
    { id: 'profile',    Icon: FiUser,           label: isLoggedIn ? 'Profile' : 'Login',
                                                                     path: isLoggedIn ? '/profile' : '/login',
                                                                     onClick: () => navigate(isLoggedIn ? '/profile' : '/login') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9980] md:hidden safe-bottom">
      {/* Hairline glow at top edge */}
      <div className="h-px"
        style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(244,148,28,0.18) 50%, transparent 95%)' }} />

      <div
        className="px-1 pt-2 pb-3"
        style={{
          background: 'linear-gradient(180deg, rgba(9,18,33,0.97) 0%, rgba(7,14,27,0.99) 100%)',
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-end justify-around">
          {tabs.map(tab => {
            const active = tab.path ? isActive(tab.path) : false;
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className="relative flex flex-col items-center gap-1 px-2 py-0.5 rounded-2xl transition-all duration-200 active:scale-90 min-w-0 flex-1"
              >
                {active && (
                  <span className="absolute inset-0 rounded-2xl" style={{ background: 'rgba(244,148,28,0.12)' }} />
                )}

                <div className={`relative flex items-center justify-center w-8 h-6 transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`}>
                  <tab.Icon
                    size={active ? 20 : 19}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? '#f4941c' : 'rgba(255,255,255,0.42)' }}
                  />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black leading-none"
                      style={{ background: '#f4941c' }}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#f4941c' }} />
                  )}
                </div>

                <span className="text-[9px] font-bold tracking-tight leading-none truncate max-w-full transition-all duration-200"
                  style={{ color: active ? '#f4941c' : 'rgba(255,255,255,0.35)' }}>
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
