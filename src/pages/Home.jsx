// ============================================
// HOME PAGE — Premium Amazon/Flipkart-style
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowRight, FiTruck, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiZap, FiStar, FiPackage,
} from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ProductCard from '../components/product/ProductCard';
import RecentlyViewed from '../components/product/RecentlyViewed';
import CategoryIcon from '../components/common/CategoryIcon';
import { ProductGridSkeleton } from '../components/common/Loader';
import api from '../utils/api';

// ── Hero slides ──────────────────────────────────────────────
const SLIDES = [
  {
    bg:       'from-orange-600 via-orange-500 to-amber-400',
    tag:      '🇮🇳 India\'s Fastest Growing Store',
    headline: 'Shop Everything,\nDelivered Fast 🚀',
    sub:      'Quality products at the best prices from verified local sellers.',
    cta:      { label: 'Shop Now', to: '/shop' },
    cta2:     { label: 'Browse Deals', to: '/shop' },
    emoji:    '🛒',
    accent:   'bg-white/10',
  },
  {
    bg:       'from-violet-700 via-purple-600 to-indigo-500',
    tag:      '⚡ Flash Deals — Limited Time',
    headline: 'Grab Deals\nBefore They\'re Gone!',
    sub:      'Up to 70% off on top products. New deals added every day.',
    cta:      { label: 'View Deals', to: '/shop?sort=-discount' },
    cta2:     { label: 'New Arrivals', to: '/shop?sort=-createdAt' },
    emoji:    '⚡',
    accent:   'bg-white/10',
  },
  {
    bg:       'from-emerald-600 via-teal-500 to-cyan-500',
    tag:      '🌿 Fresh & Local Products',
    headline: 'Support Local\nSellers Across India',
    sub:      'Thousands of verified local sellers. Fresh products, faster delivery.',
    cta:      { label: 'Explore Now', to: '/shop' },
    cta2:     { label: 'Sell With Us', to: '/seller/register' },
    emoji:    '🌿',
    accent:   'bg-white/10',
  },
];

