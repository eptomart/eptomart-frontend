// ============================================
// EPTOFRESH SHOP — White Premium Theme
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiStar, FiMapPin, FiShoppingCart, FiPlus, FiMinus, FiAlertTriangle, FiClock } from 'react-icons/fi';
import { FaDrumstickBite } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import Navbar from '../../components/common/Navbar';

export default function EptoFreshShop() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cartCount, items, userLocation } = useEptoFreshCart();

  const [seller, setSeller]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  useEffect(() => { fetchShop(); }, [sellerId]);

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

  const categories = ['all', ...new Set(products.map(p => p.category))];
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
      <div className="min-h-screen" style={{ background: '#F5F4F2' }}>
        <Navbar />
        <div className="h-40 animate-pulse" style={{ background: 'linear-gradient(135deg,#ea6c0a,#f4941c)' }} />
        <div className="px-4 mt-4 space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-white"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <Navbar />

      {/* ── Shop header ── */}
      <div className="relative">
        {/* Banner */}
        <div className="h-36 overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #ea6c0a 0%, #f4941c 50%, #f9b048 100%)' }}>
          {seller?.bannerImage && (
            <img src={seller.bannerImage} alt="" className="w-full h-full object-cover opacity-50" />
          )}
          {/* Overlay pattern */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }} />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/eptofresh')}
          className="absolute top-4 left-4 p-2 rounded-full"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}>
          <FiArrowLeft className="text-white" />
        </button>

        {/* Cart pill */}
        {cartCount > 0 && (
          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <FiShoppingCart style={{ color: '#f4941c' }} size={16} />
            <span className="font-bold text-xs" style={{ color: '#f4941c' }}>{cartCount}</span>
          </button>
        )}

        {/* Shop info card — elevated over banner */}
        <div className="mx-4 -mt-10 relative bg-white rounded-2xl px-4 py-3"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-orange-100 bg-orange-50 flex items-center justify-center shrink-0">
              {seller?.shopImage
                ? <img src={seller.shopImage} alt={seller?.shopName} className="w-full h-full object-cover" />
                : <FaDrumstickBite size={22} style={{ color: '#f4941c' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-gray-900 text-base font-bold truncate">{seller?.shopName}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <FiStar size={11} style={{ fill: '#f59e0b', stroke: '#f59e0b' }} />
                  {Number(seller?.rating || 0).toFixed(1)}
                </span>
                {seller?.distanceKm && (
                  <span className="flex items-center gap-1 text-green-600 font-semibold">
                    <FiMapPin size={10} /> {seller.distanceKm.toFixed(1)} km
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${seller?.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {seller?.isOpen ? '● Open' : '● Closed'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery info */}
          {deliveryInfo && (
            <div className="mt-2.5 rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background: deliveryInfo.warning ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${deliveryInfo.warning ? '#fde68a' : '#bbf7d0'}`,
              }}>
              {deliveryInfo.warning
                ? <FiAlertTriangle size={13} className="text-amber-500 shrink-0" />
                : <FiClock size={13} className="text-green-500 shrink-0" />}
              <p className="text-xs font-semibold" style={{ color: deliveryInfo.warning ? '#92400e' : '#15803d' }}>
                {deliveryInfo.isFreeDelivery ? '🎉 Free delivery on this order' : `Delivery ₹${deliveryInfo.charge}`}
                {deliveryInfo.warning ? ` · ${deliveryInfo.warning.split('.')[0]}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize transition-all"
            style={{
              background: activeCategory === cat ? '#f4941c' : '#fff',
              color: activeCategory === cat ? '#fff' : '#6b7280',
              boxShadow: activeCategory === cat
                ? '0 4px 14px rgba(244,148,28,0.4)'
                : '0 1px 4px rgba(0,0,0,0.06)',
              border: activeCategory === cat ? 'none' : '1px solid rgba(0,0,0,0.05)',
            }}>
            {cat === 'all' ? 'All Items' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Products */}
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

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-50">
          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="w-full py-3.5 rounded-2xl flex items-center justify-between px-5"
            style={{ background: '#f4941c', boxShadow: '0 8px 28px rgba(244,148,28,0.45)' }}>
            <span className="text-white font-bold text-sm">🛒 {cartCount} item{cartCount > 1 ? 's' : ''}</span>
            <span className="text-white font-bold text-sm">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
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
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#fff4e6,#ffe8c8)' }}>
        {product.images?.[0]?.url
          ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
          : <FaDrumstickBite size={28} style={{ color: '#f4941c' }} />}
      </div>

      <div className="flex-1 min-w-0">
        {/* Tags */}
        {(product.tags?.freshToday || product.tags?.cutToOrder || product.tags?.fastDelivery) && (
          <div className="flex gap-1 flex-wrap mb-1">
            {product.tags?.freshToday   && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-100">🌿 Fresh</span>}
            {product.tags?.cutToOrder   && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold border border-orange-100">🔪 Cut to Order</span>}
            {product.tags?.fastDelivery && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100">⚡ Fast</span>}
          </div>
        )}

        <p className="text-gray-900 text-sm font-bold">{product.name}</p>
        {product.nameLocal && <p className="text-gray-400 text-xs">{product.nameLocal}</p>}

        {/* Variant selector */}
        {product.variants?.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {product.variants.map(v => (
              <button
                key={v._id}
                onClick={() => setSelectedVariant(v)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: selectedVariant?._id === v._id ? '#f4941c' : '#f9f9f9',
                  color: selectedVariant?._id === v._id ? '#fff' : '#6b7280',
                  border: selectedVariant?._id === v._id ? 'none' : '1px solid #e5e7eb',
                  opacity: v.isAvailable ? 1 : 0.4,
                }}
                disabled={!v.isAvailable}>
                {v.label} · ₹{v.price}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-orange-500 font-extrabold text-sm">₹{price}</span>
            {!product.isInStock && <span className="ml-2 text-red-400 text-xs font-semibold">Out of stock</span>}
          </div>

          {product.isInStock ? (
            qty > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ productId: product._id, variantId: selectedVariant?._id, quantity: qty - 1 })}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ background: '#fff4e6', color: '#f4941c', border: '1.5px solid #f4941c33' }}>
                  <FiMinus size={13} />
                </button>
                <span className="text-gray-900 font-extrabold text-sm w-5 text-center">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ background: '#f4941c', boxShadow: '0 3px 10px rgba(244,148,28,0.4)' }}>
                  <FiPlus size={13} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: '#f4941c', color: '#fff', boxShadow: '0 3px 10px rgba(244,148,28,0.35)' }}>
                {adding ? '…' : '+ Add'}
              </button>
            )
          ) : (
            <span className="text-gray-300 text-xs font-semibold">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
