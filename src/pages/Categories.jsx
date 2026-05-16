// ============================================
// CATEGORIES PAGE — Browse all categories
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiChevronRight, FiGrid } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import api from '../utils/api';

const PALETTE = [
  { bg: '#fff7ed', border: '#fed7aa', icon: '#f97316' },
  { bg: '#fdf4ff', border: '#e9d5ff', icon: '#a855f7' },
  { bg: '#ecfeff', border: '#a5f3fc', icon: '#06b6d4' },
  { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a' },
  { bg: '#fefce8', border: '#fde68a', icon: '#d97706' },
  { bg: '#fff1f2', border: '#fecdd3', icon: '#e11d48' },
  { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb' },
  { bg: '#fdf2f8', border: '#f9a8d4', icon: '#db2777' },
  { bg: '#f0fdfa', border: '#99f6e4', icon: '#0d9488' },
  { bg: '#fafaf9', border: '#d6d3d1', icon: '#78716c' },
];

const pal = (i) => PALETTE[i % PALETTE.length];

const CatSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex flex-col items-center gap-2">
    <div className="w-14 h-14 rounded-2xl bg-gray-100" />
    <div className="h-3 bg-gray-100 rounded w-3/4" />
    <div className="h-2 bg-gray-100 rounded w-1/2" />
  </div>
);

export default function Categories() {
  const [allCats, setAllCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected parent for sub-cat drill-down
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories?all=true')
      .then(res => setAllCats(res.data.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parents = useMemo(() => allCats.filter(c => !c.parentCategory), [allCats]);
  const subCats = useMemo(() => allCats.filter(c => !!c.parentCategory), [allCats]);

  const subsOf = (pid) => subCats.filter(s => {
    const id = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
    return id?.toString() === pid?.toString();
  });

  const activeSubs = selected ? subsOf(selected._id) : [];

  return (
    <>
      <Helmet>
        <title>All Categories — Eptomart</title>
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 pt-5">

          {/* Page title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <FiGrid size={20} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">All Categories</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Loading…' : `${parents.length} categories · ${subCats.length} sub-categories`}
              </p>
            </div>
          </div>

          {/* Parent category grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
              {[...Array(10)].map((_, i) => <CatSkeleton key={i} />)}
            </div>
          ) : parents.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-3">🗂️</p>
              <p className="text-lg font-bold text-gray-600 mb-1">No categories yet</p>
              <p className="text-sm text-gray-400">Ask the admin to seed categories from the admin panel.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {parents.map((cat, i) => {
                  const p = pal(i);
                  const childCount = subsOf(cat._id).length;
                  const isSelected = selected?._id === cat._id;
                  return (
                    <button
                      key={cat._id}
                      onClick={() => {
                        if (childCount === 0) { navigate(`/shop/${cat.slug}`); return; }
                        setSelected(isSelected ? null : cat);
                      }}
                      className={`flex flex-col items-center gap-2.5 rounded-2xl p-4 border-2 transition-all active:scale-95 text-center
                        ${isSelected
                          ? 'border-orange-400 shadow-md shadow-orange-100'
                          : 'border-transparent hover:border-orange-200 hover:shadow-sm'
                        }`}
                      style={{ background: isSelected ? '#fff7ed' : p.bg }}
                    >
                      {/* Icon circle */}
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
                        style={{ background: `${p.icon}18`, border: `1.5px solid ${p.icon}30` }}>
                        {cat.icon || '📦'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">{cat.name}</p>
                        {childCount > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{childCount} sub-categories</p>
                        )}
                      </div>
                      {childCount === 0 && (
                        <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5">
                          Shop <FiChevronRight size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-category panel — shown when a parent is selected */}
              {selected && activeSubs.length > 0 && (
                <div className="mb-8 bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selected.icon || '📦'}</span>
                      <p className="font-extrabold text-gray-900 text-sm">{selected.name}</p>
                    </div>
                    <Link to={`/shop/${selected.slug}`}
                      className="text-xs font-bold text-orange-500 flex items-center gap-0.5 hover:gap-1 transition-all">
                      All <FiChevronRight size={12} />
                    </Link>
                  </div>

                  {/* Sub-cat grid */}
                  <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {activeSubs.map((sub, i) => {
                      const p = pal(i + 3);
                      return (
                        <Link key={sub._id} to={`/shop/${selected.slug}?sub=${sub._id}`}
                          className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 border border-gray-100 bg-white hover:border-orange-200 hover:shadow-md active:scale-95 transition-all text-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                            style={{ background: `${p.icon}14` }}>
                            {sub.icon || selected.icon || '📦'}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 line-clamp-2 leading-tight w-full px-0.5">
                            {sub.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full list — all parents with their sub-cats (desktop friendly) */}
              <div className="space-y-6 pb-4">
                {parents.map((cat, i) => {
                  const children = subsOf(cat._id);
                  if (children.length === 0) return null;
                  const p = pal(i);
                  return (
                    <section key={cat._id}>
                      <Link to={`/shop/${cat.slug}`}
                        className="flex items-center gap-2 mb-3 group">
                        <span className="text-lg">{cat.icon || '📦'}</span>
                        <span className="font-extrabold text-gray-800 text-sm group-hover:text-orange-600 transition-colors">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-gray-400">({children.length})</span>
                        <FiChevronRight size={12} className="text-orange-400 ml-auto" />
                      </Link>

                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {children.map(sub => (
                          <Link key={sub._id} to={`/shop/${cat.slug}?sub=${sub._id}`}
                            className="flex-shrink-0 flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md active:scale-95 transition-all text-xs font-semibold text-gray-700">
                            <span>{sub.icon || cat.icon || '📦'}</span>
                            {sub.name}
                          </Link>
                        ))}
                        <Link to={`/shop/${cat.slug}`}
                          className="flex-shrink-0 flex items-center gap-1 bg-orange-50 rounded-xl px-3 py-2 border border-orange-100 text-xs font-bold text-orange-600">
                          All <FiChevronRight size={11} />
                        </Link>
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  );
}
