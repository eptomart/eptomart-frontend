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

  const deliveryCharge = subtotal >= 499 ? 0 : 40;
  const serviceFee = 10;
  const total = subtotal + deliveryCharge + serviceFee;

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
          const step = prod?.qtyStep || 0.5;
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
                  <button onClick={() => updateItem(String(prod?._id || item.product), Math.max(0, item.quantity - step))}
                    className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-sm">−</button>
                  <span className="text-sm font-bold text-gray-800 min-w-[36px] text-center">{item.quantity} {item.unitLabel}</span>
                  <button onClick={() => updateItem(String(prod?._id || item.product), item.quantity + step)}
                    className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm">+</button>
                </div>
                {/* Delivery type badge */}
                <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${item.deliveryType === 'today' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.deliveryType === 'today' ? '⚡ Today' : '📅 Tomorrow'}
                </span>
              </div>
              <div className="text-right flex flex-col justify-between">
                <p className="font-bold text-green-700 text-sm">₹{line.toFixed(2)}</p>
                <button onClick={() => updateItem(String(prod?._id || item.product), 0)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
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
            <span className={deliveryCharge === 0 ? 'text-green-600 font-semibold' : ''}>
              {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
            </span>
          </div>
          {subtotal < 499 && (
            <p className="text-xs text-green-600">Add ₹{(499 - subtotal).toFixed(0)} more for FREE delivery</p>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 px-4 py-3 z-[9990]">
        <button
          onClick={() => {
            if (!user) { navigate('/login', { state: { from: '/koyambedu/checkout' } }); return; }
            navigate('/koyambedu/checkout');
          }}
          className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition text-sm">
          Proceed to Checkout · ₹{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
