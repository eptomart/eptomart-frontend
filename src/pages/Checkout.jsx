// ============================================
// CHECKOUT PAGE — Address + Payment
// Supports: COD, UPI, Razorpay
// ============================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiShield } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Pay Online', icon: '💳', desc: 'Cards, UPI, NetBanking, Wallets — powered by Razorpay' },
  { id: 'upi', label: 'UPI QR Code', icon: '📱', desc: 'Scan & pay with any UPI app' },
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
];

// Load Razorpay SDK dynamically
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

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
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [upiRef, setUpiRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [step, setStep] = useState(1);

  const handleAddressChange = (e) =>
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validateAddress = () => {
    const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!address[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    if (!/^[6-9]\d{9}$/.test(address.phone)) { toast.error('Invalid mobile number'); return false; }
    if (!/^\d{6}$/.test(address.pincode)) { toast.error('Invalid pincode'); return false; }
    return true;
  };

  // ── Razorpay flow ────────────────────────────────────────
  const handleRazorpayPayment = async (orderId) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Failed to load payment gateway. Please try again.');
      return false;
    }

    const { data } = await api.post('/payment/razorpay/create-order', { orderId });

    return new Promise((resolve) => {
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Eptomart',
        description: `Order #${data.orderNumber}`,
        image: '/icons/icon-192x192.png',
        order_id: data.razorpayOrderId,
        prefill: {
          name: address.fullName,
          contact: `+91${address.phone}`,
          email: user?.email || '',
        },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId,
            });
            if (verifyRes.data.success) {
              resolve(true);
            } else {
              toast.error('Payment verification failed');
              resolve(false);
            }
          } catch {
            toast.error('Payment verification failed');
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' });
            resolve(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        resolve(false);
      });
      rzp.open();
    });
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;
    setLoading(true);

    try {
      // Create order in our system
      const { data } = await api.post('/orders', {
        items: cartItems.map(item => ({ product: item._id, quantity: item.quantity })),
        shippingAddress: address,
        paymentMethod,
      });

      const order = data.order;

      if (paymentMethod === 'razorpay') {
        const paid = await handleRazorpayPayment(order._id);
        if (!paid) {
          setLoading(false);
          return;
        }
        clearCart();
        setOrderPlaced(order);
        setStep(3);
        toast.success('Payment successful! Order confirmed 🎉');

      } else if (paymentMethod === 'upi') {
        const payRes = await api.post('/payment/initiate', { orderId: order._id, method: 'upi' });
        clearCart();
        setOrderPlaced({ ...order, upiData: payRes.data });
        setStep(3);
        toast.success('Order placed! Complete UPI payment below.');

      } else {
        clearCart();
        setOrderPlaced(order);
        setStep(3);
        toast.success('Order placed! Pay on delivery 🎉');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!upiRef.trim()) return toast.error('Enter UPI transaction ID');
    try {
      await api.post('/payment/confirm-upi', { orderId: orderPlaced._id, upiRef: upiRef.trim() });
      toast.success('Payment reference submitted!');
      navigate('/orders');
    } catch {
      toast.error('Failed to submit UPI reference');
    }
  };

  // ── Order Success Screen ─────────────────────────────────
  if (step === 3 && orderPlaced) {
    return (
      <>
        <Helmet><title>Order Placed! — Eptomart</title></Helmet>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {paymentMethod === 'razorpay' ? 'Payment Successful! 🎉' : 'Order Placed! 🎉'}
          </h1>
          <p className="text-gray-500 mb-1">Order ID: <span className="font-mono font-bold text-primary-600">#{orderPlaced.orderId}</span></p>
          <p className="text-gray-500 mb-6">Total: <span className="font-bold">{formatINR(orderPlaced.pricing?.total)}</span></p>

          {paymentMethod === 'razorpay' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700">
              ✅ Payment confirmed via Razorpay. Your order is being processed.
            </div>
          )}

          {paymentMethod === 'upi' && orderPlaced.upiData && (
            <div className="card p-6 mb-6 text-left">
              <h3 className="font-bold mb-3">Complete UPI Payment</h3>
              <p className="text-sm text-gray-600 mb-2">UPI ID: <span className="font-mono font-bold">{orderPlaced.upiData.upiId}</span></p>
              <p className="text-sm text-gray-600 mb-4">Amount: <span className="font-bold text-primary-600">{formatINR(orderPlaced.upiData.amount)}</span></p>
              <a href={orderPlaced.upiData.upiLink} className="btn-primary w-full block text-center mb-4">📱 Open UPI App</a>
              <label className="block text-sm font-medium mb-1.5">Enter UPI Transaction ID</label>
              <input
                type="text"
                placeholder="e.g. 123456789012"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="input-field mb-3"
              />
              <button onClick={handleConfirmUpiPayment} className="btn-outline w-full">Confirm Payment</button>
            </div>
          )}

          {paymentMethod === 'cod' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-orange-700">
              💵 Pay ₹{orderPlaced.pricing?.total} when your order arrives.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary flex-1">Track Order</button>
            <button onClick={() => navigate('/')} className="btn-outline flex-1">Continue Shopping</button>
          </div>
        </div>
      </>
    );
  }

  // ── Checkout Form ────────────────────────────────────────
  return (
    <>
      <Helmet><title>Checkout — Eptomart</title></Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    {method.id === 'razorpay' && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Recommended</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
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
                  <span>Total</span><span className="text-primary-600">{formatINR(total)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || cartItems.length === 0}
                className="btn-primary w-full"
              >
                {loading ? 'Processing...' : paymentMethod === 'razorpay' ? `Pay ${formatINR(total)}` : `Place Order — ${formatINR(total)}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <FiShield size={12} className="text-gray-400" />
                <p className="text-xs text-gray-400">Secure checkout. Your data is protected.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