// ── Category accent colours (icon bg + border + label) ───────
const CAT_ACCENTS = [
  { bg: 'bg-orange-100',  border: 'border-orange-200',  text: 'text-orange-600'  },
  { bg: 'bg-violet-100',  border: 'border-violet-200',  text: 'text-violet-600'  },
  { bg: 'bg-sky-100',     border: 'border-sky-200',     text: 'text-sky-600'     },
  { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-600' },
  { bg: 'bg-pink-100',    border: 'border-pink-200',    text: 'text-pink-600'    },
  { bg: 'bg-amber-100',   border: 'border-amber-200',   text: 'text-amber-600'   },
  { bg: 'bg-indigo-100',  border: 'border-indigo-200',  text: 'text-indigo-600'  },
  { bg: 'bg-teal-100',    border: 'border-teal-200',    text: 'text-teal-600'    },
];

// ── Countdown timer hook ────────────────────────────────────
function useCountdown(hours = 4) {
  const end = useRef(Date.now() + hours * 3600_000).current;
  const [left, setLeft] = useState(end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  const h = String(Math.floor(left / 3600_000)).padStart(2, '0');
  const m = String(Math.floor((left % 3600_000) / 60_000)).padStart(2, '0');
  const s = String(Math.floor((left % 60_000) / 1_000)).padStart(2, '0');
  return { h, m, s };
}

// ── Hero Carousel ────────────────────────────────────────────
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const timer = useRef(null);

  const go = (n) => setActive((active + n + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    timer.current = setInterval(() => setActive(a => (a + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer.current);
  }, []);

  const slide = SLIDES[active];

  return (
    <section className={`bg-gradient-to-br ${slide.bg} text-white relative overflow-hidden transition-all duration-700`}>
      {/* decorative circles */}
      <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-20 bg-white" />
      <div className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full opacity-10 bg-white" />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10 md:py-20 relative z-10">
        <div className="max-w-2xl">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-2 sm:mb-3">
            {slide.tag}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-2 sm:mb-4 leading-tight whitespace-pre-line drop-shadow">
            {slide.headline}
          </h1>
          <p className="hidden sm:block text-white/80 text-base md:text-lg mb-6 max-w-lg">
            {slide.sub}
          </p>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <Link
              to={slide.cta.to}
              className="bg-white text-gray-900 font-bold py-2 px-5 sm:py-3 sm:px-8 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 active:scale-95 text-sm sm:text-base"
            >
              {slide.cta.label} <FiArrowRight />
            </Link>
            <Link
              to={slide.cta2.to}
              className="border-2 border-white/60 text-white font-semibold py-2 px-5 sm:py-3 sm:px-8 rounded-xl hover:bg-white/10 transition-all active:scale-95 text-sm sm:text-base"
            >
              {slide.cta2.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Carousel controls */}
      <button
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all z-20"
      >
        <FiChevronLeft size={20} />
      </button>
      <button
        onClick={() => go(+1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all z-20"
      >
        <FiChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </section>
  );
}

// ── Flash Deals countdown banner ────────────────────────────
function FlashDealsBanner({ products }) {
  const { h, m, s } = useCountdown(4);
  if (!products?.length) return null;

  const deals = products.filter(p => p.discountPrice && p.discountPrice < p.price).slice(0, 6);
  if (!deals.length) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-xl">
            <FiZap size={15} style={{ fill: 'currentColor' }} />
            <span className="font-bold text-sm">Flash Deals</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-mono font-bold">
            <span className="bg-gray-900 text-white px-2 py-1 rounded">{h}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-900 text-white px-2 py-1 rounded">{m}</span>
            <span className="text-gray-500">:</span>
            <span className="bg-gray-900 text-white px-2 py-1 rounded">{s}</span>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">ends in</span>
        </div>
        <Link to="/shop?sort=-discount" className="text-primary-500 text-sm font-medium hover:underline flex items-center gap-1">
          All Deals <FiArrowRight size={14} />
        </Link>
      </div>
      {/* Deal cards — horizontal scroll on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {deals.map(product => (
          <Link
            key={product._id}
            to={`/product/${product.slug}`}
            className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all overflow-hidden group"
          >
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
              <img
                src={product.images?.[0]?.url || 'https://via.placeholder.com/200x200?text=Deal'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-700 line-clamp-2 leading-tight mb-1">{product.name}</p>
              <p className="font-bold text-sm text-gray-900">₹{product.discountPrice?.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 line-through">₹{product.price?.toLocaleString('en-IN')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Main Home component ─────────────────────────────────────
export default function Home() {
  const [categories,        setCategories]        = useState([]);
  const [featuredProducts,  setFeaturedProducts]  = useState([]);
  const [newArrivals,       setNewArrivals]        = useState([]);
  const [topRated,          setTopRated]           = useState([]);
  const [loading,           setLoading]            = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes, topRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?featured=true&limit=8'),
          api.get('/products?limit=8&sort=-createdAt'),
          api.get('/products?limit=6&sort=-ratings.average'),
        ]);
        setCategories(catRes.data.categories || []);
        setFeaturedProducts(featuredRes.data.products || []);
        setNewArrivals(newRes.data.products || []);
        setTopRated(topRes.data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Helmet>
        <title>Eptomart — Shop Everything Online | India's Best Online Store</title>
        <meta name="description" content="Shop electronics, fashion, groceries and more at the best prices. Fast delivery across India." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-gray-50">
        {/* ── Hero Carousel ── */}
        <HeroCarousel />


        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">

          {/* ── Categories ── */}
          {categories.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Shop by Category</h2>
                  <p className="text-sm text-gray-400 mt-0.5">What are you looking for today?</p>
                </div>
                <Link to="/shop"
                  className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                  See all <FiArrowRight size={14} />
                </Link>
              </div>

              {/* Mobile: 2-row horizontal scroll — Desktop: single-row grid */}
              <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
                {categories.slice(0, 8).map((cat, i) => (
                  <Link
                    key={cat._id}
                    to={`/shop/${cat.slug}`}
                    className="group flex flex-col items-center gap-2.5"
                  >
                    {/* Vibrant circle icon */}
                    <div className="w-full aspect-square flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105">
                      <CategoryIcon cat={cat} index={i} size={72} className="w-full h-full max-w-[72px] max-h-[72px]" />
                    </div>
                    {/* Name */}
                    <span className="text-sm font-semibold text-center leading-tight line-clamp-2 text-gray-700 group-hover:text-primary-600 transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Flash Deals ── */}
          {!loading && <FlashDealsBanner products={featuredProducts} />}

          {/* ── Two-column promo banners ── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/shop?sort=-createdAt" className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute -right-8 -bottom-8 text-8xl opacity-20 group-hover:scale-110 transition-transform">📦</div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Just Arrived</p>
              <h3 className="text-xl font-extrabold mb-1">New Arrivals</h3>
              <p className="text-indigo-100 text-sm mb-4">Fresh products added daily</p>
              <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                Explore <FiArrowRight size={14} />
              </span>
            </Link>
            <Link to="/shop?featured=true" className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute -right-8 -bottom-8 text-8xl opacity-20 group-hover:scale-110 transition-transform">⭐</div>
              <p className="text-amber-100 text-xs font-semibold uppercase tracking-widest mb-1">Handpicked</p>
              <h3 className="text-xl font-extrabold mb-1">Featured Products</h3>
              <p className="text-amber-100 text-sm mb-4">Curated by our team for quality</p>
              <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                Shop Now <FiArrowRight size={14} />
              </span>
            </Link>
          </section>

          {/* ── Featured Products ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">⭐ Featured Products</h2>
                <p className="text-xs text-gray-400 mt-0.5">Handpicked just for you</p>
              </div>
              <Link to="/shop?featured=true" className="text-primary-500 text-sm font-semibold hover:underline flex items-center gap-1">
                View All <FiArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredProducts.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No featured products yet.</div>
            )}
          </section>

          {/* ── Top Rated ── */}
          {!loading && topRated.filter(p => p.ratings?.count > 0).length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">🏆 Top Rated</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Loved by thousands of customers</p>
                </div>
                <Link to="/shop?sort=-ratings.average" className="text-primary-500 text-sm font-semibold hover:underline flex items-center gap-1">
                  View All <FiArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {topRated.filter(p => p.ratings?.count > 0).map(product => (
                  <Link
                    key={product._id}
                    to={`/product/${product.slug}`}
                    className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden group"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      <img
                        src={product.images?.[0]?.url || 'https://via.placeholder.com/200x200?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-gray-700 line-clamp-2 font-medium leading-tight mb-1">{product.name}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {product.ratings?.average?.toFixed(1)} <FiStar size={8} style={{ fill: 'currentColor' }} />
                        </span>
                        <span className="text-[10px] text-gray-400">({product.ratings?.count})</span>
                      </div>
                      <p className="font-bold text-sm text-gray-900">₹{(product.discountPrice || product.price)?.toLocaleString('en-IN')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── New Arrivals ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">🆕 New Arrivals</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fresh additions to our store</p>
              </div>
              <Link to="/shop?sort=-createdAt" className="text-primary-500 text-sm font-semibold hover:underline flex items-center gap-1">
                View All <FiArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {newArrivals.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* ── Why Eptomart section ── */}
          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-extrabold text-center text-gray-900 mb-2">Why Shop at Eptomart?</h2>
            <p className="text-center text-sm text-gray-400 mb-8">India's fastest growing multi-seller marketplace</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { emoji: '🛡️', title: 'Verified Sellers', desc: 'Every seller is KYC verified with GST & FSSAI compliance' },
                { emoji: '🚚', title: 'Pan-India Delivery', desc: 'Powered by Shiprocket — delivered to every pincode' },
                { emoji: '💸', title: 'Best Prices', desc: 'Direct from sellers — no middlemen, no markups' },
                { emoji: '📞', title: 'Real Support', desc: 'Human support via WhatsApp & email, 7 days a week' },
              ].map(item => (
                <div key={item.title} className="text-center">
                  <div className="text-4xl mb-3">{item.emoji}</div>
                  <h3 className="font-bold text-sm text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Install App CTA ── */}
          <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white text-center overflow-hidden relative">
            <div className="absolute -left-10 top-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute -right-10 bottom-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-2">Progressive Web App</p>
              <h2 className="text-2xl font-extrabold mb-2">📱 Install Eptomart App</h2>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">Add to Home Screen for a faster, app-like experience. Works offline too!</p>
              <button
                onClick={() => {
                  if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                  } else {
                    alert('To install: tap the browser menu → "Add to Home Screen"');
                  }
                }}
                className="bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold py-3 px-8 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg"
              >
                <FiPackage size={18} /> Install Now — It's Free!
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Recently Viewed */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <RecentlyViewed />
      </div>

      <Footer />
    </>
  );
}
