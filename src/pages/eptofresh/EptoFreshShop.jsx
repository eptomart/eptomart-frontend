// ============================================
// EPTOFRESH SHOP — Seller Product Catalog
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiStar, FiMapPin, FiShoppingCart, FiPlus, FiMinus, FiAlertTriangle } from 'react-icons/fi';
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

  useEffect(() => {
    fetchShop();
  }, [sellerId]);

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
    const item = items.find(i => (i.product?._id || i.product) === productId);
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#0B1729' }}>
        <Navbar />
        <div className="h-40 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="px-4 mt-4 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#0B1729' }}>
      <Navbar />
      {/* Shop header */}
      <div className="relative">
        <div className="h-36 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a2a4a 0%, #0B1729 100%)' }}>
          {seller?.bannerImage && (
            <img src={seller.bannerImage} alt="" className="w-full h-full object-cover opacity-40" />
          )}
        </div>

        <button
          onClick={() => navigate('/eptofresh')}
          className="absolute top-4 left-4 p-2 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          <FiArrowLeft className="text-white" />
        </button>

        {cartCount > 0 && (
          <button
            onClick={() => navigate('/eptofresh/cart')}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: '#f4941c' }}
          >
            <FiShoppingCart className="text-white" size={16} />
            <span className="text-white text-xs font-bold">{cartCount}</span>
          </button>
        )}

        <div className="px-4 -mt-8 relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-orange-400 bg-gray-800 flex items-center justify-center mb-2">
            {seller?.shopImage ? (
              <img src={seller.shopImage} alt={seller?.shopName} className="w-full h-full object-cover" />
            ) : <span className="text-2xl">🥩</span>}
          </div>

          <h1 className="text-white text-lg font-bold">{seller?.shopName}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1"><FiStar size={11} className="text-yellow-400" /> {Number(seller?.rating || 0).toFixed(1)}</span>
            {seller?.distanceKm && (
              <span className="flex items-center gap-1"><FiMapPin size={11} className="text-green-400" /> {seller.distanceKm.toFixed(1)} km</span>
            )}
            <span className={`px-2 py-0.5 rounded-full ${seller?.isOpen ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'} text-[10px] font-semibold`}>
              {seller?.isOpen ? '● Open' : '● Closed'}
            </span>
          </div>

          {/* Delivery info banner */}
          {deliveryInfo && (
            <div className="mt-3 rounded-xl p-2.5 flex items-center gap-2" style={{ background: deliveryInfo.warning ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)' }}>
              {deliveryInfo.warning ? <FiAlertTriangle size={14} className="text-yellow-400 shrink-0" /> : <span className="text-sm">🚴</span>}
              <p className="text-xs" style={{ color: deliveryInfo.warning ? '#fbbf24' : '#34d399' }}>
                {deliveryInfo.isFreeDelivery ? 'Free delivery on this order' : `Delivery ₹${deliveryInfo.charge}`}
                {deliveryInfo.warning ? ` — ${deliveryInfo.warning.split('.')[0]}` : ''}
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
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all"
            style={{
              background: activeCategory === cat ? '#f4941c' : 'rgba(255,255,255,0.07)',
              color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="px-4 mt-4 space-y-3">
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No products in this category</p>
          </div>
        )}
        {filteredProducts.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            qty={getCartQty(product._id)}
            sellerId={sellerId}
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
            className="w-full py-3 rounded-2xl flex items-center justify-between px-4"
            style={{ background: '#f4941c', boxShadow: '0 8px 24px rgba(244,148,28,0.4)' }}
          >
            <span className="text-white font-bold text-sm">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</span>
            <span className="text-white font-bold text-sm">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, qty, sellerId, onAdd, onUpdate }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!selectedVariant && !product.basePrice) return;
    setAdding(true);
    await onAdd({
      sellerId,
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
    <div className="rounded-2xl p-3 flex gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-700 shrink-0 flex items-center justify-center">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
        ) : <span className="text-2xl">🥩</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex gap-1 flex-wrap mb-0.5">
          {product.tags?.freshToday   && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">🌿 Fresh Today</span>}
          {product.tags?.cutToOrder   && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-400">🔪 Cut to Order</span>}
          {product.tags?.fastDelivery && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">⚡ Fast</span>}
        </div>

        <p className="text-white text-sm font-semibold">{product.name}</p>
        {product.nameLocal && <p className="text-gray-500 text-xs">{product.nameLocal}</p>}

        {/* Variant selector */}
        {product.variants?.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {product.variants.map(v => (
              <button
                key={v._id}
                onClick={() => setSelectedVariant(v)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: selectedVariant?._id === v._id ? '#f4941c' : 'rgba(255,255,255,0.07)',
                  color: selectedVariant?._id === v._id ? '#fff' : 'rgba(255,255,255,0.5)',
                  opacity: v.isAvailable ? 1 : 0.4,
                }}
                disabled={!v.isAvailable}
              >
                {v.label} — ₹{v.price}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-orange-400 font-bold text-sm">₹{price}</span>
            {!product.isInStock && <span className="ml-2 text-red-400 text-xs">Out of stock</span>}
          </div>

          {product.isInStock ? (
            qty > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ productId: product._id, quantity: qty - 1 })}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(244,148,28,0.15)', color: '#f4941c' }}
                >
                  <FiMinus size={14} />
                </button>
                <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#f4941c' }}
                >
                  <FiPlus size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: '#f4941c', color: '#fff' }}
              >
                {adding ? '...' : 'Add'}
              </button>
            )
          ) : (
            <span className="text-gray-600 text-xs">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
