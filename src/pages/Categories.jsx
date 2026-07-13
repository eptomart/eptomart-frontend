// ============================================
// CATEGORIES PAGE
// Step 1: Choose a vertical (store)
// Step 2: Browse that vertical's categories
// Farmer Fresh & Proteins navigate directly (no sub-category listing)
// ============================================
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiChevronRight, FiGrid, FiArrowRight } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import api from '../utils/api';

// ── Vertical config ───────────────────────────
const VERTICALS = [
  {
    id: 'koyambedu',
    name: 'Koyambedu Daily',
    tagline: 'Fresh fruits & vegetables',
    emoji: '🥬',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    bg: '#f0fdf4',
    border: '#86efac',
    accent: '#16a34a',
    hasCats: true,
  },
  {
    id: 'uzhavar',
    name: 'Farmer Fresh',
    tagline: 'Direct from farms',
    emoji: '🌾',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    bg: '#fffbeb',
    border: '#fcd34d',
    accent: '#d97706',
    path: '/uzhavar',
    hasCats: false,
  },
  {
    id: 'eptofresh',
    name: 'Proteins',
    tagline: 'Fresh meat & seafood',
    emoji: '🥩',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    bg: '#fff1f2',
    border: '#fca5a5',
    accent: '#dc2626',
    path: '/eptofresh',
    hasCats: false,
  },
  {
    id: 'eptomart',
    name: 'Eptomart',
    tagline: 'Electronics, fashion & more',
    emoji: '🛒',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    bg: '#fff7ed',
    border: '#fdba74',
    accent: '#f97316',
    hasCats: true,
  },
];

// ── Color palette for category cards ─────────
const PALETTE = [
  { bg: '#fff7ed', icon: '#f97316' },
  { bg: '#fdf4ff', icon: '#a855f7' },
  { bg: '#ecfeff', icon: '#06b6d4' },
  { bg: '#f0fdf4', icon: '#16a34a' },
  { bg: '#fefce8', icon: '#d97706' },
  { bg: '#fff1f2', icon: '#e11d48' },
  { bg: '#eff6ff', icon: '#2563eb' },
  { bg: '#fdf2f8', icon: '#db2777' },
  { bg: '#f0fdfa', icon: '#0d9488' },
  { bg: '#fafaf9', icon: '#78716c' },
];
const pal = (i) => PALETTE[i % PALETTE.length];

const Skeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex flex-col items-center gap-2">
    <div className="w-14 h-14 rounded-2xl bg-gray-100" />
    <div className="h-3 bg-gray-100 rounded w-3/4" />
  </div>
);

