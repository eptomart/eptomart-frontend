// ============================================
// CHECKOUT PAGE — Address + Razorpay Payment
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiShield } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import DeliveryEstimate from '../components/product/DeliveryEstimate';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import { extractBasePrice } from '../utils/gst';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Only Razorpay is accepted — COD and UPI are disabled
const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Pay Online (Razorpay)', icon: '💳', desc: 'Cards, UPI, NetBanking, Wallets — powered by Razorpay. Secure & instant.' },
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
  const { cartItems, enrichedItems, subtotalExGst, gstTotal, shipping, total, sellerGroups, clearCart } = useCart();
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Support "Buy Now" — items passed via navigate state instead of cart
  const buyNow = location.state?.buyNow || null;
  const checkoutItems = buyNow ? [buyNow] : cartItems;

  // Buy Now pricing — computed independently (cart totals are always from cartItems)
  const bnPrice    = buyNow?.price    || 0;
  const bnQty      = buyNow?.quantity || 1;
  const bnGstRate  = buyNow?.gstRate  || 18;
  const bnExGst    = buyNow ? extractBasePrice(bnPrice, bnGstRate) * bnQty : 0;
  const bnGst      = buyNow ? parseFloat((bnExGst * bnGstRate / 100).toFixed(2)) : 0;
  const bnShipping = buyNow ? ((bnExGst + bnGst) >= 499 ? 0 : 49) : 0;
  const bnTotal    = buyNow ? parseFloat((bnExGst + bnGst + bnShipping).toFixed(2)) : 0;

  // Use correct totals based on flow
  const displaySubtotal = buyNow ? parseFloat(bnExGst.toFixed(2)) : subtotalExGst;
  const displayGst      = buyNow ? bnGst      : gstTotal;
  const displayShipping = buyNow ? bnShipping : shipping;
  const displayTotal    = buyNow ? bnTotal    : total;

  const [address, setAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  });
  const [savedAddresses,    setSavedAddresses]    = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddrForm,   setShowNewAddrForm]   = useState(false);

  // Fix: sync address state AFTER user loads (fixes race condition)
  useEffect(() => {
    if (user?.addresses?.length) {
      const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setSavedAddresses(user.addresses);
      setSelectedAddressId(def._id?.toString());
      setAddress({
        fullName:     def.fullName     || user.name  || '',
        phone:        def.phone        || user.phone || '',
        addressLine1: def.addressLine1 || '',
        addressLine2: def.addressLine2 || '',
        city:         def.city         || '',
        state:        def.state        || '',
        pincode:      def.pincode      || '',
      });
    } else if (user) {
      // No saved addresses — prefill name/phone only, show form
      setAddress(prev => ({
        ...prev,
        fullName: prev.fullName || user.name  || '',
        phone:    prev.phone    || user.phone || '',
      }));
      setShowNewAddrForm(true);
    }
  }, [user]);

  // Select a saved address
  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr._id?.toString());
    setAddress({
      fullName:     addr.fullName     || '',
      phone:        addr.phone        || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city:         addr.city         || '',
      state:        addr.state        || '',
      pincode:      addr.pincode      || '',
    });
    setShowNewAddrForm(false);
  };
  const [paymentMethod] = useState('razorpay'); // fixed — only Razorpay
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
      // Reliable address save — always save new addresses, skip duplicates
      const isDuplicate = savedAddresses.some(
        a => a.addressLine1?.trim().toLowerCase() === address.addressLine1?.trim().toLowerCase()
          && a.pincode === address.pincode
      );
      if (!isDuplicate && !selectedAddressId) {
        try {
          const res = await api.post('/auth/add-address', {
            ...address,
            label: 'Home',
            isDefault: savedAddresses.length === 0,
          });
          if (res.data.success) {
            setSavedAddresses(res.data.addresses);
            await loadUser(); // refresh user context
          }
        } catch (addrErr) {
          toast.error('Address could not be saved, but your order will proceed.');
        }
      }

      // Create order in our system
      const { data } = await api.post('/orders', {
        items: checkoutItems.map(item => ({ product: item._id || item.product, quantity: item.quantity })),
        shippingAddress: address,
        paymentMethod,
      });

      const order = data.order;

      // Only Razorpay accepted
      const paid = await handleRazorpayPayment(order._id);
      if (!paid) {
        setLoading(false);
        return;
      }
      clearCart();
      setOrderPlaced(order);
      setStep(3);
      toast.success('Payment successful! Order confirmed 🎉');
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful! 🎉</h1>
          <p className="text-gray-500 mb-1">Order ID: <span className="font-mono font-bold text-primary-600">#{orderPlaced.orderId}</span></p>
          <p className="text-gray-500 mb-6">Total: <span className="font-bold">{formatINR(orderPlaced.pricing?.total)}</span></p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700">
            ✅ Payment confirmed via Razorpay. Your order is being processed. You will receive an invoice shortly.
          </div>

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

              {/* Saved addresses — show selection cards */}
              {savedAddresses.length > 0 && !showNewAddrForm && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map(addr => (
                    <label
                      key={addr._id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${selectedAddressId === addr._id?.toString()
                          ? 'border-primary-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === addr._id?.toString()}
                        onChange={() => handleSelectAddress(addr)}
                        className="mt-1 accent-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">
                          {addr.fullName} · <span className="font-normal">{addr.phone}</span>
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                        {addr.isDefault && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Default</span>
                        )}
                      </div>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowNewAddrForm(true); setSelectedAddressId(null); }}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-3 text-sm text-gray-500 hover:text-primary-600 transition-all text-center"
                  >
                    + Add New Address
                  </button>
                </div>
              )}

              {/* New address form */}
              {(showNewAddrForm || savedAddresses.length === 0) && (
                <>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowNewAddrForm(false); setSelectedAddressId(savedAddresses.find(a => a.isDefault)?._id?.toString() || savedAddresses[0]?._id?.toString()); }}
                      className="text-sm text-primary-600 hover:underline mb-3 block"
                    >
                      ← Use saved address
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mb-4">Fields marked <span className="text-red-500 font-bold">*</span> are required</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'fullName',     label: 'Full Name',               placeholder: 'John Doe',                  required: true,  col: 1 },
                      { name: 'phone',        label: 'Mobile Number',            placeholder: '98765 43210',               required: true,  col: 1 },
                      { name: 'addressLine1', label: 'Address Line 1',           placeholder: 'House No, Street Name',     required: true,  col: 2 },
                      { name: 'addressLine2', label: 'Address Line 2',           placeholder: 'Landmark, Area (optional)', required: false, col: 2 },
                      { name: 'city',         label: 'City',                     placeholder: 'Mumbai',                    required: true },
                      { name: 'state',        label: 'State',                    placeholder: 'Maharashtra',               required: true },
                      { name: 'pincode',      label: 'Pincode',                  placeholder: '400001',                    required: true },
                    ].map(field => {
                      const isEmpty = field.required && !address[field.name]?.trim();
                      return (
                        <div key={field.name} className={field.col === 2 ? 'sm:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <input
                            type="text"
                            name={field.name}
                            placeholder={field.placeholder}
                            value={address[field.name]}
                            onChange={handleAddressChange}
                            className={`input-field transition-all ${isEmpty && address[field.name] !== undefined ? 'border-red-400 bg-red-50 focus:ring-red-300' : ''}`}
                          />
                          {isEmpty && address[field.name] !== undefined && (
                            <p className="text-xs text-red-500 mt-1">This field is required</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Payment Method — Razorpay only */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">💳 Payment Method</h2>
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary-500 bg-orange-50">
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Pay Online (Razorpay)</p>
                  <p className="text-xs text-gray-500">Cards, UPI, NetBanking, Wallets — secure & instant</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Secure</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                🔒 All payments are processed securely via Razorpay
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {checkoutItems.map(item => (
                  <div key={item._id || item.product} className="flex gap-3 text-sm">
                    <img src={item.image || item.images?.[0]?.url} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-gray-500">Qty: {item.quantity} × {formatINR(item.price)}</p>
                    </div>
                    <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Delivery estimates per seller */}
              {Object.entries(sellerGroups || {}).map(([key, group]) => (
                group.seller && (
                  <div key={key} className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      🏪 {group.seller.businessName || 'Seller'}
                    </p>
                    <DeliveryEstimate
                      sellerId={group.seller._id}
                    />
                  </div>
                )
              ))}

              <div className="border-t pt-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (excl. GST)</span>
                  <span>{formatINR(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>{formatINR(displayGst)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={displayShipping === 0 ? 'text-green-500' : ''}>{displayShipping === 0 ? 'FREE' : formatINR(displayShipping)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatINR(displayTotal)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || checkoutItems.length === 0}
                className="btn-primary w-full"
              >
                {loading ? 'Processing...' : paymentMethod === 'razorpay' ? `Pay ${formatINR(displayTotal)}` : `Place Order — ${formatINR(displayTotal)}`}
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
