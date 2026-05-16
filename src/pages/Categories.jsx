// ============================================
// CATEGORIES PAGE — Browse all categories
// Shown when tapping Categories tab in bottom nav
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiChevronRight } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import api from '../utils/api';

// Fallback icons for categories without an emoji
const FALLBACK_COLORS = [
  '#f97316', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#3b82f6', '#ec4899',
  '#14b8a6', '#a855f7', '#f43f5e', '#22c55e',
];

function colorFor(i) { return FALLBACK_COLORS[i % FALLBACK_COLORS.length]; }

// ── Skeleton ───────────────────────────────────────────────────
const CatSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
    <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-2" />
    <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto" />
  </div>
);

export default function Categories() {
  const [allCats, setAllCats] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/categories?all=true')
      .then(res => setAllCats(res.data.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parentCats = useMemo(() => allCats.filter(c => !c.parentCategory), [allCats]);
  const subCats    = useMemo(() => allCats.filter(c => !!c.parentCategory), [allCats]);

  const subsOf = (parentId) =>
    subCats.filter(s => {
      const pid = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
      return pid?.toString() === parentId?.toString();
    });

  return (
    <>
      <Helmet>
        <title>All Categories — Eptomart</title>
        <meta name="description" content="Browse all product categories on Eptomart — groceries, masalas, dry fruits, oils, snacks and more." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-10">

        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-2">
          <h1 className="text-xl font-extrabold text-gray-900">All Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${parentCats.length} categories · ${subCats.length} sub-categories`}
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-6 space-y-8">

          {loading ? (
            /* Skeleton */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-2">
              {[...Array(12)].map((_, i) => <CatSkeleton key={i} />)}
            </div>
          ) : parentCats.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">🗂️</p>
              <p className="text-lg font-bold text-gray-600">No categories yet</p>
              <p className="text-sm text-gray-400 mt-1">Ask the admin to add categories from the admin panel.</p>
            </div>
          ) : (
            parentCats.map((cat, idx) => {
              const children = subsOf(cat._id);
              const color    = colorFor(idx);
              return (
                <section key={cat._id}>
                  {/* Parent category header */}
                  <Link
                    to={`/shop/${cat.slug}`}
                    className="flex items-center justify-between mb-3 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                        style={{ background: `${color}18`, border: `1.5px solid ${color}30` }}
                      >
                        {cat.icon || '📦'}
                      </div>
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm leading-tight">{cat.name}</p>
                        {children.length > 0 && (
                          <p className="text-xs text-gray-400">{children.length} sub-categor{children.length === 1 ? 'y' : 'ies'}</p>
                        )}
                      </div>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-orange-500 group-hover:gap-1.5 transition-all">
                      Shop all <FiChevronRight size={13} />
                    </span>
                  </Link>

                  {/* Sub-categories grid */}
                  {children.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {children.map((sub, si) => (
                        <Link
                          key={sub._id}
                          to={`/shop/${cat.slug}?sub=${sub._id}`}
                          className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3.5 px-1 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-95 transition-all group"
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: `${colorFor(idx + si + 1)}14` }}
                          >
                            {sub.icon || cat.icon || '📦'}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight line-clamp-2 w-full px-1">
                            {sub.name}
                          </span>
                        </Link>
                      ))}

                      {/* "All X" card at end */}
                      <Link
                        to={`/shop/${cat.slug}`}
                        className="flex flex-col items-center gap-1.5 bg-orange-50 rounded-2xl py-3.5 px-1 border border-orange-100 hover:bg-orange-100 active:scale-95 transition-all"
                      >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                          style={{ background: `${color}18` }}>
                          <FiChevronRight size={20} style={{ color }} />
                        </div>
                        <span className="text-[11px] font-bold text-orange-600 text-center leading-tight">
                          All {cat.name}
                        </span>
                      </Link>
                    </div>
                  ) : (
                    /* No sub-cats: show a single big card */
                    <Link
                      to={`/shop/${cat.slug}`}
                      className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-95 transition-all"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${color}14` }}
                      >
                        {cat.icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800">{cat.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Tap to browse products</p>
                      </div>
                      <FiChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                    </Link>
                  )}
                </section>
              );
            })
          )}
        </div>
      </main>

      <BottomNav />
    </>
  );
}
