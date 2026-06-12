// ============================================
// KOYAMBEDU DAILY — Buyer Landing Page
// Frame matches UzhavarHome: Navbar + hero + content + BottomNav
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiSearch, FiChevronRight, FiMapPin } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import BottomNav from '../../components/common/BottomNav';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

// ── Placeholder ─────────────────────────────
const IMG_PH = 'https://placehold.co/300x200/dcfce7/166534?text=Fresh';

const priceNote = `⚠️ Fresh produce prices are subject to daily market fluctuations. Final price may vary slightly at dispatch.`;

const CAT_ICONS = {
  vegetables:'🥦', fruits:'🍊', flowers:'🌸', greens:'🌿',
  coconut:'🥥', banana_leaves:'🍃', pooja_items:'🪔', seasonal:'🌾', bulk:'📦',
};

// ── Product card ────────────────────────────
function ProductCard({ product }) {
  const { getQty, updateItem } = useKoyambeduCart();
  const qty = getQty(product._id);
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || IMG_PH;
  const step = product.qtyStep || 1;

  return (
    <div className="bg-white rounded-2xl border border-green-100 overflow-hidden shadow-card hover:shadow-card-hover hover:border-green-300 hover:-translate-y-0.5 transition-all duration-300 group">
      <Link to={`/koyambedu/product/${product._id}`} className="block">
        <div className="relative overflow-hidden">
          <img src={img} alt={product.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
          {product.badges?.includes('fresh_arrival') && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">🌿 Fresh</span>
          )}
          {product.badges?.includes('low_stock') && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm animate-pulse">Low Stock</span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-xs text-gray-400 mt-0.5">{product.nameTamil}</p>}
        </Link>
        {product.marketPriceMin > 0 && (
          <p className="text-[10px] text-orange-500 mt-1">
            Market: ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unitLabel}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-green-700 font-bold text-sm">₹{product.currentPrice}</span>
            <span className="text-gray-400 text-xs ml-1">/{product.unitLabel}</span>
          </div>
          {qty === 0 ? (
            <button onClick={() => updateItem(product._id, step, 'tomorrow')}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 active:scale-95 transition">
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => updateItem(product._id, Math.max(0, qty - step), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center hover:bg-green-200">−</button>
              <span className="text-sm font-bold text-green-700 min-w-[24px] text-center">{qty}</span>
              <button onClick={() => updateItem(product._id, Math.min(product.maxQty || 50, qty + step), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center hover:bg-green-700">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section row ─────────────────────────────
function SectionRow({ title, icon, products, viewAllLink }) {
  if (!products?.length) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-extrabold text-gray-900 text-base md:text-lg flex items-center gap-2 tracking-tight">
          <span className="w-1 h-5 rounded-full bg-emerald-500 flex-shrink-0" />
          <span>{icon}</span>{title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold hover:gap-1.5 transition-all">
            See all <FiChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 8).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────
export default function KoyambeduHome() {
  const { fetchCart, itemCount, subtotal } = useKoyambeduCart();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [sections,   setSections]   = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetchCart();
    // Load categories and featured products independently — one failure won't block the other
    Promise.all([
      api.get('/koyambedu/categories').catch(() => ({ data: { categories: [] } })),
      api.get('/koyambedu/products/featured').catch(() => ({ data: { sections: {} } })),
    ]).then(([catRes, featRes]) => {
      setCategories(catRes.data.categories || []);
      setSections(featRes.data.sections || {});
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Helmet>
        <title>Koyambedu Daily — Fresh from the Market | Eptomart</title>
        <meta name="description" content="Order fresh vegetables, fruits and flowers directly from Koyambedu wholesale market. Delivered to your Chennai doorstep." />
      </Helmet>

      <Navbar />

      {/* Same page body structure as Home — pb-24 for mobile bottom nav */}
      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-8">

        {/* ── Hero — full-bleed, content max-width-constrained ── */}
        <div
          className="text-white pt-8 pb-14 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #059669 80%, #34d399 100%)' }}
        >
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -left-10 bottom-0 w-32 h-32 rounded-full bg-black/10" />
          <div className="max-w-7xl mx-auto px-4 relative z-10 animate-fade-in-up">
            <div className="text-4xl mb-2">🥬</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-0.5">KOYAMBEDU DAILY</h1>
            <p className="text-emerald-200 text-xs">கோயம்பேடு சந்தை · Wholesale Market · Direct Delivery</p>
            <div className="mt-3 flex gap-2 justify-center flex-wrap">
              <span className="bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/30">🌅 Market Open</span>
              <span className="bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/30">🚚 ₹149 (up to 20 kg) · ₹249 (20–90 kg)</span>
              <span className="bg-yellow-400/90 text-emerald-900 text-[11px] font-bold px-3 py-1 rounded-full">📦 &gt;90 kg? Contact us</span>
            </div>
          </div>
        </div>

        {/* ── Page content — same max-width as Home ── */}
        <div className="max-w-7xl mx-auto">

        {/* ── Search bar — overlaps hero ─────── */}
        <div className="px-4 -mt-6 relative z-10 mb-4">
          <button onClick={() => navigate('/koyambedu/shop')}
            className="w-full bg-white rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3.5 text-gray-400 text-sm active:scale-[0.98] transition-transform">
            <FiSearch size={16} className="flex-shrink-0" />
            <span>Search vegetables, fruits, flowers…</span>
            <span className="ml-auto text-emerald-500 font-bold text-xs flex-shrink-0">Browse All →</span>
          </button>
        </div>

        {/* ── Price note ────────────────────── */}
        <div className="px-4 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-amber-700 text-[11px] leading-relaxed">{priceNote}</p>
          </div>
        </div>

        {/* ── Category chips ─────────────────── */}
        {categories.length > 0 && (
          <div className="px-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-extrabold text-gray-800">Browse Categories</h2>
              <Link to="/koyambedu/shop" className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                All <FiChevronRight size={12} />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <Link to="/koyambedu/shop"
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200">
                🛒 All
              </Link>
              {categories.slice(0, 10).map(cat => (
                <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700 whitespace-nowrap active:scale-95 transition">
                  {cat.icon || CAT_ICONS[cat.slug] || '🌿'} {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Product sections ──────────────── */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
              <div className="text-4xl animate-bounce">🥬</div>
              <p className="text-sm">Loading today's market...</p>
            </div>
          ) : (
            <>
              <SectionRow title="Today's Fresh Arrivals" icon="🌅" products={sections.freshArrivals} viewAllLink="/koyambedu/shop?badges=fresh_arrival" />
              <SectionRow title="Koyambedu Deals"        icon="💰" products={sections.deals}         viewAllLink="/koyambedu/shop?sort=popular" />
              <SectionRow title="Flower Express"         icon="🌸" products={sections.flowers}       viewAllLink="/koyambedu/shop?category=flowers" />
              <SectionRow title="Seasonal Specials"      icon="🌾" products={sections.seasonal}      viewAllLink="/koyambedu/shop?badges=seasonal" />
              <SectionRow title="Bulk Buyer Zone"        icon="📦" products={sections.bulk}          viewAllLink="/koyambedu/shop?bulk=true" />

              {/* Empty state */}
              {!Object.values(sections).some(s => s?.length) && (
                <div className="text-center py-16 px-4">
                  <p className="text-5xl mb-3">🌿</p>
                  <p className="font-bold text-gray-600 text-base">No products yet</p>
                  <p className="text-gray-400 text-sm mt-1">Sellers are stocking up — check back soon!</p>
                </div>
              )}
            </>
          )}
        </div>

        </div>{/* end max-w-7xl content wrapper */}

        {/* ── Smart Baskets ─────────────────── */}
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <h2 className="font-bold text-gray-800 text-sm mb-3">🤖 Smart Baskets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Sambar Combo',   icon: '🥘', q: 'sambar vegetables'       },
              { label: 'Pooja Special',  icon: '🪔', q: 'pooja flowers banana leaf' },
              { label: 'Juice Basket',   icon: '🍹', q: 'juice fruits'             },
              { label: 'Weekly Greens',  icon: '🌿', q: 'greens spinach'           },
              { label: 'Festival Pack',  icon: '🎊', q: 'festival flowers'         },
              { label: 'Morning Fresh',  icon: '🌄', q: 'fresh arrivals morning'   },
            ].map(b => (
              <Link key={b.label} to={`/koyambedu/shop?search=${encodeURIComponent(b.q)}`}
                className="bg-white border border-emerald-100 rounded-xl p-3 flex items-center gap-2 shadow-card hover:border-emerald-400 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
                <span className="text-2xl">{b.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{b.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── How it works ─────────────────── */}
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-3">How Koyambedu Daily Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: '🛒', title: 'Browse & Order',     desc: 'Shop fresh produce. Pay securely.' },
                { icon: '✅', title: 'Seller Confirms',    desc: 'Seller verifies stock & final price.' },
                { icon: '🚚', title: 'Doorstep Delivery',  desc: 'Chennai delivery, same or next day.' },
              ].map(step => (
                <div key={step.title} className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-xl">
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                  <div>
                    <p className="font-bold text-gray-800 text-xs">{step.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Trust strip ─────────────────── */}
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '🌿', title: 'Farm Fresh',     desc: 'Harvested today' },
              { icon: '⚡', title: 'Fast Delivery',  desc: 'Same / next day' },
              { icon: '🤝', title: 'Wholesale Price',desc: 'No middlemen'    },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="font-semibold text-xs text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Seller CTA ─────────────────── */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-white font-black text-base">🏪 Are you a Koyambedu Seller?</p>
                <p className="text-emerald-200 text-xs mt-1">List your stall on Eptomart — reach Chennai homes directly.</p>
                <p className="text-emerald-300 text-[10px] mt-0.5">கோயம்பேடு வியாபாரியா? இப்போதே இணையுங்கள்</p>
              </div>
              <Link to="/koyambedu/seller/register"
                className="flex-shrink-0 bg-white text-emerald-700 font-black text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition active:scale-95">
                Register as Seller →
              </Link>
            </div>
          </div>
        </div>

      </main>

      <Footer className="hidden md:block" />

      {/* ── Fixed glass bottom nav ─────────── */}
      <BottomNav />

      {/* ── Cart bar — sits above bottom nav ─ */}
      {itemCount > 0 && (
        <div className="fixed bottom-[72px] md:bottom-4 left-0 right-0 px-4 z-[9985] pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto animate-slide-up">
            <div className="text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-2xl shadow-emerald-900/30"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)', backdropFilter: 'blur(8px)' }}>
              <div>
                <p className="text-xs font-semibold opacity-80">{itemCount} item{itemCount !== 1 ? 's' : ''} · Today's order</p>
                <p className="font-black text-base leading-tight">₹{subtotal.toLocaleString('en-IN')}</p>
              </div>
              <Link to="/koyambedu/cart"
                className="bg-white text-emerald-700 font-black text-sm px-5 py-2 rounded-xl hover:bg-emerald-50 active:scale-95 transition flex-shrink-0">
                View Cart →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
