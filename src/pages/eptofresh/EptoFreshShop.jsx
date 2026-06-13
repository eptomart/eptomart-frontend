// ============================================
// EPTOFRESH SHOP — Clean White Theme
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiStar, FiMapPin, FiShoppingCart,
  FiPlus, FiMinus, FiAlertTriangle, FiClock,
} from 'react-icons/fi';
import { GiSteak, GiChickenLeg, GiShrimp, GiMeat, GiRoastChicken } from 'react-icons/gi';
import { FaFish } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import Navbar from '../../components/common/Navbar';

// Simple text-only category tabs — no icons
const CAT_COLORS = {
  chicken: '#f97316', mutton: '#ef4444', fish: '#3b82f6',
  seafood: '#0d9488', beef: '#b91c1c', pork: '#9333ea', ready_to_cook: '#d97706',
};

export default function EptoFreshShop() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cartCount, cartTotal, items, userLocation } = useEptoFreshCart();

  const [seller, setSeller]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  // Re-fetch when sellerId changes OR when location becomes available
  useEffect(() => { fetchShop(); }, [sellerId, userLocation?.lat, userLocation?.lng]);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const params = userLocation ? `?lat=${userLocation.lat}&lng=${userLocation.lng}` : '';
      const [sellerRes, productsRes] = await Promise.all([
        api.get(`/eptofresh/sellers/${sellerId}${params}`),
        api.get(`/eptofresh/sellers/${sellerId}/products`),
      ]);
      if (sellerRes.data.success)   setSeller(sellerRes.data.seller);
      if (productsRes.data.success) setProducts(productsRes.data.products || []);
      if (sellerRes.data.seller?.deliveryInfo) setDeliveryInfo(sellerRes.data.seller.deliveryInfo);
    } catch {
      toast.error('Failed to load shop');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  const getCartQty = (productId) => {
    const item = items.find(i =>
      (i.product?._id || i.product) === productId || i.productId === productId
    );
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="px-4 mt-4 space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#F5F4F2', paddingBottom: cartCount > 0 ? 140 : 100 }}>
      <Navbar />

      {/* ── Clean white shop header (no orange splash) ── */}
      <div className="bg-white px-4 pt-3 pb-0" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* Back + cart row */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('/eptofresh')}
            className="flex items-center gap-1.5 text-gray-600 text-sm font-semibold">
            <FiArrowLeft size={17} /> Back
          </button>
          {cartCount > 0 && (
            <button
              onClick={() => navigate('/eptofresh/cart')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: '#f4941c', boxShadow: '0 4px 14px rgba(244,148,28,0.35)' }}>
              <FiShoppingCart className="text-white" size={14} />
              <span className="text-white text-xs font-bold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
            </button>
          )}
        </div>

        {/* Shop identity */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-orange-100 shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#fff4e6,#ffe8c8)' }}>
            {seller?.shopImage
              ? <img src={seller.shopImage} alt={seller?.shopName} className="w-full h-full object-cover" />
              : <GiSteak size={26} style={{ color: '#f4941c' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 text-base font-bold truncate">{seller?.shopName}</h1>
            <div className="flex items-center gap-3 text-xs mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <FiStar size={11} style={{ fill: '#f59e0b', stroke: '#f59e0b' }} />
                {Number(seller?.rating || 0).toFixed(1)}
              </span>
              {seller?.distanceKm != null && (
                <span className="flex items-center gap-1 text-green-600 font-semibold">
                  <FiMapPin size={10} /> {Number(seller.distanceKm).toFixed(1)} km away
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${seller?.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {seller?.isOpen ? '● Open' : '● Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery info strip */}
        {deliveryInfo && (
          <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{
              background: deliveryInfo.warning ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${deliveryInfo.warning ? '#fde68a' : '#bbf7d0'}`,
            }}>
            {deliveryInfo.warning
              ? <FiAlertTriangle size={12} className="text-amber-500 shrink-0" />
              : <FiClock size={12} className="text-green-500 shrink-0" />}
            <p className="text-xs font-semibold" style={{ color: deliveryInfo.warning ? '#92400e' : '#15803d' }}>
              {deliveryInfo.isFreeDelivery ? '🎉 Free delivery' : `Delivery ₹${deliveryInfo.charge}`}
              {deliveryInfo.warning ? ` · ${deliveryInfo.warning.split('.')[0]}` : ''}
            </p>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize shrink-0 transition-all"
              style={{
                background: activeCategory === cat ? '#f4941c' : '#F5F4F2',
                color: activeCategory === cat ? '#fff' : '#6b7280',
                boxShadow: activeCategory === cat ? '0 3px 10px rgba(244,148,28,0.35)' : 'none',
                border: activeCategory === cat ? 'none' : '1px solid #e5e7eb',
              }}>
              {cat === 'all' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Products ── */}
      <div className="px-4 mt-3 space-y-3">
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No products in this category</p>
          </div>
        )}
        {filteredProducts.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            qty={getCartQty(product._id)}
            sellerId={sellerId}
            sellerName={seller?.shopName}
            onAdd={addToCart}
            onUpdate={updateQuantity}
          />
        ))}
      </div>

      {/* ── Single sticky cart bar ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-50">
          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="w-full py-3.5 rounded-2xl flex items-center justify-between px-5"
            style={{ background: '#f4941c', boxShadow: '0 8px 28px rgba(244,148,28,0.45)' }}>
            <div className="flex items-center gap-2">
              <span className="bg-white text-orange-500 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                {cartCount}
              </span>
              <span className="text-white font-bold text-sm">item{cartCount > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="text-white font-bold text-sm">₹{cartTotal.toFixed(0)} · View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Category-based icon placeholder
function ProductPlaceholder({ category }) {
  const map = {
    chicken:      { Icon: GiChickenLeg,   color: '#f97316' },
    mutton:       { Icon: GiMeat,         color: '#ef4444' },
    fish:         { Icon: FaFish,         color: '#3b82f6' },
    seafood:      { Icon: GiShrimp,       color: '#0d9488' },
    beef:         { Icon: GiSteak,        color: '#b91c1c' },
    pork:         { Icon: GiRoastChicken, color: '#9333ea' },
    ready_to_cook:{ Icon: GiRoastChicken, color: '#d97706' },
  };
  const { Icon = GiSteak, color = '#f4941c' } = map[category] || {};
  return <Icon size={32} style={{ color }} />;
}

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
      weight:    selectedVariant?.weight,
      label:     selectedVariant?.label,
      price:     selectedVariant?.price || product.todayPrice || product.basePrice,
      quantity:  1,
      cutType:   product.cutTypes?.[0],
      name:      `${product.name}${selectedVariant ? ` (${selectedVariant.label})` : ''}`,
      image:     product.images?.[0]?.url,
    });
    setAdding(false);
  };

  const price = selectedVariant?.price || product.todayPrice || product.basePrice;

  return (
    <div className="rounded-2xl p-3 flex gap-3 bg-white"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>

      {/* Product image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #fff4e6, #ffe8c8)' }}>
        {product.images?.[0]?.url
          ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
          : <ProductPlaceholder category={product.category} />}
      </div>

      <div className="flex-1 min-w-0">
        {/* Tags */}
        {(product.tags?.freshToday || product.tags?.cutToOrder || product.tags?.fastDelivery) && (
          <div className="flex gap-1 flex-wrap mb-1">
            {product.tags?.freshToday   && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">🌿 Fresh</span>}
            {product.tags?.cutToOrder   && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold">✂️ Cut to Order</span>}
            {product.tags?.fastDelivery && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">⚡ Fast</span>}
          </div>
        )}

        <p className="text-gray-900 text-sm font-bold leading-snug">{product.name}</p>
        {product.nameLocal && <p className="text-gray-400 text-xs">{product.nameLocal}</p>}

        {/* Variant chips */}
        {product.variants?.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {product.variants.map(v => (
              <button
                key={v._id}
                onClick={() => setSelectedVariant(v)}
                disabled={!v.isAvailable}
                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: selectedVariant?._id === v._id ? '#f4941c' : '#f5f5f5',
                  color: selectedVariant?._id === v._id ? '#fff' : '#6b7280',
                  border: selectedVariant?._id === v._id ? 'none' : '1px solid #e5e7eb',
                  opacity: v.isAvailable ? 1 : 0.4,
                }}>
                {v.label} · ₹{v.price}
              </button>
            ))}
          </div>
        )}

        {/* Price + add/qty */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-orange-500 font-extrabold text-base">₹{price}</span>
            {!product.isInStock && <span className="ml-2 text-red-400 text-xs">Out of stock</span>}
          </div>

          {product.isInStock ? (
            qty > 0 ? (
              <div className="flex items-center gap-2.5">
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
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#f4941c', color: '#fff', boxShadow: '0 3px 10px rgba(244,148,28,0.35)', minWidth: 72 }}>
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
