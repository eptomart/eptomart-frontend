// ============================================
// SHARED GLASS BOTTOM NAV — 6 tabs
// Home · Shop · Cart · Orders · Search · Profile
// ============================================
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiPackage, FiSearch, FiUser } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { cartCount } = useCart();
  const { isLoggedIn } = useAuth();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = () => {
    // Focus search input if on home page, else navigate to shop
    const inp = document.getElementById('mobile-search-input');
    if (inp) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => inp.focus(), 300);
    } else {
      navigate('/shop');
    }
  };

  const tabs = [
    {
      id: 'home',
      Icon: FiHome,
      label: 'Home',
      path: '/',
      onClick: () => navigate('/'),
    },
    {
      id: 'shop',
      Icon: FiGrid,
      label: 'Categories',
      path: '/shop',
      onClick: () => navigate('/shop'),
    },
    {
      id: 'search',
      Icon: FiSearch,
      label: 'Search',
      path: null,
      onClick: handleSearch,
    },
    {
      id: 'cart',
      Icon: FiShoppingCart,
      label: 'Cart',
      path: '/cart',
      badge: cartCount,
      onClick: () => navigate('/cart'),
    },
    {
      id: 'orders',
      Icon: FiPackage,
      label: 'Orders',
      path: '/orders',
      onClick: () => navigate('/orders'),
    },
    {
      id: 'profile',
      Icon: FiUser,
      label: isLoggedIn ? 'Profile' : 'Login',
      path: isLoggedIn ? '/profile' : '/login',
      onClick: () => navigate(isLoggedIn ? '/profile' : '/login'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9980] md:hidden safe-bottom">
      {/* Ultra-thin top edge line */}
      <div className="h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.07) 20%, rgba(0,0,0,0.07) 80%, transparent)' }} />

      <div
        className="px-1 pt-1 pb-2"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'saturate(180%) blur(32px)',
          WebkitBackdropFilter: 'saturate(180%) blur(32px)',
          boxShadow: '0 -6px 30px rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex items-end justify-around">
          {tabs.map(tab => {
            const active = tab.path ? isActive(tab.path) : false;
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className="relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all duration-200 active:scale-90 min-w-0 flex-1"
              >
                {/* Soft active pill background */}
                {active && (
                  <span className="absolute inset-0 rounded-2xl"
                    style={{ background: 'rgba(249,115,22,0.09)' }} />
                )}

                {/* Icon + badge */}
                <div className={`relative flex items-center justify-center w-8 h-6 transition-all duration-200
                  ${active ? 'scale-110' : 'scale-100'}`}>
                  <tab.Icon
                    size={19}
                    className={`transition-all duration-200 ${active ? 'text-orange-500' : 'text-gray-400'}`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {/* Cart badge */}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black leading-none"
                      style={{ background: '#f4941c' }}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                  {/* Active dot */}
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[9px] font-bold tracking-tight leading-none transition-all duration-200 truncate max-w-full
                  ${active ? 'text-orange-500' : 'text-gray-400/80'}`}>
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
