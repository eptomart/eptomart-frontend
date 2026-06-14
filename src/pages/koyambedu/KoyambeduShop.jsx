import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import BottomNav from '../../components/common/BottomNav';
import toast from 'react-hot-toast';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const IMG_PLACEHOLDER = 'https://placehold.co/300x200/dcfce7/166534?text=Fresh';

const ProductCard = ({ product }) => {
  const { getQty, updateItem, loading } = useKoyambeduCart();
  const qty = getQty(product._id);
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || IMG_PLACEHOLDER;

  return (
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
      <Link to={`/koyambedu/product/${product._id}`}>
        <div className="relative">
          <img src={img} alt={product.name} className="w-full h-32 object-cover" />
          {product.badges?.includes('fresh_arrival') && (
            <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Fresh</span>
          )}
          {product.isSameDay && (
            <span className="absolute bottom-2 right-2 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Today ⚡</span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link to={`/koyambedu/product/${product._id}`}>
          <p className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</p>
          {product.nameTamil && <p className="text-[10px] text-gray-400">{product.nameTamil}</p>}
        </Link>
        <p className="text-[10px] text-gray-500 mt-0.5">{product.seller?.businessName}</p>
        {product.marketPriceMin > 0 && (
          <p className="text-[10px] text-orange-500 mt-0.5">Market ₹{product.marketPriceMin}–{product.marketPriceMax}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-green-700 font-bold text-sm">₹{product.currentPrice}</span>
            <span className="text-gray-400 text-[10px] ml-1">/{product.unitLabel}</span>
          </div>
          {qty === 0 ? (
            <button
              onClick={() => updateItem(product._id, product.qtyStep || 1)}
              disabled={loading}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 active:scale-95 transition">
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {/* Delete button */}
              <button
                onClick={() => updateItem(product._id, 0)}
                disabled={loading}
                className="w-6 h-6 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition"
                title="Remove from cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
              <button onClick={() => updateItem(product._id, Math.max(product.qtyStep || 1, qty - (product.qtyStep || 1)))}
                className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center">−</button>
              <span className="text-xs font-bold text-green-700 w-6 text-center">{qty}</span>
              <button onClick={() => updateItem(product._id, Math.min(product.maxQty || 50, qty + (product.qtyStep || 1)))}
                className="w-6 h-6 rounded-full bg-green-600 text-white font-bold flex items-center justify-center">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function KoyambeduShop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchCart, itemCount, subtotal, userLocation, locationLabel } = useKoyambeduCart();

  // Distance from user's saved location to Koyambedu market
  const distToMarket = userLocation
    ? Math.round(haversineKm(userLocation.lat, userLocation.lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG) * 10) / 10
    : null;
  const navigate = useNavigate();

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);

  const search       = searchParams.get('search')       || '';
  const categoryId   = searchParams.get('category')     || '';
  const deliveryType = searchParams.get('deliveryType') || '';
  const sortBy       = searchParams.get('sort')         || 'default';

  const loadProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20, sort: sortBy });
      if (search)       params.set('search',       search);
      if (categoryId)   params.set('category',     categoryId);
      if (deliveryType) params.set('deliveryType', deliveryType);
      const { data } = await api.get(`/koyambedu/products?${params}`);
      setProducts(pg === 1 ? data.products : prev => [...prev, ...data.products]);
      setTotal(data.total);
      setPage(pg);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, deliveryType, sortBy]);

  useEffect(() => {
    fetchCart();
    api.get('/koyambedu/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(1); }, [search, categoryId, deliveryType, sortBy]);

  const setParam = (key, val) => {
    const np = new URLSearchParams(searchParams);
    if (val) np.set(key, val); else np.delete(key);
    setSearchParams(np);
  };

  const activeCategory = categories.find(c => c._id === categoryId);

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24" style={{ paddingBottom: itemCount > 0 ? 140 : 96 }}>

      {/* ── Compact sticky green header (no Navbar) ── */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg,#14532d,#16a34a)',
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        {/* Title row */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <button onClick={() => navigate('/koyambedu')}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-white text-base leading-tight">
              {activeCategory ? `${activeCategory.icon || '🌿'} ${activeCategory.name}` : '🌿 Shop Fresh Market'}
            </h1>
            {distToMarket != null && (
              <p className="text-white/75 text-[11px] mt-0.5">
                📍 {locationLabel ? `${locationLabel} · ` : ''}{distToMarket} km from market
                {distToMarket <= 7 ? ' · Delivery available ✓' : ' · Outside zone'}
              </p>
            )}
          </div>
          <Link to="/koyambedu/cart" className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: itemCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3A1 1 0 006 17h12M17 17a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{itemCount}</span>
            )}
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 relative">
          <input
            value={search}
            onChange={e => setParam('search', e.target.value)}
            placeholder="Search vegetables, fruits, flowers..."
            className="w-full rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
            style={{ fontSize: 16 }}
          />
          {search && (
            <button onClick={() => setParam('search', '')}
              className="absolute right-7 top-2.5 text-gray-400 font-bold">✕</button>
          )}
        </div>

        {/* Filters strip */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {['', 'today', 'tomorrow'].map(dt => (
            <button key={dt}
              onClick={() => setParam('deliveryType', dt)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition ${
                deliveryType === dt
                  ? 'bg-white text-green-700'
                  : 'bg-white/20 text-white border border-white/30'
              }`}>
              {dt === '' ? 'All' : dt === 'today' ? '⚡ Today' : '📅 Tomorrow'}
            </button>
          ))}
          <select value={sortBy} onChange={e => setParam('sort', e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 bg-white/20 text-white border border-white/30 focus:outline-none">
            <option value="default" className="text-gray-800">Default</option>
            <option value="price_asc" className="text-gray-800">Price ↑</option>
            <option value="price_desc" className="text-gray-800">Price ↓</option>
            <option value="fresh" className="text-gray-800">Freshest</option>
            <option value="popular" className="text-gray-800">Popular</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">

          {/* ── Category pills ── */}
          {categories.length > 0 && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              <button onClick={() => setParam('category', '')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                  !categoryId ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>All</button>
              {categories.map(cat => (
                <button key={cat._id} onClick={() => setParam('category', cat._id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                    categoryId === cat._id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Results count ── */}
          <p className="px-4 text-xs text-gray-500 mb-3">
            {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
          </p>

          {/* ── Product grid ── */}
          <div className="px-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map(p => <ProductCard key={p._id} product={p} />)}
          </div>

          {!loading && products.length === 0 && (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🌿</p>
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── Load more ── */}
          {!loading && products.length < total && (
            <div className="flex justify-center mt-4 mb-6">
              <button onClick={() => loadProducts(page + 1)}
                className="bg-green-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-green-700 transition">
                Load more
              </button>
            </div>
          )}

      </div>

      <BottomNav />

      {itemCount > 0 && (
        <div className="fixed left-4 right-4 max-w-lg mx-auto z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}>
          <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between rounded-2xl shadow-xl">
            <div>
              <p className="text-xs opacity-80">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
              <p className="font-bold text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
            </div>
            <Link to="/koyambedu/cart" className="bg-white text-green-700 font-bold text-sm px-5 py-2 rounded-xl">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
