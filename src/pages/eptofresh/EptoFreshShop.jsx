// ============================================
// EPTOFRESH SHOP — Native Mobile Layout
// No Navbar | compact sticky header | shop initial
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiStar, FiMapPin, FiShoppingCart, FiPlus, FiMinus, FiAlertTriangle, FiClock } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';

const CAT_LABEL = { chicken:'Chicken', mutton:'Mutton', fish:'Fish', seafood:'Seafood', beef:'Beef', pork:'Pork', ready_to_cook:'Ready to Cook' };

// ── Shop initial avatar ──────────────────────────────────────
function ShopAvatar({ name, image, size = 48 }) {
  const initial = (name || 'S').charAt(0).toUpperCase();
  const colors = ['#f97316','#ef4444','#3b82f6','#0d9488','#9333ea','#d97706','#16a34a'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  if (image) {
    return (
      <img src={image} alt={name}
        className="object-cover rounded-xl"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-xl flex items-center justify-center font-black text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

export default function EptoFreshShop() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cartCount, cartTotal, items, userLocation } = useEptoFreshCart();

  const [seller, setSeller]   = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  useEffect(() => { fetchShop(); }, [sellerId, userLocation?.lat, userLocation?.lng]);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const params = userLocation ? `?lat=${userLocation.lat}&lng=${userLocation.lng}` : '';
      const [sr, pr] = await Promise.all([
        api.get(`/eptofresh/sellers/${sellerId}${params}`),
        api.get(`/eptofresh/sellers/${sellerId}/products`),
      ]);
      if (sr.data.success) setSeller(sr.data.seller);
      if (pr.data.success) setProducts(pr.data.products || []);
      if (sr.data.seller?.deliveryInfo) setDeliveryInfo(sr.data.seller.deliveryInfo);
    } catch { toast.error('Failed to load shop'); }
    finally { setLoading(false); }
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);
  const getQty = (id) => {
    const it = items.find(i => (i.product?._id || i.product) === id || i.productId === id);
    return it?.quantity || 0;
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-14 bg-white px-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
        <div className="flex-1 h-4 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="px-4 mt-4 space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F4F2', paddingBottom: cartCount > 0 ? 120 : 80 }}>

      {/* ── Sticky header: back + shop info + cart ── */}
      <div className="sticky top-0 z-30 bg-white"
        style={{ boxShadow: '0 1px 0 #f0f0f0', paddingTop: 'env(safe-area-inset-top)' }}>

        <div className="px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button onClick={() => navigate('/eptofresh')}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#F5F4F2' }}>
            <FiArrowLeft size={18} className="text-gray-700" />
          </button>

          {/* Shop avatar + name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <ShopAvatar name={seller?.shopName} image={seller?.shopImage} size={36} />
            <div className="min-w-0">
              <p className="text-gray-900 font-bold text-sm leading-tight truncate">{seller?.shopName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-amber-500 text-[11px] font-bold">
                  <FiStar size={10} style={{ fill: '#f59e0b', stroke: '#f59e0b' }} />
                  {Number(seller?.rating || 0).toFixed(1)}
                </span>
                {seller?.distanceKm != null && (
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-green-600">
                    <FiMapPin size={10} /> {Number(seller.distanceKm).toFixed(1)} km
                  </span>
                )}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${seller?.isOpen ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                  {seller?.isOpen ? '● Open' : '● Closed'}
                </span>
              </div>
            </div>
          </div>

          {/* Cart */}
          <button onClick={() => navigate('/eptofresh/cart')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: cartCount > 0 ? '#f4941c' : '#F5F4F2' }}>
            <FiShoppingCart size={17} style={{ color: cartCount > 0 ? '#fff' : '#9ca3af' }} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white text-orange-500 text-[9px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Delivery info */}
        {deliveryInfo && (
          <div className="mx-4 mb-2 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: deliveryInfo.warning ? '#fffbeb' : '#f0fdf4', border: `1px solid ${deliveryInfo.warning ? '#fde68a' : '#bbf7d0'}` }}>
            {deliveryInfo.warning
              ? <FiAlertTriangle size={12} className="text-amber-500 shrink-0" />
              : <FiClock size={12} className="text-green-500 shrink-0" />}
            <p className="text-[11px] font-semibold" style={{ color: deliveryInfo.warning ? '#92400e' : '#15803d' }}>
              {deliveryInfo.isFreeDelivery ? '🎉 Free delivery' : `Delivery ₹${deliveryInfo.charge}`}
              {deliveryInfo.warning ? ` · ${deliveryInfo.warning.split('.')[0]}` : ''}
            </p>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all"
              style={{
                background: activeCategory === cat ? '#f4941c' : '#fff',
                color: activeCategory === cat ? '#fff' : '#6b7280',
                border: activeCategory === cat ? 'none' : '1px solid #e5e7eb',
                boxShadow: activeCategory === cat ? '0 3px 8px rgba(244,148,28,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}>
              {cat === 'all' ? 'All' : (CAT_LABEL[cat] || cat.replace('_', ' '))}
            </button>
          ))}
        </div>
      </div>

      {/* ── Products ── */}
      <div className="px-3 pt-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-16">No products here</p>
        )}
        {filtered.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            qty={getQty(product._id)}
            sellerId={sellerId}
            sellerName={seller?.shopName}
            onAdd={addToCart}
            onUpdate={updateQuantity}
          />
        ))}
      </div>

      {/* ── Cart bar ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          <button onClick={() => navigate('/eptofresh/cart')}
            className="w-full py-3.5 rounded-2xl flex items-center justify-between px-5"
            style={{ background: '#f4941c', boxShadow: '0 4px 18px rgba(244,148,28,0.4)' }}>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white text-orange-500 font-black text-xs flex items-center justify-center">
                {cartCount}
              </span>
              <span className="text-white font-bold text-sm">item{cartCount > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="text-white font-bold text-sm">₹{Number(cartTotal).toFixed(0)} · View →</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────
function ProductCard({ product, qty, sellerId, sellerName, onAdd, onUpdate }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!selectedVariant && !product.basePrice) return;
    setAdding(true);
    await onAdd({
      sellerId, sellerName,
      productId: product._id,
      variantId: selectedVariant?._id,
      weight: selectedVariant?.weight,
      label: selectedVariant?.label,
      price: selectedVariant?.price || product.todayPrice || product.basePrice,
      quantity: 1,
      cutType: product.cutTypes?.[0],
      name: `${product.name}${selectedVariant ? ` (${selectedVariant.label})` : ''}`,
      image: product.images?.[0]?.url,
    });
    setAdding(false);
  };

  const price = selectedVariant?.price || product.todayPrice || product.basePrice;

  return (
    <div className="flex gap-3 bg-white rounded-2xl p-3"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>

      {/* Image */}
      <div className="w-[76px] h-[76px] rounded-xl overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
        {product.images?.[0]?.url
          ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
          : <span className="text-3xl select-none">{catEmoji(product.category)}</span>}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: name + tags */}
        <div>
          <div className="flex gap-1 flex-wrap mb-0.5">
            {product.tags?.freshToday   && <Tag color="green">🌿 Fresh</Tag>}
            {product.tags?.cutToOrder   && <Tag color="orange">✂️ Cut to Order</Tag>}
            {product.tags?.fastDelivery && <Tag color="blue">⚡ Fast</Tag>}
          </div>
          <p className="text-gray-900 text-sm font-bold leading-snug">{product.name}</p>
          {product.nameLocal && <p className="text-gray-400 text-[11px]">{product.nameLocal}</p>}
        </div>

        {/* Variants */}
        {product.variants?.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {product.variants.map(v => (
              <button key={v._id} onClick={() => setSelectedVariant(v)} disabled={!v.isAvailable}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: selectedVariant?._id === v._id ? '#f4941c' : '#f5f5f5',
                  color: selectedVariant?._id === v._id ? '#fff' : '#6b7280',
                  border: selectedVariant?._id === v._id ? 'none' : '1px solid #e5e7eb',
                  opacity: v.isAvailable ? 1 : 0.4,
                }}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Bottom: price + add */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-orange-500 font-black text-base">₹{price}</span>
            {!product.isInStock && <span className="ml-1.5 text-red-400 text-xs">Out of stock</span>}
          </div>

          {product.isInStock ? (
            qty > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ productId: product._id, variantId: selectedVariant?._id, quantity: qty - 1 })}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#fff4e6', border: '1.5px solid #f4941c' }}>
                  <FiMinus size={14} style={{ color: '#f4941c' }} />
                </button>
                <span className="text-gray-900 font-black text-base w-5 text-center">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#f4941c', boxShadow: '0 3px 10px rgba(244,148,28,0.4)' }}>
                  <FiPlus size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button onClick={handleAdd} disabled={adding}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: '#f4941c', boxShadow: '0 3px 10px rgba(244,148,28,0.3)', minWidth: 68 }}>
                {adding ? '…' : '+ Add'}
              </button>
            )
          ) : (
            <span className="text-gray-300 text-xs">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, color }) {
  const map = { green: ['#f0fdf4','#15803d'], orange: ['#fff7ed','#c2410c'], blue: ['#eff6ff','#1d4ed8'] };
  const [bg, text] = map[color] || map.green;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: bg, color: text }}>{children}</span>
  );
}

// Simple food emoji per category (not an icon — emoji scales perfectly on mobile)
function catEmoji(cat) {
  const map = { chicken:'🍗', mutton:'🐑', fish:'🐟', seafood:'🦐', beef:'🥩', pork:'🥓', ready_to_cook:'🍱' };
  return map[cat] || '🥩';
}
