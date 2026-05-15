import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Shared helpers ─────────────────────────
const IMG_PLACEHOLDER = 'https://placehold.co/300x200/dcfce7/166534?text=Fresh';

const priceNote = `⚠️ Fresh produce prices are subject to daily market fluctuations. Final price may vary slightly at dispatch.`;

const ProductCard = ({ product, onAdd }) => {
  const { getQty, updateItem, loading } = useKoyambeduCart();
  const qty = getQty(product._id);
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || IMG_PLACEHOLDER;

  const freshLabel = product.freshArrivalTime
    ? `🌅 Arrived today at ${product.freshArrivalTime}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/koyambedu/product/${product._id}`} className="block">
        <div className="relative">
          <img src={img} alt={product.name} className="w-full h-36 object-cover" />
          {product.badges?.includes('fresh_arrival') && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🌿 Fresh</span>
          )}
          {product.badges?.includes('low_stock') && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Low Stock</span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-xs text-gray-400 mt-0.5">{product.nameTamil}</p>}
        </Link>
        {freshLabel && <p className="text-[10px] text-green-600 mt-1 font-medium">{freshLabel}</p>}
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
            <button
              onClick={() => updateItem(product._id, product.qtyStep || 1, 'tomorrow')}
              disabled={loading}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 transition active:scale-95"
            >
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => updateItem(product._id, Math.max(0, qty - (product.qtyStep || 1)), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center hover:bg-green-200">−</button>
              <span className="text-sm font-bold text-green-700 min-w-[28px] text-center">{qty}</span>
              <button onClick={() => updateItem(product._id, Math.min(product.maxQty || 50, qty + (product.qtyStep || 1)), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-600 text-white font-bold text-sm flex items-center justify-center hover:bg-green-700">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionRow = ({ title, icon, products, viewAllLink }) => {
  if (!products?.length) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
          <span>{icon}</span>{title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-green-600 text-xs font-semibold">See all →</Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 8).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
};

// ── Main Home Page ─────────────────────────
export default function KoyambeduHome() {
  const { fetchCart, itemCount, subtotal } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [sections,   setSections]   = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetchCart();
    Promise.all([
      api.get('/koyambedu/categories'),
      api.get('/koyambedu/products/featured'),
    ]).then(([catRes, featRes]) => {
      setCategories(catRes.data.categories || []);
      setSections(featRes.data.sections || {});
    }).catch(() => toast.error('Failed to load market data'))
      .finally(() => setLoading(false));
  }, []);

  const catIcons = { vegetables:'🥦', fruits:'🍊', flowers:'🌸', greens:'🌿', coconut:'🥥', banana_leaves:'🍃', pooja_items:'🪔', seasonal:'🌾', bulk:'📦' };

  return (
    <div className="min-h-screen bg-green-50 pb-32">
      {/* ── Header ─────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🛒</span>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none">KOYAMBEDU DAILY</h1>
                <p className="text-green-200 text-[11px] font-medium tracking-widest uppercase">Wholesale Market · Direct</p>
              </div>
            </div>
            <p className="text-green-100 text-xs mt-2 leading-relaxed">
              Fresh fruits, vegetables & flowers from Koyambedu — delivered to your Chennai doorstep 🌿
            </p>
          </div>
          <Link to="/koyambedu/cart" className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg">🛍️</span>
            </div>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">{itemCount}</span>
            )}
          </Link>
        </div>

        {/* Search bar */}
        <button onClick={() => navigate('/koyambedu/shop')}
          className="mt-4 w-full bg-white/15 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-white/70 text-sm">
          <span>🔍</span> Search vegetables, fruits, flowers...
        </button>

        {/* Today badge */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <span className="bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/30">
            🌅 Today's Market Open
          </span>
          <span className="bg-white/20 text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap border border-white/30">
            🚚 &lt;20 kg → ₹149 · 20–90 kg → ₹249
          </span>
          <span className="bg-yellow-400/90 text-green-900 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
            📦 &gt;90 kg? Contact us
          </span>
        </div>
      </div>

      {/* ── Price note banner ──────────────── */}
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <p className="text-amber-700 text-[11px] leading-relaxed">{priceNote}</p>
      </div>

      {/* ── Category chips ─────────────────── */}
      {categories.length > 0 && (
        <div className="mt-5 px-4">
          <h2 className="font-bold text-gray-700 text-sm mb-3">Browse Categories</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {categories.slice(0, 8).map(cat => (
              <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                className="flex flex-col items-center gap-1 bg-white rounded-xl py-3 px-2 shadow-sm border border-green-100 hover:border-green-400 transition">
                <span className="text-2xl">{cat.icon || catIcons[cat.slug] || '🌿'}</span>
                <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Sections ──────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-6">
          <SectionRow title="Today's Fresh Arrivals"  icon="🌅" products={sections.freshArrivals} viewAllLink="/koyambedu/shop?badges=fresh_arrival" />
          <SectionRow title="Koyambedu Deals"          icon="💰" products={sections.deals}        viewAllLink="/koyambedu/shop?sort=popular" />
          <SectionRow title="Flower Express"           icon="🌸" products={sections.flowers}      viewAllLink="/koyambedu/shop?category=flowers" />
          <SectionRow title="Seasonal Specials"        icon="🌾" products={sections.seasonal}     viewAllLink="/koyambedu/shop?badges=seasonal" />
          <SectionRow title="Bulk Buyer Zone"          icon="📦" products={sections.bulk}         viewAllLink="/koyambedu/shop?bulk=true" />
        </div>
      )}

      {/* ── AI Basket suggestions ─────────── */}
      <div className="px-4 mb-6">
        <h2 className="font-bold text-gray-700 text-sm mb-3">🤖 Smart Baskets</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Sambar Combo',   icon: '🥘', q: 'sambar vegetables' },
            { label: 'Pooja Special',  icon: '🪔', q: 'pooja flowers banana leaf' },
            { label: 'Juice Basket',   icon: '🍹', q: 'juice fruits' },
            { label: 'Weekly Greens',  icon: '🌿', q: 'greens spinach' },
            { label: 'Festival Pack',  icon: '🎊', q: 'festival flowers' },
            { label: 'Morning Fresh',  icon: '🌄', q: 'fresh arrivals morning' },
          ].map(b => (
            <Link key={b.label} to={`/koyambedu/shop?search=${encodeURIComponent(b.q)}`}
              className="bg-white border border-green-100 rounded-xl p-3 flex items-center gap-2 hover:border-green-400 transition shadow-sm">
              <span className="text-2xl">{b.icon}</span>
              <span className="text-xs font-semibold text-gray-700">{b.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── How it works ──────────────────── */}
      <div className="mx-4 mb-6 bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 text-sm mb-3">How Koyambedu Daily Works</h3>
        <div className="space-y-2">
          {[
            ['🛒','Browse & order fresh produce'],
            ['💳','Pay securely to Eptomart'],
            ['✅','Seller confirms stock & price'],
            ['🚚','Admin coordinates delivery'],
            ['🏠','Delivered to your door'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-lg">{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seller CTA ────────────────────── */}
      <div className="mx-4 mb-6 rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#14532d,#166534)' }}>
        <div className="p-4 text-white">
          <p className="font-black text-base">Are you a Koyambedu Seller?</p>
          <p className="text-green-200 text-xs mt-1">Join Eptomart — reach Chennai homes directly.</p>
          <Link to="/koyambedu/seller/register"
            className="mt-3 inline-block bg-white text-green-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-green-50 transition">
            Register as Seller →
          </Link>
        </div>
      </div>

      {/* ── Sticky cart bar ───────────────── */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white px-4 py-3 flex items-center justify-between z-[9990] shadow-lg">
          <div>
            <p className="text-xs font-semibold opacity-80">{itemCount} item{itemCount > 1 ? 's' : ''} in cart</p>
            <p className="font-bold text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
          </div>
          <Link to="/koyambedu/cart"
            className="bg-white text-green-700 font-bold text-sm px-5 py-2 rounded-xl hover:bg-green-50 transition">
            View Cart →
          </Link>
        </div>
      )}
    </div>
  );
}
