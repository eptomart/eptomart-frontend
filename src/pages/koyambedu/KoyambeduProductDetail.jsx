import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const IMG_PLACEHOLDER = 'https://placehold.co/600x400/dcfce7/166534?text=Fresh+Produce';

export default function KoyambeduProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getQty, updateItem, loading: cartLoading, itemCount, subtotal } = useKoyambeduCart();

  const [product,      setProduct]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeImg,    setActiveImg]    = useState(0);
  const [deliveryType, setDeliveryType] = useState('tomorrow');
  const [qty,          setLocalQty]    = useState(1);

  useEffect(() => {
    api.get(`/koyambedu/products/${productId}`)
      .then(r => {
        setProduct(r.data.product);
        setLocalQty(r.data.product.qtyStep || 1);
        if (r.data.product.isSameDay) setDeliveryType('today');
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-3">
      <p className="text-5xl">🌿</p>
      <p className="text-gray-500">Product not found</p>
      <button onClick={() => navigate('/koyambedu/shop')} className="text-green-600 font-semibold text-sm">← Back to shop</button>
    </div>
  );

  const cartQty  = getQty(productId);
  const images   = product.images?.length ? product.images : [{ url: IMG_PLACEHOLDER }];
  const step     = product.qtyStep || 0.5;
  const inCart   = cartQty > 0;

  const handleAddOrUpdate = () => {
    updateItem(productId, qty, deliveryType);
  };

  return (
    <div className="min-h-screen bg-green-50 pb-32">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-bold text-base flex-1 truncate">{product.name}</h1>
        <Link to="/koyambedu/cart" className="relative">
          <span className="text-xl text-white">🛍️</span>
          {itemCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{itemCount}</span>}
        </Link>
      </div>

      {/* Images */}
      <div className="bg-white">
        <img src={images[activeImg]?.url || IMG_PLACEHOLDER} alt={product.name} className="w-full h-64 object-cover" />
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${activeImg === i ? 'border-green-500' : 'border-transparent'}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        {product.badges?.map(b => (
          <span key={b} className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
            {b.replace('_', ' ')}
          </span>
        ))}
        {product.isSameDay && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">⚡ Same Day</span>}
        {product.isNextDay && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">📅 Next Day</span>}
      </div>

      {/* Product info */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm border border-green-100 p-4">
        <h2 className="font-bold text-gray-800 text-lg">{product.name}</h2>
        {product.nameTamil && <p className="text-sm text-gray-500 mt-0.5">{product.nameTamil}</p>}

        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-green-700 font-black text-2xl">₹{product.currentPrice}</span>
          <span className="text-gray-400 text-sm">per {product.unitLabel}</span>
        </div>

        {product.marketPriceMin > 0 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-amber-700 text-xs font-semibold">
              📊 Today's Koyambedu Market Rate: ₹{product.marketPriceMin}–₹{product.marketPriceMax}/{product.unitLabel}
            </p>
          </div>
        )}

        {product.freshArrivalTime && (
          <p className="mt-2 text-green-600 text-xs font-semibold">🌅 Arrived today at {product.freshArrivalTime}</p>
        )}

        {product.description && (
          <p className="mt-3 text-gray-600 text-sm leading-relaxed">{product.description}</p>
        )}

        {/* Seller info */}
        <div className="mt-4 pt-3 border-t border-green-50">
          <p className="text-xs text-gray-500">Sold by</p>
          <p className="font-semibold text-gray-800 text-sm">{product.seller?.businessName}</p>
          {product.seller?.stallNumber && <p className="text-xs text-gray-500">Stall {product.seller.stallNumber} · {product.seller?.marketSection}</p>}
          {product.seller?.rating > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">⭐ {product.seller.rating.toFixed(1)} ({product.seller.ratingCount} ratings)</p>
          )}
        </div>
      </div>

      {/* Price note */}
      <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <p className="text-amber-700 text-[11px] leading-relaxed">
          ⚠️ Fresh produce prices may vary slightly based on daily market arrivals. Buyer approval will be requested before dispatch if price changes.
        </p>
      </div>

      {/* Delivery options */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm border border-green-100 p-4">
        <p className="font-semibold text-gray-800 text-sm mb-3">Delivery Option</p>
        <div className="grid grid-cols-2 gap-2">
          {product.isSameDay && (
            <button onClick={() => setDeliveryType('today')}
              className={`p-3 rounded-xl border-2 text-left transition ${deliveryType === 'today' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <p className="text-lg">⚡</p>
              <p className="font-bold text-gray-800 text-sm">Today</p>
              <p className="text-xs text-gray-500">Order by {product.sameDayCutoff}</p>
            </button>
          )}
          {product.isNextDay && (
            <button onClick={() => setDeliveryType('tomorrow')}
              className={`p-3 rounded-xl border-2 text-left transition ${deliveryType === 'tomorrow' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <p className="text-lg">📅</p>
              <p className="font-bold text-gray-800 text-sm">Tomorrow</p>
              <p className="text-xs text-gray-500">Early morning sourcing</p>
            </button>
          )}
        </div>
      </div>

      {/* Quantity selector */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm border border-green-100 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Quantity</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocalQty(q => Math.max(product.minQty || step, q - step))}
              className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-lg flex items-center justify-center">−</button>
            <span className="font-bold text-gray-800 min-w-[40px] text-center text-sm">{qty} {product.unitLabel}</span>
            <button onClick={() => setLocalQty(q => Math.min(product.maxQty || 50, q + step))}
              className="w-9 h-9 rounded-full bg-green-600 text-white font-bold text-lg flex items-center justify-center">+</button>
          </div>
        </div>
        {product.minQty > 0 && <p className="text-xs text-gray-400 mt-2">Min: {product.minQty} {product.unitLabel} · Max: {product.maxQty} {product.unitLabel}</p>}
        {product.isBulkAvailable && product.bulkMinQty && (
          <p className="text-xs text-green-600 mt-1 font-medium">📦 Bulk price: ₹{product.bulkPricePerUnit}/{product.unitLabel} for {product.bulkMinQty}+ {product.unitLabel}</p>
        )}
      </div>

      {/* Add to cart / update */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 px-4 py-3 flex gap-3 z-[9990]">
        <div className="flex-1">
          <p className="text-xs text-gray-500">{qty} {product.unitLabel} × ₹{product.currentPrice}</p>
          <p className="font-bold text-green-700 text-sm">₹{(qty * product.currentPrice).toFixed(2)}</p>
        </div>
        <button
          onClick={handleAddOrUpdate}
          disabled={cartLoading}
          className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition active:scale-95 disabled:opacity-60">
          {inCart ? '✓ Update Cart' : '+ Add to Cart'}
        </button>
      </div>
    </div>
  );
}
