// ============================================
// KOYAMBEDU DAILY — Buyer Landing Page
// Compact native-mobile layout matching EptoFresh
// No Navbar — sticky green gradient header
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiSearch, FiChevronRight, FiMapPin, FiShoppingBag, FiSun,
  FiTruck, FiPackage, FiCheckCircle, FiZap, FiUsers, FiGrid,
  FiArrowLeft, FiChevronDown, FiX,
} from 'react-icons/fi';
import { FaLeaf, FaCarrot } from 'react-icons/fa';
import BottomNav from '../../components/common/BottomNav';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const IMG_PH = 'https://placehold.co/300x200/dcfce7/166534?text=Fresh';

const KOYAMBEDU_LAT = 13.0748, KOYAMBEDU_LNG = 80.2136;
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const CAT_ICONS = {
  vegetables:'🥦', fruits:'🍊', flowers:'🌸', greens:'🌿',
  coconut:'🥥', banana_leaves:'🍃', pooja_items:'🪔', seasonal:'🌾', bulk:'📦',
};

function ProductCard({ product }) {
  const { getQty, updateItem } = useKoyambeduCart();
  const qty  = getQty(product._id);
  const img  = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || IMG_PH;
  const step = product.qtyStep || 1;

  return (
    <div className="bg-white rounded-2xl overflow-hidden active:scale-[0.98] transition"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
      <Link to={`/koyambedu/product/${product._id}`} className="block relative">
        <img src={img} alt={product.name} className="w-full h-28 object-cover" />
        {product.badges?.includes('fresh_arrival') && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <FaLeaf size={8} /> Fresh
          </span>
        )}
        {product.badges?.includes('low_stock') && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Low</span>
        )}
      </Link>
      <div className="p-3">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-[10px] text-gray-400 mt-0.5">{product.nameTamil}</p>}
        </Link>
        {product.marketPriceMin > 0 && (
          <p className="text-[10px] text-orange-500 mt-0.5">Market ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unitLabel}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-green-700 font-bold text-sm">₹{product.currentPrice}</span>
            <span className="text-gray-400 text-[10px] ml-1">/{product.unitLabel}</span>
          </div>
          {qty === 0 ? (
            <button onClick={() => updateItem(product._id, step, 'tomorrow')}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition">
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => updateItem(product._id, Math.max(0, qty - step), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center">−</button>
              <span className="text-sm font-bold text-green-700 min-w-[20px] text-center">{qty}</span>
              <button onClick={() => updateItem(product._id, Math.min(product.maxQty || 50, qty + step), 'tomorrow')}
                className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionRow({ title, icon, products, viewAllLink }) {
  if (!products?.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-emerald-500 shrink-0" />
          {icon} {title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold">
            See all <FiChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.slice(0, 6).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  );
}

export default function KoyambeduHome() {
  const { fetchCart, itemCount, subtotal, userLocation, locationLabel } = useKoyambeduCart();
  const navigate = useNavigate();

  const distToMarket = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;

  const [categories, setCategories] = useState([]);
  const [sections,   setSections]   = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetchCart();
    Promise.all([
      api.get('/koyambedu/categories').catch(() => ({ data: { categories: [] } })),
      api.get('/koyambedu/products/featured').catch(() => ({ data: { sections: {} } })),
    ]).then(([catRes, featRes]) => {
      setCategories(catRes.data.categories || []);
      setSections(featRes.data.sections || {});
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <Helmet>
        <title>Koyambedu Daily — Fresh from the Market | Eptomart</title>
        <meta name="description" content="Order fresh vegetables, fruits and flowers directly from Koyambedu wholesale market." />
      </Helmet>

      {/* ── Compact sticky green header ── */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.35)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="px-4 pt-3 pb-5">

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiArrowLeft size={15} className="text-white" />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-white text-base font-extrabold tracking-tight leading-none">Koyambedu Daily</h1>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>MARKET</span>
                </div>
                <p className="text-emerald-100 text-[10px] mt-0.5 opacity-80">கோயம்பேடு · Wholesale · Direct Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/koyambedu/shop')}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiSearch size={15} className="text-white" />
              </button>
              <Link to="/koyambedu/cart"
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiShoppingBag size={15} className="text-white" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Location pill */}
          <button
            onClick={() => navigate('/koyambedu/location')}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 w-full transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              <FiMapPin size={11} className="text-white" />
            </div>
            <span className="text-white text-xs font-semibold flex-1 text-left truncate opacity-95">
              {locationLabel
                ? `${locationLabel}${distToMarket ? ` · ${distToMarket} km from market` : ''}`
                : 'Set your delivery area'}
            </span>
            <FiChevronDown size={13} className="text-white opacity-70 shrink-0" />
          </button>

          {/* Delivery info pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiTruck size={10} /> ₹149 up to 20 kg
            </span>
            <span className="shrink-0 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiPackage size={10} /> ₹249 up to 90 kg
            </span>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(250,204,21,0.85)', color: '#065f46' }}>
              <FiSun size={10} /> Market Open
            </span>
          </div>
        </div>

        {/* Category pills — on white rounded strip */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', paddingTop: 14, paddingBottom: 2 }}>
          <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-hide">
            <Link to="/koyambedu/shop"
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: '#065f46', color: '#fff', boxShadow: '0 4px 14px rgba(6,95,70,0.35)' }}>
              All Products
            </Link>
            {categories.slice(0, 10).map(cat => (
              <Link key={cat._id} to={`/koyambedu/shop?category=${cat._id}`}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap active:scale-95 transition"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {cat.icon || CAT_ICONS[cat.slug] || '🌿'} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4" style={{ background: '#F5F4F2' }}>

        {/* No location nudge */}
        {!locationLabel && (
          <button onClick={() => navigate('/koyambedu/location')}
            className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: '#fff', boxShadow: '0 4px 20px rgba(6,95,70,0.14)', border: '1.5px solid rgba(6,95,70,0.12)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
              <FiMapPin className="text-white" size={19} />
            </div>
            <div className="text-left flex-1">
              <p className="text-gray-900 font-bold text-sm">Set your delivery area</p>
              <p className="text-gray-400 text-xs mt-0.5">See if we deliver to you + estimate delivery</p>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-green-50">
              <FiChevronRight size={14} className="text-green-700" />
            </div>
          </button>
        )}

        {/* Price note */}
        <div className="mb-4 rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <span className="text-amber-500 text-sm mt-0.5 shrink-0">⚠️</span>
          <p className="text-amber-700 text-[11px] leading-relaxed">
            Fresh produce prices may vary slightly based on daily market arrivals. Seller will request approval before dispatch if price changes.
          </p>
        </div>

        {/* Product sections */}
        {loading ? (
          <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
            <div className="animate-bounce"><FaLeaf size={40} className="text-emerald-400" /></div>
            <p className="text-sm">Loading today's market…</p>
          </div>
        ) : (
          <>
            <SectionRow title="Today's Fresh Arrivals" icon={<FiSun size={14} />} products={sections.freshArrivals} viewAllLink="/koyambedu/shop?badges=fresh_arrival" />
            <SectionRow title="Koyambedu Deals"        icon={<FiZap size={14} />} products={sections.deals}         viewAllLink="/koyambedu/shop?sort=popular" />
            <SectionRow title="Flower Express"         icon={<FaLeaf size={14} />} products={sections.flowers}       viewAllLink="/koyambedu/shop?category=flowers" />
            <SectionRow title="Seasonal Specials"      icon={<FaCarrot size={14} />} products={sections.seasonal}    viewAllLink="/koyambedu/shop?badges=seasonal" />
            <SectionRow title="Bulk Buyer Zone"        icon={<FiPackage size={14} />} products={sections.bulk}       viewAllLink="/koyambedu/shop?bulk=true" />
            {!Object.values(sections).some(s => s?.length) && (
              <div className="text-center py-16 px-4">
                <FaLeaf size={48} className="text-emerald-300 mx-auto mb-3" />
                <p className="font-bold text-gray-600 text-base">No products yet</p>
                <p className="text-gray-400 text-sm mt-1">Sellers are stocking up — check back soon!</p>
              </div>
            )}
          </>
        )}

        {/* Smart Baskets */}
        <div className="mb-6">
          <h2 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
            <FiGrid size={14} className="text-emerald-600" /> Smart Baskets
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Sambar Combo',   icon: '🍅', color: '#ef4444', q: 'sambar vegetables'        },
              { label: 'Pooja Special',  icon: '🌸', color: '#f59e0b', q: 'pooja flowers banana leaf' },
              { label: 'Juice Basket',   icon: '🍊', color: '#f97316', q: 'juice fruits'              },
              { label: 'Weekly Greens',  icon: '🌿', color: '#16a34a', q: 'greens spinach'            },
              { label: 'Festival Pack',  icon: '🪔', color: '#8b5cf6', q: 'festival flowers'          },
              { label: 'Morning Fresh',  icon: '☀️', color: '#0d9488', q: 'fresh arrivals morning'    },
            ].map(b => (
              <Link key={b.label} to={`/koyambedu/shop?search=${encodeURIComponent(b.q)}`}
                className="bg-white rounded-xl p-3 flex items-center gap-2 active:scale-95 transition"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${b.color}14` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${b.color}14` }}>
                  {b.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{b.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-6 bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 className="font-bold text-gray-800 text-sm mb-3">How it Works</h3>
          <div className="space-y-3">
            {[
              { Icon: FiShoppingBag, color: '#059669', title: 'Browse & Order',    desc: 'Shop fresh produce. Pay securely.' },
              { Icon: FiCheckCircle, color: '#16a34a', title: 'Seller Confirms',   desc: 'Seller verifies stock & final price.' },
              { Icon: FiTruck,       color: '#0d9488', title: 'Doorstep Delivery', desc: 'Chennai delivery, same or next day.' },
            ].map((step, i) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}16` }}>
                  <step.Icon size={17} style={{ color: step.color }} />
                </div>
                <div className="pt-1">
                  <p className="font-bold text-gray-800 text-xs">{step.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { Icon: FaLeaf,  color: '#059669', title: 'Farm Fresh',     desc: 'Harvested today' },
            { Icon: FiZap,   color: '#f59e0b', title: 'Fast Delivery',  desc: 'Same / next day' },
            { Icon: FiUsers, color: '#3b82f6', title: 'Wholesale Price', desc: 'No middlemen'   },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5" style={{ background: `${item.color}16` }}>
                <item.Icon size={17} style={{ color: item.color }} />
              </div>
              <p className="font-semibold text-xs text-gray-700">{item.title}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Seller CTA */}
        <div className="mb-6 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
          <div className="p-5">
            <p className="text-white font-black text-sm flex items-center gap-2"><FiGrid size={15} /> Are you a Koyambedu Seller?</p>
            <p className="text-emerald-200 text-xs mt-1">List your stall on Eptomart — reach Chennai homes directly.</p>
            <p className="text-emerald-300 text-[10px] mt-0.5">கோயம்பேடு வியாபாரியா? இப்போதே இணையுங்கள்</p>
            <Link to="/koyambedu/seller/register"
              className="inline-block mt-3 bg-white text-emerald-700 font-black text-sm px-5 py-2.5 rounded-xl active:scale-95 transition">
              Register as Seller →
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />

      {itemCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 max-w-lg mx-auto z-40">
          <div className="bg-green-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl">
            <div>
              <p className="text-xs opacity-80">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
              <p className="font-black text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
            </div>
            <Link to="/koyambedu/cart" className="bg-white text-emerald-700 font-black text-sm px-5 py-2 rounded-xl">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
