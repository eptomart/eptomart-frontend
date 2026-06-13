// ============================================
// EPTOFRESH CART — White Premium Theme
// ============================================
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiAlertTriangle, FiLogIn, FiShoppingBag } from 'react-icons/fi';
import { FaDrumstickBite } from 'react-icons/fa';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import Navbar from '../../components/common/Navbar';

const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

export default function EptoFreshCart() {
  const navigate = useNavigate();
  const { cart, items, cartTotal, updateQuantity, clearCart } = useEptoFreshCart();

  /* ── Empty state ── */
  if (!items.length) {
    return (
      <div className="min-h-screen flex flex-col pb-20" style={{ background: '#F5F4F2' }}>
        <Navbar />
        <button
          onClick={() => navigate('/eptofresh')}
          className="absolute top-20 left-4 p-2 rounded-full bg-white"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <FiArrowLeft className="text-gray-600" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg,#fff4e6,#ffe8c8)' }}>
            <FiShoppingBag size={32} style={{ color: '#f4941c' }} />
          </div>
          <p className="text-gray-900 font-bold text-lg">Your cart is empty</p>
          <p className="text-gray-400 text-sm mt-1">Add fresh proteins from nearby shops</p>
          <button
            onClick={() => navigate('/eptofresh')}
            className="mt-6 px-6 py-3 rounded-2xl font-bold text-white"
            style={{ background: '#f4941c', boxShadow: '0 6px 20px rgba(244,148,28,0.4)' }}>
            Browse Sellers
          </button>
        </div>
      </div>
    );
  }

  const deliveryWarning = cart?.distanceKm > 15
    ? 'Seller is very far away (>15 km). Freshness and delivery may be impacted.'
    : cart?.distanceKm > 10
    ? 'Seller is farther away. Delivery time and freshness may be affected.'
    : null;

  return (
    <div className="min-h-screen pb-40" style={{ background: '#F5F4F2' }}>
      <Navbar />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 bg-white"
        style={{ borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full"
          style={{ background: '#F5F4F2' }}>
          <FiArrowLeft className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-gray-900 font-bold text-base">Your Cart</h1>
          {cart?.seller?.shopName && (
            <p className="text-orange-500 text-xs font-semibold">{cart.seller.shopName}</p>
          )}
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-xl"
          style={{ background: '#fef2f2' }}>
          Clear all
        </button>
      </div>

      {/* Distance warning */}
      {deliveryWarning && (
        <div className="mx-4 mt-3 rounded-xl p-3 flex items-start gap-2"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={14} />
          <p className="text-amber-700 text-xs font-medium">{deliveryWarning}</p>
        </div>
      )}

      {/* Items */}
      <div className="px-4 mt-4 space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-2xl p-3 bg-white"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

            <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#fff4e6,#ffe8c8)' }}>
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <FaDrumstickBite size={20} style={{ color: '#f4941c' }} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-bold truncate">{item.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                ₹{item.price} × {item.quantity} =&nbsp;
                <span className="font-bold text-orange-500">₹{item.price * item.quantity}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQuantity({
                  productId: item.product?._id || item.product || item.productId,
                  variantId: item.variantId, quantity: item.quantity - 1,
                  price: item.price, name: item.name, image: item.image,
                  weight: item.weight, label: item.label, cutType: item.cutType,
                  sellerId: cart?.seller?._id,
                })}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: '#fff4e6', color: '#f4941c', border: '1.5px solid #f4941c22' }}>
                {item.quantity === 1 ? <FiTrash2 size={12} /> : <FiMinus size={12} />}
              </button>
              <span className="text-gray-900 font-bold text-sm w-5 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity({
                  productId: item.product?._id || item.product || item.productId,
                  variantId: item.variantId, quantity: item.quantity + 1,
                  price: item.price, name: item.name, image: item.image,
                  weight: item.weight, label: item.label, cutType: item.cutType,
                  sellerId: cart?.seller?._id,
                })}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: '#f4941c', boxShadow: '0 3px 10px rgba(244,148,28,0.4)' }}>
                <FiPlus size={12} className="text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Price summary */}
      <div className="mx-4 mt-4 rounded-2xl p-4 bg-white"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
        <h3 className="text-gray-900 font-bold text-sm mb-3">Price Summary</h3>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
          <span className="text-gray-900 font-semibold">₹{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Delivery charge</span>
          <span className="text-gray-400 text-xs italic">Calculated at checkout</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
          <span className="text-gray-900">Total</span>
          <span className="text-orange-500 text-base">₹{cartTotal.toFixed(2)} +</span>
        </div>
      </div>

      {/* Checkout */}
      <div className="fixed bottom-16 left-4 right-4 z-50 space-y-2">
        {!isLoggedIn() && (
          <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50"
            style={{ border: '1px solid #fde68a' }}>
            <FiLogIn size={13} />
            <span>Login required to place order — your cart is saved</span>
          </div>
        )}
        <button
          onClick={() => {
            if (!isLoggedIn()) {
              sessionStorage.setItem('epf_post_login_redirect', '/eptofresh/checkout');
              navigate('/login');
            } else {
              navigate('/eptofresh/checkout');
            }
          }}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#f97316,#f4941c)', boxShadow: '0 8px 28px rgba(244,148,28,0.45)' }}>
          {isLoggedIn()
            ? `Proceed to Checkout — ₹${cartTotal.toFixed(2)} +`
            : `Login to Checkout — ₹${cartTotal.toFixed(2)} +`}
        </button>
      </div>
    </div>
  );
}
