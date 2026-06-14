// ============================================
// EPTOFRESH CART — Clean White Theme
// ============================================
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiAlertTriangle, FiLogIn, FiShoppingBag } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
const isLoggedIn = () => !!localStorage.getItem('eptomart_token');

export default function EptoFreshCart() {
  const navigate = useNavigate();
  const { cart, items, cartTotal, updateQuantity, clearCart } = useEptoFreshCart();

  /* ── Empty state ── */
  if (!items.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-2"
          style={{ background: '#fff4e6', border: '1.5px solid rgba(244,148,28,0.15)' }}>
          <FiShoppingBag size={40} style={{ color: '#f4941c', opacity: 0.5 }} />
        </div>
        <p className="text-gray-900 font-bold text-xl">Your cart is empty</p>
        <p className="text-gray-400 text-sm">Add fresh proteins from nearby shops</p>
        <button
          onClick={() => navigate('/eptofresh')}
          className="mt-2 px-8 py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{ background: '#f4941c', boxShadow: '0 6px 20px rgba(244,148,28,0.4)' }}>
          Browse Sellers
        </button>
      </div>
    );
  }

  const deliveryWarning = cart?.distanceKm > 15
    ? 'Seller is very far away. Freshness and delivery may be impacted.'
    : cart?.distanceKm > 10
    ? 'Seller is farther away. Delivery time may be affected.'
    : null;

  const handleCheckout = () => {
    if (!isLoggedIn()) {
      sessionStorage.setItem('epf_post_login_redirect', '/eptofresh/checkout');
      navigate('/login');
    } else {
      navigate('/eptofresh/checkout');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}>

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-gray-100">
          <FiArrowLeft size={17} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-gray-900 font-bold text-base">Cart</h1>
          {cart?.seller?.shopName && (
            <p className="text-orange-500 text-xs font-semibold leading-none mt-0.5">{cart.seller.shopName}</p>
          )}
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-xl bg-red-50">
          Clear
        </button>
      </div>

      {/* Distance warning */}
      {deliveryWarning && (
        <div className="mx-4 mt-3 rounded-xl p-3 flex items-start gap-2 bg-amber-50"
          style={{ border: '1px solid #fde68a' }}>
          <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={14} />
          <p className="text-amber-700 text-xs font-medium">{deliveryWarning}</p>
        </div>
      )}

      {/* Items */}
      <div className="px-4 mt-3 space-y-2.5">
        {items.map((item, idx) => {
          const pid = item.product?._id || item.product || item.productId;
          return (
            <div key={idx} className="flex items-center gap-3 rounded-2xl p-3 bg-white"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>

              {item.image
                ? <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 bg-gray-100" />
                : <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ background: '#fff4e6' }}>
                    <FiShoppingBag size={20} style={{ color: '#f4941c', opacity: 0.6 }} />
                  </div>}

              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-bold truncate">{item.name}</p>
                <p className="text-orange-500 text-xs font-bold mt-0.5">₹{item.price * item.quantity}</p>
                <p className="text-gray-400 text-[10px]">₹{item.price} × {item.quantity}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateQuantity({ productId: pid, variantId: item.variantId, quantity: item.quantity - 1, price: item.price, name: item.name, image: item.image, weight: item.weight, label: item.label, cutType: item.cutType, sellerId: cart?.seller?._id })}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#fff4e6', border: '1.5px solid #f4941c' }}>
                  {item.quantity === 1 ? <FiTrash2 size={12} style={{ color: '#f4941c' }} /> : <FiMinus size={12} style={{ color: '#f4941c' }} />}
                </button>
                <span className="text-gray-900 font-black text-sm w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity({ productId: pid, variantId: item.variantId, quantity: item.quantity + 1, price: item.price, name: item.name, image: item.image, weight: item.weight, label: item.label, cutType: item.cutType, sellerId: cart?.seller?._id })}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: '#f4941c', boxShadow: '0 3px 8px rgba(244,148,28,0.4)' }}>
                  <FiPlus size={12} className="text-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price summary */}
      <div className="mx-4 mt-4 rounded-2xl p-4 bg-white"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-900 font-semibold">₹{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Delivery</span>
          <span className="text-gray-400 text-xs italic">Calculated at checkout</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between">
          <span className="text-gray-900 font-bold">Total</span>
          <span className="text-orange-500 font-black text-base">₹{cartTotal.toFixed(2)} +</span>
        </div>
      </div>

      {/* Guest nudge + checkout — inline, not fixed */}
      <div className="px-4 mt-4 mb-8 space-y-2">
        {!isLoggedIn() && (
          <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50"
            style={{ border: '1px solid #fde68a' }}>
            <FiLogIn size={13} />
            <span>Login required to place order · your cart is saved</span>
          </div>
        )}
        <button
          onClick={handleCheckout}
          className="w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{ background: 'linear-gradient(135deg,#f97316,#f4941c)', boxShadow: '0 8px 28px rgba(244,148,28,0.45)' }}>
          {isLoggedIn() ? `Proceed to Checkout  ₹${cartTotal.toFixed(0)} →` : `Login to Checkout  ₹${cartTotal.toFixed(0)} →`}
        </button>
      </div>
    </div>
  );
}
