// ============================================
// KOYAMBEDU CART — Unified Design System
// ============================================
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiShoppingBag, FiMinus, FiPlus, FiTrash2,
  FiZap, FiCalendar, FiAlertTriangle, FiLogIn,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';

const IMG_PH = 'https://placehold.co/80x80/dcfce7/166534?text=🌿';

export default function KoyambeduCart() {
  const { cart, fetchCart, updateItem, loading, subtotal, itemCount } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  // Weight-based delivery charge
  const totalWeightKg = (cart.items || []).reduce((sum, item) => {
    const wpu = item.product?.weightKg != null ? item.product.weightKg
      : (item.unit === 'g' ? 0.001 : 1);
    return sum + wpu * (item.quantity || 0);
  }, 0);
  const deliveryCharge = totalWeightKg >= 20 ? 249 : 149;
  const serviceFee     = 10;
  const total          = subtotal + deliveryCharge + serviceFee;

  // ── Empty state ──────────────────────────────────────────
  if (!cart.items?.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-2"
        style={{ background: '#f0fdf4', border: '1.5px solid rgba(22,163,74,0.12)' }}>
        <FiShoppingBag size={40} className="text-green-300" />
      </div>
      <h2 className="font-bold text-gray-800 text-xl">Your cart is empty</h2>
      <p className="text-gray-400 text-sm text-center max-w-xs">
        Add fresh vegetables, fruits and flowers from Koyambedu market
      </p>
      <Link to="/koyambedu"
        className="mt-2 bg-green-600 text-white font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition text-sm"
        style={{ boxShadow: '0 6px 20px rgba(22,163,74,0.4)' }}>
        Browse Fresh Market
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F5F4F2' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">My Cart</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">Koyambedu Daily</p>
          </div>
          <span className="text-white/80 text-sm font-semibold">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="pb-32" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}>

        {/* Price note */}
        <div className="mx-4 mt-4 rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <FiAlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-[11px] leading-relaxed">
            Final prices may vary slightly based on daily market rates. You'll be notified before dispatch if any change occurs.
          </p>
        </div>

        {/* ── Cart items ── */}
        <div className="mx-4 mt-4 space-y-3">
          {cart.items.map((item, i) => {
            const prod = item.product;
            const img  = prod?.images?.find(im => im.isPrimary)?.url || prod?.images?.[0]?.url || IMG_PH;
            const step = Math.max(1, prod?.qtyStep || 1);
            const line = (item.unitPrice || 0) * (item.quantity || 0);

            return (
              <div key={item._id || i} className="bg-white rounded-2xl p-3 flex gap-3"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

                <Link to={`/koyambedu/product/${prod?._id}`} className="shrink-0">
                  <img src={img} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/koyambedu/product/${prod?._id}`}>
                    <p className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</p>
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">₹{item.unitPrice} / {item.unitLabel}</p>

                  {/* Delivery type badge */}
                  <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.deliveryType === 'today'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.deliveryType === 'today'
                      ? <><FiZap size={9} /> Today</>
                      : <><FiCalendar size={9} /> Tomorrow</>}
                  </span>

                  {/* Stepper */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => updateItem(
                        String(prod?._id || item.product),
                        Math.max(0, item.quantity - step),
                        item.deliveryType || 'tomorrow',
                        { silent: true }
                      )}
                      className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center active:scale-90 transition-transform">
                      <FiMinus size={12} />
                    </button>
                    <span className="text-sm font-bold text-gray-800 min-w-[40px] text-center">
                      {item.quantity} {item.unitLabel}
                    </span>
                    <button
                      onClick={() => updateItem(
                        String(prod?._id || item.product),
                        item.quantity + step,
                        item.deliveryType || 'tomorrow',
                        { silent: true }
                      )}
                      className="w-7 h-7 rounded-full bg-green-600 text-white font-bold flex items-center justify-center active:scale-90 transition-transform">
                      <FiPlus size={12} />
                    </button>
                  </div>
                </div>

                {/* Price + delete */}
                <div className="flex flex-col justify-between items-end shrink-0">
                  <p className="font-bold text-green-700 text-sm">₹{line.toFixed(0)}</p>
                  <button
                    onClick={() => updateItem(String(prod?._id || item.product), 0)}
                    disabled={loading}
                    className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition disabled:opacity-50"
                    style={{ background: '#fef2f2', border: '1px solid #fee2e2' }}>
                    <FiTrash2 size={13} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Order summary ── */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <FaLeaf size={13} className="text-green-600" /> Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({itemCount} item{itemCount > 1 ? 's' : ''})</span>
              <span className="font-semibold text-gray-800">₹{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery charge</span>
              <span className="font-semibold text-gray-800">₹{deliveryCharge}</span>
            </div>
            <p className="text-[11px] text-gray-400">
              ~{totalWeightKg.toFixed(1)} kg · ₹{deliveryCharge} for orders {totalWeightKg < 20 ? 'under 20 kg' : '20–90 kg'}
            </p>
            {totalWeightKg > 90 && (
              <div className="rounded-xl px-3 py-2 text-xs font-medium"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
                Orders above 90 kg require special handling. Please contact us.
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Service fee</span>
              <span className="font-semibold text-gray-800">₹{serviceFee}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800 pt-2.5 border-t border-gray-100">
              <span>Total</span>
              <span className="text-green-700 text-base">₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Fixed checkout bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 px-4 pt-3 z-[9990]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        {!user && (
          <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-xl text-xs font-semibold text-amber-700 mb-2"
            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <FiLogIn size={12} />
            <span>Login required to place order · cart is saved</span>
          </div>
        )}
        <button
          onClick={() => navigate('/koyambedu/checkout')}
          className="w-full text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition"
          style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)', boxShadow: '0 6px 20px rgba(22,163,74,0.4)' }}>
          Proceed to Checkout · ₹{total.toFixed(0)}
        </button>
      </div>
    </div>
  );
}
