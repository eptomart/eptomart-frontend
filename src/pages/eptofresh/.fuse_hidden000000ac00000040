// ============================================
// EPTOFRESH CART
// ============================================
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiPlus, FiMinus, FiAlertTriangle } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import Navbar from '../../components/common/Navbar';

export default function EptoFreshCart() {
  const navigate = useNavigate();
  const { cart, items, cartTotal, removeFromCart, updateQuantity, clearCart, userLocation } = useEptoFreshCart();

  if (!items.length) {
    return (
      <div className="min-h-screen flex flex-col pb-20" style={{ background: '#0B1729' }}>
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
        <button onClick={() => navigate('/eptofresh')} className="absolute top-20 left-4 p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <FiArrowLeft className="text-white" />
        </button>
        <div className="text-center">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-white font-semibold text-lg">Your cart is empty</p>
          <p className="text-gray-500 text-sm mt-1">Add fresh proteins from nearby shops</p>
          <button onClick={() => navigate('/eptofresh')} className="mt-6 px-6 py-2.5 rounded-2xl font-bold text-white" style={{ background: '#f4941c' }}>
            Browse Sellers
          </button>
        </div>
        </div>
      </div>
    );
  }

  const deliveryWarning = cart?.distanceKm > 15
    ? 'Seller is very far away (>15 km). Freshness and delivery may be impacted.'
    : cart?.distanceKm > 10
    ? 'Seller is located farther away. Product freshness and delivery time may be affected.'
    : null;

  return (
    <div className="min-h-screen pb-40" style={{ background: '#0B1729' }}>
      <Navbar />
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <FiArrowLeft className="text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Your Cart</h1>
        {cart?.seller && (
          <p className="text-orange-400 text-xs font-semibold">{cart.seller.shopName}</p>
        )}
        <button onClick={clearCart} className="text-red-400 text-xs">Clear</button>
      </div>

      {/* Distance warning */}
      {deliveryWarning && (
        <div className="mx-4 mt-3 rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <FiAlertTriangle className="text-yellow-400 mt-0.5 shrink-0" size={14} />
          <p className="text-yellow-400 text-xs">{deliveryWarning}</p>
        </div>
      )}

      {/* Items */}
      <div className="px-4 mt-4 space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-14 h-14 rounded-xl bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
              {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-xl">🥩</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{item.name}</p>
              <p className="text-orange-400 text-xs mt-0.5">₹{item.price} × {item.quantity} = <span className="font-bold">₹{item.price * item.quantity}</span></p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQuantity({ productId: item.product?._id || item.product, variantId: item.variantId, quantity: item.quantity - 1, price: item.price, name: item.name, image: item.image, weight: item.weight, label: item.label, cutType: item.cutType, sellerId: cart?.seller?._id })}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(244,148,28,0.15)', color: '#f4941c' }}
              >
                {item.quantity === 1 ? <FiTrash2 size={13} /> : <FiMinus size={13} />}
              </button>
              <span className="text-white font-bold text-sm w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity({ productId: item.product?._id || item.product, variantId: item.variantId, quantity: item.quantity + 1, price: item.price, name: item.name, image: item.image, weight: item.weight, label: item.label, cutType: item.cutType, sellerId: cart?.seller?._id })}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f4941c' }}
              >
                <FiPlus size={13} className="text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Price summary */}
      <div className="mx-4 mt-6 rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-white font-semibold mb-3">Price Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-white">₹{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Delivery charge</span>
          <span className="text-gray-400 text-xs italic">Calculated at checkout</span>
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
          <span className="text-white">Total</span>
          <span className="text-orange-400">₹{cartTotal.toFixed(2)} +</span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-16 left-4 right-4 z-50">
        <button
          onClick={() => navigate('/eptofresh/checkout')}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #f4941c 0%, #e07b10 100%)', boxShadow: '0 8px 24px rgba(244,148,28,0.4)' }}
        >
          Proceed to Checkout — ₹{cartTotal.toFixed(2)} +
        </button>
      </div>
    </div>
  );
}
