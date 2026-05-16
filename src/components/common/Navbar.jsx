// ============================================
// NAVBAR — Search on every screen + Back button
// ============================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiShoppingCart, FiUser, FiX, FiLogOut,
  FiPackage, FiSettings, FiHeart, FiGrid, FiArrowLeft, FiMic,
  FiChevronDown, FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import api from '../../utils/api';

// ── Page titles for back-button label ─────────────────────────
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

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, isSeller, isSuperAdmin, isKoyambeduSeller, isKoyambeduSA, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [dropOpen,     setDropOpen]     = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [listening,    setListening]    = useState(false);
  const [catMenuOpen,  setCatMenuOpen]  = useState(false);
  const [categories,   setCategories]   = useState([]);   // {parent, subs[]}
  const [hoveredCat,   setHoveredCat]   = useState(null);

  const navigate       = useNavigate();
  const { pathname }   = useLocation();
  const inputRef       = useRef(null);
  const searchTimeout  = useRef(null);
  const wrapRef        = useRef(null);
  const catMenuRef     = useRef(null);

  // Fetch categories for mega-menu (desktop)
  useEffect(() => {
    api.get('/categories?all=true&moduleType=eptomart')
      .then(res => {
        const all = res.data.categories || [];
        const parents = all.filter(c => !c.parentCategory);
        const built = parents.map(p => ({
          parent: p,
          subs: all.filter(c => {
            const pid = typeof c.parentCategory === 'object' ? c.parentCategory?._id : c.parentCategory;
            return pid?.toString() === p._id?.toString();
          }),
        }));
        setCategories(built);
        if (built.length > 0) setHoveredCat(built[0].parent._id);
      })
      .catch(() => {});
  }, []);

  // Close cat menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) setCatMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isHome       = pathname === '/';
  const isKoyambedu  = pathname.startsWith('/koyambedu');
  const isUzhavar    = pathname.startsWith('/uzhavar');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setDropOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
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
    setQuery('');
    setResults([]);
    setDropOpen(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') { setDropOpen(false); setQuery(''); }
  };

  // Voice search
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.onstart = () => setListening(true);
    rec.onend   = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setQuery(t);
      submit(t);
    };
    rec.start();
  };

  // Back navigation — go back if history exists, else go home
  const goBack = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 safe-top shadow-lg" style={{ background: '#0B1729' }}>
      <div className="max-w-7xl mx-auto px-3">

        {/* ── Row 1: Logo / Back · Actions ── */}
        <div className="flex items-center h-14 gap-2">

          {/* Back button (mobile only, not on home) */}
          {!isHome && (
            <button
              onClick={goBack}
              className="md:hidden flex items-center gap-1.5 text-white/80 hover:text-white transition-colors flex-shrink-0 pr-1"
              aria-label="Go back"
            >
              <FiArrowLeft size={20} />
              <span className="text-xs font-semibold text-white/70 whitespace-nowrap max-w-[90px] truncate">
                {getPageTitle(pathname)}
              </span>
            </button>
          )}

          {/* Logo — shrinks on non-home mobile to leave room for back btn */}
          <Link to="/" className="flex items-center flex-shrink-0" style={{ lineHeight: 0 }}>
            <img
              src="/logo-v3.png?v=3"
              alt="Eptomart"
              style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>

          {/* Desktop search bar */}
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}
            ref={wrapRef}
            className="hidden md:flex flex-1 mx-4 relative">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => results.length > 0 && setDropOpen(true)}
                placeholder="Search products, brands…"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white/15 transition-all"
              />
              {query
                ? <button type="button" onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                    <FiX size={14} />
                  </button>
                : <button type="button" onClick={startVoice}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${listening ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-orange-400'}`}>
                    <FiMic size={14} />
                  </button>
              }
              {/* Desktop dropdown */}
              {dropOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-xl mt-1 border z-50 overflow-hidden">
                  {results.map(p => (
                    <Link key={p._id} to={`/product/${p.slug || p._id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                      onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}>
                      <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</p>
                        <p className="text-xs font-semibold" style={{ color: '#f4941c' }}>
                          ₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <button onClick={() => submit()}
                    className="w-full px-4 py-2.5 text-xs font-bold text-orange-500 border-t border-gray-100 hover:bg-orange-50 transition-colors text-left flex items-center gap-2">
                    <FiSearch size={12} /> See all results for "{query}"
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-0.5 ml-auto">

            {/* Wishlist (desktop only) */}
            {isLoggedIn && (
              <button onClick={() => navigate('/wishlist')}
                className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex">
                <FiHeart size={21} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart */}
            <button onClick={() => navigate('/cart')}
              className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <FiShoppingCart size={21} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: '#f4941c' }}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* User */}
            {isLoggedIn ? (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ background: '#f4941c' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-200 whitespace-nowrap">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 bg-white shadow-2xl rounded-2xl p-2 w-52 border z-50">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}>
                      <FiUser size={15} /> My Profile
                    </Link>
                    <Link to="/orders" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}>
                      <FiPackage size={15} /> My Orders
                    </Link>
                    <Link to="/cart" className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}>
                      <span className="flex items-center gap-3"><FiShoppingCart size={15} /> My Cart</span>
                      {cartCount > 0 && <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: '#f4941c' }}>{cartCount}</span>}
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-gray-700" onClick={() => setShowUserMenu(false)}>
                      <FiHeart size={15} /> Wishlist
                    </Link>
                    {(isSeller || isSuperAdmin) && (
                      <Link to="/seller/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm font-semibold" style={{ color: '#f4941c' }} onClick={() => setShowUserMenu(false)}>
                        <FiGrid size={15} /> Seller Portal
                      </Link>
                    )}
                    {isKoyambeduSeller && (
                      <Link to="/koyambedu/seller" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 text-sm font-semibold text-green-700" onClick={() => setShowUserMenu(false)}>
                        <span>🥬</span> Koyambedu Seller
                      </Link>
                    )}
                    {isKoyambeduSA && (
                      <Link to="/koyambedu/seller-admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 text-sm font-semibold text-green-700" onClick={() => setShowUserMenu(false)}>
                        <span>🏪</span> Koyambedu Admin
                      </Link>
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

        {/* ── Row 2: Mobile search bar — always visible ── */}
        <div className="md:hidden pb-2.5" ref={wrapRef}>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => results.length > 0 && setDropOpen(true)}
              placeholder="Search products, brands…"
              className="w-full pl-8 pr-9 py-2 rounded-xl text-sm bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white/15 transition-all"
            />
            {query
              ? <button type="button" onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-0.5">
                  <FiX size={14} />
                </button>
              : <button type="button" onClick={startVoice}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors ${listening ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-orange-400'}`}>
                  <FiMic size={14} />
                </button>
            }
            {/* Mobile dropdown */}
            {dropOpen && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-xl mt-1 border z-50 overflow-hidden">
                {results.map(p => (
                  <Link key={p._id} to={`/product/${p.slug || p._id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
                    onClick={() => { setQuery(''); setResults([]); setDropOpen(false); }}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.images?.[0]?.url
                        ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-xs font-bold" style={{ color: '#f4941c' }}>
                        ₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                ))}
                <button onClick={() => submit()}
                  className="w-full px-4 py-2.5 text-xs font-bold text-orange-500 bg-orange-50 flex items-center gap-2">
                  <FiSearch size={11} /> See all results for "{query}"
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Sub-module strip ── */}
        <div className="flex items-center gap-1 pb-2 border-t border-white/10 pt-2 -mx-3 px-3 overflow-x-auto scrollbar-hide">

          {/* Desktop-only mega-menu trigger */}
          <div className="relative hidden md:block flex-shrink-0" ref={catMenuRef}>
            <button
              onClick={() => setCatMenuOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all"
              style={{
                background: catMenuOpen ? 'rgba(244,148,28,0.35)' : 'rgba(244,148,28,0.12)',
                color: '#fff',
                border: catMenuOpen ? '1px solid rgba(244,148,28,0.5)' : '1px solid transparent',
              }}
            >
              🗂️ Categories <FiChevronDown size={11} className={`transition-transform ${catMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mega-menu dropdown */}
            {catMenuOpen && categories.length > 0 && (
              <div
                className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] flex overflow-hidden"
                style={{ width: 560, maxHeight: 420 }}
              >
                {/* Left: parent list */}
                <div className="w-48 bg-gray-50 border-r border-gray-100 overflow-y-auto flex-shrink-0">
                  {categories.map(({ parent }) => (
                    <button
                      key={parent._id}
                      onMouseEnter={() => setHoveredCat(parent._id)}
                      onClick={() => { navigate(`/shop/${parent.slug}`); setCatMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold transition-colors"
                      style={{
                        background: hoveredCat === parent._id ? '#fff7ed' : 'transparent',
                        color: hoveredCat === parent._id ? '#f4941c' : '#374151',
                        borderLeft: hoveredCat === parent._id ? '3px solid #f4941c' : '3px solid transparent',
                      }}
                    >
                      <span className="text-base">{parent.icon || '📦'}</span>
                      <span className="truncate">{parent.name}</span>
                    </button>
                  ))}
                </div>

                {/* Right: sub-categories */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {categories.filter(c => c.parent._id === hoveredCat).map(({ parent, subs }) => (
                    <div key={parent._id}>
                      <Link
                        to={`/shop/${parent.slug}`}
                        onClick={() => setCatMenuOpen(false)}
                        className="flex items-center gap-2 mb-3 group"
                      >
                        <span className="font-extrabold text-gray-800 text-sm group-hover:text-orange-500 transition-colors">
                          All {parent.name}
                        </span>
                        <FiChevronRight size={13} className="text-orange-400" />
                      </Link>
                      {subs.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {subs.map(sub => (
                            <Link
                              key={sub._id}
                              to={`/shop/${parent.slug}?sub=${sub._id}`}
                              onClick={() => setCatMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 text-xs font-semibold text-gray-600 hover:text-orange-600 transition-colors"
                            >
                              <span>{sub.icon || parent.icon || '📦'}</span>
                              <span className="truncate">{sub.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No sub-categories</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block h-4 w-px bg-white/15 flex-shrink-0" />

          <Link to="/koyambedu"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: isKoyambedu ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.18)',
              color: '#fff',
              border: isKoyambedu ? '1px solid rgba(16,185,129,0.6)' : '1px solid transparent',
            }}>
            🥬 Koyambedu Daily
          </Link>

          <Link to="/uzhavar"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: isUzhavar ? 'rgba(132,204,22,0.4)' : 'rgba(132,204,22,0.15)',
              color: '#fff',
              border: isUzhavar ? '1px solid rgba(132,204,22,0.55)' : '1px solid transparent',
            }}>
            🌾 Uzhavar Fresh
          </Link>

          <div className="h-4 w-px bg-white/15 mx-1 flex-shrink-0" />

          <button
            onClick={() => {
              const el = document.getElementById('section-featured');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else { navigate('/'); setTimeout(() => document.getElementById('section-featured')?.scrollIntoView({ behavior: 'smooth' }), 400); }
            }}
            className="text-[11px] text-gray-400 hover:text-white px-2 py-1.5 whitespace-nowrap transition-colors flex-shrink-0">
            ✨ Featured
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('section-flash');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else { navigate('/'); setTimeout(() => document.getElementById('section-flash')?.scrollIntoView({ behavior: 'smooth' }), 400); }
            }}
            className="text-[11px] text-gray-400 hover:text-white px-2 py-1.5 whitespace-nowrap transition-colors flex-shrink-0">
            ⚡ Flash Deals
          </button>

          <Link to="/shop?sort=-createdAt"
            className="text-[11px] text-gray-400 hover:text-white px-2 py-1.5 whitespace-nowrap transition-colors flex-shrink-0">
            🆕 New
          </Link>
        </div>

      </div>
    </header>
  );
}
