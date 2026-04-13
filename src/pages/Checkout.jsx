// ============================================
// CHECKOUT PAGE — Address + Payment
// ============================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
  { id: 'upi', label: 'UPI Payment', icon: '📱', desc: 'PhonePe, GPay, Paytm & more' },
];

export default function Checkout() {
  const { cartItems, subtotal, shipping, tax, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [upiRef, setUpiRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Confirm

  const handleAddressChange = (e) => {
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateAddress = () => {
    const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!address[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    if (!/^[6-9]\d{9}$/.test(address.phone)) {
      toast.error('Invalid mobile number');
      return false;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      toast.error('Invalid pincode');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;
    setLoading(true);

    try {
      const { data } = await api.post('/orders', {
        items: cartItems.map(item => ({ product: item._id, quantity: item.quantity })),
        shippingAddress: address,
        paymentMethod,
      });

      if (paymentMethod === 'upi') {
        // Initiate UPI payment
        const payRes = await api.post('/payment/initiate', {
          orderId: data.order._id,
          method: 'upi',
        });
        setOrderPlaced({ ...data.order, upiData: payRes.data });
      } else {
        setOrderPlaced(data.order);
      }

      clearCart();
      setStep(3);
      toast.success('Order placed successfully! 🎉');
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!upiRef.trim()) return toast.error('Enter UPI transaction ID');
    try {
      await api.post('/payment/confirm-upi', {
        orderId: orderPlaced._id,
        upiRef: upiRef.trim(),
      });
      toast.success('Payment reference submitted!');
      navigate('/orders');
    } catch (err) {
      toast.error('Failed to submit UPI reference');
    }
  };

  // Order Success Screen
  if (step === 3 && orderPlaced) {
    return (
      <>
        <Helmet><title>Order Placed! — Eptomart</title></Helmet>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Placed! 🎉</h1>
          <p className="text-gray-500 mb-1">Order ID: <span className="font-mono font-bold text-primary-600">#{orderPlaced.orderId}</span></p>
          <p className="text-gray-500 mb-6">Total: <span className="font-bold">{formatINR(orderPlaced.pricing?.total)}</span></p>

          {paymentMethod === 'upi' && orderPlaced.upiData && (
            <div className="card p-6 mb-6 text-left">
              <h3 className="font-bold mb-3">Complete UPI Payment</h3>
              <p className="text-sm text-gray-600 mb-2">UPI ID: <span className="font-mono font-bold">{orderPlaced.upiData.upiId}</span></p>
              <p className="text-sm text-gray-600 mb-4">Amount: <span className="font-bold text-primary-600">{formatINR(orderPlaced.upiData.amount)}</span></p>
              <a href={orderPlaced.upiData.upiLink} className="btn-primary w-full block text-center mb-4">
                📱 Open UPI App
              </a>
              <div>
                <label className="block text-sm font-medium mb-1.5">Enter UPI Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="input-field mb-3"
                />
                <button onClick={handleConfirmUpiPayment} className="btn-outline w-full">
                  Confirm Payment
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary flex-1">
              Track Order
            </button>
            <button onClick={() => navigate('/')} className="btn-outline flex-1">
              Continue Shopping
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Checkout — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Address + Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">📍 Delivery Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'fullName', label: 'Full Name', placeholder: 'John Doe', col: 1 },
                  { name: 'phone', label: 'Mobile Number', placeholder: '98765 43210', col: 1 },
                  { name: 'addressLine1', label: 'Address Line 1', placeholder: 'House No, Street Name', col: 2 },
                  { name: 'addressLine2', label: 'Address Line 2 (Optional)', placeholder: 'Landmark, Area', col: 2 },
                  { name: 'city', label: 'City', placeholder: 'Mumbai' },
                  { name: 'state', label: 'State', placeholder: 'Maharashtra' },
                  { name: 'pincode', label: 'Pincode', placeholder: '400001' },
                ].map(field => (
                  <div key={field.name} className={field.col === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.placeholder}
                      value={address[field.name]}
                      onChange={handleAddressChange}
                      className="input-field"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">💳 Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(method => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${paymentMethod === method.id ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="accent-primary-500"
                    />
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cartItems.map(item => (
                  <div key={item._id} className="flex gap-3 text-sm">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-gray-500">Qty: {item.quantity} × {formatINR(item.price)}</p>
                    </div>
                    <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={shipping === 0 ? 'text-green-500' : ''}>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">GST (5%)</span><span>{formatINR(tax)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary-600">{formatINR(total)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || cartItems.length === 0}
                className="btn-primary w-full"
              >
                {loading ? 'Placing Order...' : `Place Order — ${formatINR(total)}`}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                🔒 Secure checkout. Your data is protected.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
