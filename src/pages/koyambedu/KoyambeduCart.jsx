import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';

const IMG_PH = 'https://placehold.co/80x80/dcfce7/166534?text=🌿';

export default function KoyambeduCart() {
  const { cart, fetchCart, updateItem, loading, subtotal, itemCount } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  // Weight-based delivery charge (computed from cart items)
  const totalWeightKg = (cart.items || []).reduce((sum, item) => {
    const wpu = item.product?.weightKg != null ? item.product.weightKg
      : (item.unit === 'g' ? 0.001 : 1);
    return sum + wpu * (item.quantity || 0);
  }, 0);
  const deliveryCharge = totalWeightKg >= 20 ? 249 : 149;
  const serviceFee     = 10;
  const total          = subtotal + deliveryCharge + serviceFee;

  if (!cart.items?.length) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-6xl">🛒</p>
      <h2 className="font-bold text-gray-800 text-xl">Your cart is empty</h2>
      <p className="text-gray-500 text-sm text-center">Add fresh vegetables, fruits and flowers from Koyambedu market</p>
      <Link to="/koyambedu/shop" className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition">
        Browse Fresh Market
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-36">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-white font-black text-lg flex-1">My Cart</h1>
        <span className="text-white/80 text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Price note */}
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <p className="text-amber-700 text-[11px] leading-relaxed">
          ⚠️ Final prices may vary slightly based on daily market rates. You'll be notified before dispatch if any change occurs.
        </p>
      </div>

      {/* Items */}
      <div className="mx-4 mt-4 space-y-3">
        {cart.items.map((item, i) => {
          const prod = item.product;
          const img  = prod?.images?.find(im => im.isPrimary)?.url || prod?.images?.[0]?.url || IMG_PH;
          const step = Math.max(1, prod?.qtyStep || 1);
          const line = (item.unitPrice || 0) * (item.quantity || 0);

          return (
            <div key={item._id || i} className="bg-white rounded-2xl shadow-sm border border-green-100 p-3 flex gap-3">
              <Link to={`/koyambedu/product/${prod?._id}`}>
                <img src={img} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/koyambedu/product/${prod?._id}`}>
                  <p className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</p>
                </Link>
                <p className="text-xs text-gray-400">₹{item.unitPrice}/{item.unitLabel}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => updateItem(String(prod?._id || item.product), Math.max(0, item.quantity - step), item.deliveryType || 'tomorrow', { silent: true })}
                    className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-sm active:scale-90 transition-transform">−</button>
                  <span className="text-sm font-bold text-gray-800 min-w-[36px] text-center">{item.quantity} {item.unitLabel}</span>
                  <button onClick={() => updateItem(String(prod?._id || item.product), item.quantity + step, item.deliveryType || 'tomorrow', { silent: true })}
                    className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm active:scale-90 transition-transform">+</button>
                </div>
                {/* Delivery type badge */}
                <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${item.deliveryType === 'today' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.deliveryType === 'today' ? '⚡ Today' : '📅 Tomorrow'}
                </span>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <p className="font-bold text-green-700 text-sm">₹{line.toFixed(2)}</p>
                <button
                  onClick={() => updateItem(String(prod?._id || item.product), 0)}
                  disabled={loading}
                  className="mt-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition disabled:opacity-50"
                  title="Remove item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price breakdown */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-green-100 p-4">
        <h3 className="font-bold text-gray-800 text-sm mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({itemCount} item{itemCount > 1 ? 's' : ''})</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery charge</span>
            <span>₹{deliveryCharge}</span>
          </div>
          <p className="text-xs text-gray-400">
            {totalWeightKg < 20
              ? `~${totalWeightKg.toFixed(1)} kg order · ₹149 for orders under 20 kg`
              : `~${totalWeightKg.toFixed(1)} kg order · ₹249 for orders 20–90 kg`}
          </p>
          {totalWeightKg > 90 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700 font-medium">
              ⚠️ Orders above 90 kg require special handling. Please contact us before checkout.
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Service fee</span>
            <span>₹{serviceFee}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-green-50">
            <span>Total</span>
            <span className="text-green-700">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Proceed button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 px-4 pt-3 z-[9990]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        {!user && (
          <p className="text-center text-xs text-gray-400 mb-2">
            🔒 You'll be asked to log in at payment — cart is saved!
          </p>
        )}
        <button
          onClick={() => navigate('/koyambedu/checkout')}
          className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition text-sm"
          style={{ boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>
          Proceed to Checkout · ₹{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