export default function Categories() {
  const navigate = useNavigate();

  // Koyambedu Daily categories
  const [kbdCats,     setKbdCats]     = useState([]);
  const [kbdLoading,  setKbdLoading]  = useState(true);

  // Eptomart categories (lazy — only fetched when selected)
  const [eptoCats,    setEptoCats]    = useState([]);
  const [eptoLoading, setEptoLoading] = useState(false);
  const [eptoLoaded,  setEptoLoaded]  = useState(false);
  const [eptoSelected, setEptoSelected] = useState(null); // parent for sub-cat panel

  // Active vertical
  const [activeId, setActiveId] = useState('koyambedu');

  // Pre-fetch Koyambedu categories on mount
  useEffect(() => {
    api.get('/koyambedu/categories')
      .then(r => setKbdCats(r.data.categories || []))
      .catch(() => {})
      .finally(() => setKbdLoading(false));
  }, []);

  // Lazy-load Eptomart categories
  const loadEptomart = () => {
    if (eptoLoaded || eptoLoading) return;
    setEptoLoading(true);
    api.get('/categories?all=true&moduleType=eptomart')
      .then(r => { setEptoCats(r.data.categories || []); setEptoLoaded(true); })
      .catch(() => {})
      .finally(() => setEptoLoading(false));
  };

  const eptoParents = useMemo(() => eptoCats.filter(c => !c.parentCategory), [eptoCats]);
  const eptoSubCats = useMemo(() => eptoCats.filter(c => !!c.parentCategory), [eptoCats]);
  const eptoSubsOf  = (pid) => eptoSubCats.filter(s => {
    const id = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
    return id?.toString() === pid?.toString();
  });

  const handleVerticalTap = (v) => {
    if (!v.hasCats) {
      navigate(v.path);
      return;
    }
    setActiveId(v.id);
    if (v.id === 'eptomart') loadEptomart();
  };

  const activeVertical = VERTICALS.find(v => v.id === activeId);

  return (
    <>
      <Helmet>
        <title>Browse by Store — Eptomart</title>
        <meta name="description" content="Browse Koyambedu Daily, Farmer Fresh, Proteins and Eptomart — all your stores in one place." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-28">
        <div className="max-w-2xl mx-auto px-4 pt-5">

          {/* Page heading */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <FiGrid size={20} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">Browse by Store</h1>
              <p className="text-xs text-gray-400 mt-0.5">Choose a store, then explore its categories</p>
            </div>
          </div>

          {/* ── Vertical tiles (2×2 grid) ─────────────── */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {VERTICALS.map(v => {
              const isActive = v.id === activeId && v.hasCats;
              return (
                <button
                  key={v.id}
                  onClick={() => handleVerticalTap(v)}
                  className="relative text-left rounded-3xl p-4 transition-all active:scale-95 overflow-hidden"
                  style={{
                    background: v.bg,
                    border: `2px solid ${isActive ? v.accent : v.border}`,
                    boxShadow: isActive ? `0 4px 20px ${v.accent}28` : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Active glow bar at top */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                      style={{ background: v.gradient }} />
                  )}

                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-sm"
                    style={{ background: `${v.accent}18` }}>
                    {v.emoji}
                  </div>

                  <p className="text-sm font-extrabold text-gray-900 leading-tight mb-0.5">{v.name}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mb-3">{v.tagline}</p>

                  <div className="flex items-center gap-0.5 text-[11px] font-bold"
                    style={{ color: v.accent }}>
                    {v.hasCats ? 'View categories' : 'Visit store'}
                    <FiChevronRight size={11} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Koyambedu Daily categories ─────────────── */}
          {activeId === 'koyambedu' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                  <span>🥬</span> Koyambedu Daily — Categories
                </h2>
                <Link to="/koyambedu/shop"
                  className="text-xs font-bold text-green-600 flex items-center gap-0.5">
                  Browse all <FiChevronRight size={11} />
                </Link>
              </div>

              {kbdLoading ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
                </div>
              ) : kbdCats.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">🗂️</p>
                  <p className="text-sm text-gray-500">No categories yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {kbdCats.map((cat, i) => {
                    const p = pal(i);
                    return (
                      <Link
                        key={cat._id}
                        to={`/koyambedu/shop?category=${cat._id}`}
                        className="flex flex-col items-center gap-2 rounded-2xl p-3 border border-gray-100 bg-white active:scale-95 transition-all hover:border-green-200 hover:shadow-sm text-center"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm"
                          style={{ background: p.bg }}>
                          {cat.icon || '🌿'}
                        </div>
                        <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2">
                          {cat.name}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Eptomart categories ───────────────────── */}
          {activeId === 'eptomart' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                  <span>🛒</span> Eptomart — Categories
                </h2>
                <Link to="/shop"
                  className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
                  Browse all <FiChevronRight size={11} />
                </Link>
              </div>

              {eptoLoading ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
                </div>
              ) : eptoParents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">🗂️</p>
                  <p className="text-sm text-gray-500">No categories yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {eptoParents.map((cat, i) => {
                      const p        = pal(i);
                      const childCnt = eptoSubsOf(cat._id).length;
                      const isSel    = eptoSelected?._id === cat._id;
                      return (
                        <button
                          key={cat._id}
                          onClick={() => {
                            if (childCnt > 0) setEptoSelected(isSel ? null : cat);
                            else navigate(`/shop/${cat.slug}`);
                          }}
                          className="flex flex-col items-center gap-2 rounded-2xl p-3 border-2 bg-white active:scale-95 transition-all text-center"
                          style={{ borderColor: isSel ? '#f97316' : '#f3f4f6' }}
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm"
                            style={{ background: p.bg }}>
                            {cat.icon || '📦'}
                          </div>
                          <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2">
                            {cat.name}
                          </p>
                          {childCnt > 0 && (
                            <p className="text-[9px] text-orange-400 font-semibold">{childCnt} sub-cats</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-category panel */}
                  {eptoSelected && eptoSubsOf(eptoSelected._id).length > 0 && (
                    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden mb-4">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>{eptoSelected.icon || '📦'}</span>
                          {eptoSelected.name}
                        </p>
                        <Link to={`/shop/${eptoSelected.slug}`}
                          className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
                          All <FiChevronRight size={11} />
                        </Link>
                      </div>
                      <div className="p-3 grid grid-cols-3 gap-2">
                        {eptoSubsOf(eptoSelected._id).map((sub, i) => {
                          const p = pal(i + 3);
                          return (
                            <Link key={sub._id} to={`/shop/${eptoSelected.slug}?sub=${sub._id}`}
                              className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 border border-gray-100 active:scale-95 transition-all text-center hover:border-orange-200">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                style={{ background: p.bg }}>
                                {sub.icon || eptoSelected.icon || '📦'}
                              </div>
                              <span className="text-[10px] font-semibold text-gray-600 line-clamp-2 leading-tight">
                                {sub.name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

        </div>
      </main>

      <BottomNav />
    </>
  );
}
