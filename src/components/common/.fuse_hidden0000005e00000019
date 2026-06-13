// ============================================
// NAVBAR — Logo · Search (full-screen on mobile) · Cart · User
// ============================================
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiShoppingCart, FiUser, FiX, FiLogOut,
  FiPackage, FiSettings, FiHeart, FiGrid, FiArrowLeft, FiMic,
  FiShoppingBag, FiTruck, FiHome,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import api from '../../utils/api';

const PAGE_TITLES = {
  '/shop':      'Shop',
  '/cart':      'Cart',
  '/orders':    'Orders',
  '/profile':   'Profile',
  '/wishlist':  'Wishlist',
  '/login':     'Login',
  '/checkout':  'Checkout',
  '/koyambedu': 'Koyambedu Daily',
  '/uzhavar':   'Uzhavar Fresh',
  '/product':   'Product',
  '/seller':    'Seller Portal',
  '/admin':     'Admin Panel',
};

function getPageTitle(pathname) {
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key)) return label;
  }
  return 'Back';
}

// ── Full-screen mobile search overlay ─────────────────────────
function MobileSearchOverlay({ onClose }) {
  const navigate   = useNavigate();
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState([]);
  const [loading,  setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef   = useRef(null);
  const debounce   = useRef(null);
  const { user }   = useAuth();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=8`);
        setResults(data.products || []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  }, [query]);

  const submit = async (q) => {
    const v = (q || query).trim();
    if (!v) return;
    onClose();
    navigate(`/shop?search=${encodeURIComponent(v)}`);
    if (results.length === 0 && v.length >= 3) {
      try { await api.post('/settings/product-inquiry', { query: v, name: user?.name || '', email: user?.email || '' }); } catch {}
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); submit(t); };
    rec.start();
  };

  const QUICK = ['Chicken', 'Fish', 'Vegetables', 'Fruits', 'Mutton', 'Rice'];

  return (
    <div className="fixed inset-0 z-[300] md:hidden flex flex-col" style={{ background: '#fff' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #f3f4f6', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={onClose} className="p-1.5 -ml-1 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <FiArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="Search vegetables, chicken, rice…"
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-gray-800 placeholder-gray-400 outline-none text-[15px] font-medium"
            style={{ background: '#f5f5f7', fontSize: '16px' /* prevent iOS zoom */ }}
          />
          {query
            ? <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"><FiX size={16} className="text-gray-400" /></button>
            : <button onClick={startVoice} className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors ${listening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}><FiMic size={16} /></button>
          }
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-gray-400">
            <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Searching…
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            {results.map(p => (
              <button key={p._id} onClick={() => { onClose(); navigate(`/product/${p.slug || p._id}`); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                style={{ borderBottom: '1px solid #f9fafb' }}>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {p.images?.[0]?.url
                    ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.category?.name || ''}</p>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: '#f4941c' }}>
                  ₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}
                </span>
              </button>
            ))}
            <button onClick={() => submit()} className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-bold" style={{ color: '#f4941c', background: '#fff7ed' }}>
              <FiSearch size={14} /> See all results for "{query}"
            </button>
          </>
        )}

        {/* No results */}
        {!loading && query.length >= 3 && results.length === 0 && (
          <div className="text-center px-6 py-12">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-gray-700 font-semibold text-sm">No results for "{query}"</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">We don't stock it yet — but we can source it!</p>
            <button onClick={() => submit()} className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white" style={{ background: '#f4941c' }}>
              📬 Notify Team
            </button>
          </div>
        )}

        {/* Hint: type more */}
        {!loading && query.length > 0 && query.length < 3 && (
          <p className="text-center text-gray-400 text-sm pt-10">Type {3 - query.length} more character{3 - query.length > 1 ? 's' : ''} to search</p>
        )}

        {/* Quick picks when empty */}
        {query.length === 0 && (
          <div className="px-4 pt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => { setQuery(q); }}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 transition-all active:scale-95"
                  style={{ background: '#f5f5f7', border: '1px solid #e5e7eb' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────
export default function Navbar() {
  const { user, isLoggedIn, isAdmin, isSeller, isSuperAdmin, isKoyambeduSeller, isKoyambeduSA, logout } = useAuth();
  const { cartCount }     = useCart();
  const { wishlistCount } = useWishlist();

  const [query,            setQuery]            = useState('');
  const [results,          setResults]          = useState([]);
  const [dropOpen,         setDropOpen]         = useState(false);
  const [showUserMenu,     setShowUserMenu]      = useState(false);
  const [listening,        setListening]        = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isEpfSeller,      setIsEpfSeller]      = useState(false);

  // Check if logged-in user has an EptoFresh seller account
  useEffect(() => {
    if (!isLoggedIn) { setIsEpfSeller(false); return; }
    api.get('/eptofresh/seller/profile')
      .then(r => setIsEpfSeller(r.data?.success === true))
      .catch(() => setIsEpfSeller(false));
  }, [isLoggedIn]);

  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const inputRef      = useRef(null);
  const searchTimeout = useRef(null);
  const wrapRef       = useRef(null);

  const isHome = pathname === '/';

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Desktop live search — min 3 chars
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=6`);
        setResults(data.products || []);
        setDropOpen(true);
      } catch (_) {}
    }, 300);
  }, [query]);

  const submit = (q = query) => {
    if (!q.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
    setQuery(''); setResults([]); setDropOpen(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') { setDropOpen(false); setQuery(''); }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); submit(t); };
    rec.start();
  };

  const goBack = () => { if (window.history.length > 2) navigate(-1); else navigate('/'); };

  return (
    <>
      {mobileSearchOpen && <MobileSearchOverlay onClose={() => setMobileSearchOpen(false)} />}

      <header className="sticky top-0 z-50 safe-top shadow-lg" style={{ background: '#0B1729' }}>
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center h-14 gap-2">

            {/* Back button (mobile only, not on home) */}
            {!isHome && (
              <button onClick={goBack}
                className="md:hidden flex items-center text-white/80 hover:text-white transition-colors flex-shrink-0"
                aria-label="Go back">
                <FiArrowLeft size={20} />
              </button>
            )}

            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0" style={{ lineHeight: 0 }}>
              <img src="/logo-v3.png?v=3" alt="Eptomart"
                style={{ height: 34, width: 'auto', objectFit: 'contain', display: 'block' }} />
            </Link>

            {/* Mobile: search trigger pill */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden flex-1 mx-2 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <FiSearch size={14} className="text-gray-400 shrink-0" />
              <span className="text-gray-400 text-sm truncate">Search products…</span>
            </button>

            {/* Desktop: real inline search */}
            <div ref={wrapRef} className="hidden md:flex flex-1 mx-4 relative">
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => results.length > 0 && setDropOpen(true)}
                  placeholder="Search products, brands…"
                  className="w-full pl-8 pr-9 py-2.5 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white/15 transition-all"
                />
                {query
                  ? <button type="button" onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5">
                      <FiX size={14} />
                    </button>
                  : <button type="button" onClick={startVoice}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors ${listening ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-orange-400'}`}>
                      <FiMic size={14} />
                    </button>
                }
              </form>
              {dropOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-xl mt-1 border z-50 overflow-hidden pop-in" style={{ transformOrigin: 'top center' }}>
                  {results.map(p => (
                    <Link key={p._id} to={`/product/${p.slug || p._id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
                      onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}>
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                        <p className="text-xs font-bold" style={{ color: '#f4941c' }}>₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}</p>
                      </div>
                    </Link>
                  ))}
                  <button onClick={() => submit()} className="w-full px-4 py-2.5 text-xs font-bold text-orange-500 bg-orange-50 flex items-center gap-2">
                    <FiSearch size={11} /> See all results for "{query}"
                  </button>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isLoggedIn && (
                <button onClick={() => navigate('/wishlist')}
                  className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex">
                  <FiHeart size={20} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </button>
              )}

              <button onClick={() => navigate('/cart')}
                className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                <FiShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: '#f4941c' }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {isLoggedIn ? (
                <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                      style={{ background: '#f4941c' }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-200 whitespace-nowrap">
                      {user?.name?.split(' ')[0]}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-12 bg-white shadow-2xl rounded-2xl p-2 w-56 border z-50 pop-in">
                      {/* User header */}
                      <div className="px-4 py-3 mb-1 rounded-xl" style={{ background: 'linear-gradient(135deg,#fff8ee,#ffecd0)' }}>
                        <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                        {user?.email && <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>}
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}><FiUser size={15} /> My Profile</Link>
                      <Link to="/orders" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}><FiPackage size={15} /> My Orders</Link>
                      <Link to="/cart" className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}>
                        <span className="flex items-center gap-3"><FiShoppingCart size={15} /> My Cart</span>
                        {cartCount > 0 && <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: '#f4941c' }}>{cartCount}</span>}
                      </Link>
                      <Link to="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}><FiHeart size={15} /> Wishlist</Link>
                      {(isSeller || isSuperAdmin) && (
                        <Link to="/seller/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm font-semibold" style={{ color: '#f4941c' }} onClick={() => setShowUserMenu(false)}>
                          <FiGrid size={15} /> Seller Portal
                        </Link>
                      )}
                      {isEpfSeller && (
                        <Link to="/eptofresh/seller" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm font-semibold" style={{ color: '#f4941c' }} onClick={() => setShowUserMenu(false)}><span>🥩</span> Protein Seller Portal</Link>
                      )}
                      {isKoyambeduSeller && (
                        <Link to="/koyambedu/seller" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 text-sm font-semibold text-green-700" onClick={() => setShowUserMenu(false)}><span>🥬</span> Koyambedu Seller</Link>
                      )}
                      {isKoyambeduSA && (
                        <Link to="/koyambedu/seller-admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 text-sm font-semibold text-green-700" onClick={() => setShowUserMenu(false)}><span>🏪</span> Koyambedu Admin</Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm font-semibold" style={{ color: '#f4941c' }} onClick={() => setShowUserMenu(false)}>
                          <FiSettings size={15} /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-1" />
                      <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-sm text-red-500">
                        <FiLogOut size={15} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="ml-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap" style={{ background: '#f4941c' }}>
                  Login
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* ── Desktop category strip — premium marketplace second row ── */}
        <div className="hidden md:block border-t border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="max-w-7xl mx-auto px-3">
            <nav className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-hide">
              {[
                { label: 'All Products',    to: '/shop',       dot: null },
                { label: 'Categories',      to: '/categories', dot: null },
                { label: 'Koyambedu Daily', to: '/koyambedu',  dot: '#34d399' },
                { label: 'Uzhavar Fresh',   to: '/uzhavar',    dot: '#a3e635' },
                { label: 'EptoFresh',       to: '/eptofresh',  dot: '#fb923c' },
              ].map(item => {
                const active = pathname === item.to || (item.to !== '/shop' && pathname.startsWith(item.to));
                return (
                  <Link key={item.to} to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5
                      ${active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'}`}>
                    {item.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />}
                    {item.label}
                  </Link>
                );
              })}
              <div className="flex-1" />
              <Link to="/seller/profile"
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all hover:brightness-110 inline-flex items-center gap-1.5"
                style={{ color: '#f4941c', background: 'rgba(244,148,28,0.10)', border: '1px solid rgba(244,148,28,0.25)' }}>
                <FiShoppingBag size={12} /> Sell on Eptomart
              </Link>
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap pl-2 inline-flex items-center gap-1.5">
                <FiTruck size={12} style={{ color: '#6DB651' }} /> Free delivery above ₹999
              </span>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
