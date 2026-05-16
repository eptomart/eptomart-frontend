import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import Navbar from '../../components/common/Navbar';
import BottomNav from '../../components/common/BottomNav';
import toast from 'react-hot-toast';

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
              <button onClick={() => updateItem(product._id, Math.max(0, qty - (product.qtyStep || 1)))}
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
  const { fetchCart, itemCount, subtotal } = useKoyambeduCart();
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
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7] pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">

          {/* ── Page Header (Koyambedu green) ── */}
          <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-5 pb-4 text-white md:rounded-b-2xl">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate('/koyambedu')} className="text-white/80 p-1 hover:bg-white/10 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h1 className="font-black text-lg">
                {activeCategory ? `${activeCategory.icon || '🌿'} ${activeCategory.name}` : 'Shop Fresh Market'}
              </h1>
              <Link to="/koyambedu/cart" className="ml-auto relative p-1">
                <span className="text-xl">🛍️</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{itemCount}</span>
                )}
              </Link>
            </div>
            {/* Search */}
            <div className="relative">
              <input
                value={search}
                onChange={e => setParam('search', e.target.value)}
                placeholder="Search vegetables, fruits, flowers..."
                className="w-full bg-white/15 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              {search && (
                <button onClick={() => setParam('search', '')} className="absolute right-3 top-2.5 text-white/60">✕</button>
              )}
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {['', 'today', 'tomorrow'].map(dt => (
              <button key={dt}
                onClick={() => setParam('deliveryType', dt)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                  deliveryType === dt
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                }`}>
                {dt === '' ? 'All' : dt === 'today' ? '⚡ Today' : '📅 Tomorrow'}
              </button>
            ))}
            <select value={sortBy} onChange={e => setParam('sort', e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-green-400">
              <option value="default">Default</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="fresh">Freshest</option>
              <option value="popular">Popular</option>
            </select>
          </div>

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

        </div>{/* end max-w-7xl */}
      </main>

      <BottomNav />

      {/* ── Sticky cart pill (sits above bottom nav) ── */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-lg mx-auto bg-green-600 text-white px-4 py-3 flex items-center justify-between z-[9990] shadow-xl rounded-2xl">
          <div>
            <p className="text-xs opacity-80">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
            <p className="font-bold text-sm">₹{subtotal.toLocaleString('en-IN')}</p>
          </div>
          <Link to="/koyambedu/cart" className="bg-white text-green-700 font-bold text-sm px-5 py-2 rounded-xl">
            View Cart →
          </Link>
        </div>
      )}
    </>
  );
}
