// ============================================
// EPTOFRESH CHECKOUT
// Address → Delivery Info → Payment
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiMapPin, FiAlertTriangle, FiCheck, FiTag } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import SavedAddressPicker from '../../components/common/SavedAddressPicker';

const STEPS = ['Address', 'Delivery', 'Payment'];

export default function EptoFreshCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, items, cartTotal, clearCart, userLocation } = useEptoFreshCart();

  const [step, setStep]                 = useState(0);
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState(null);
  const [address, setAddress]           = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '', landmark: '' });
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [distanceWarning, setDistanceWarning]   = useState(null);
  const [confirmedFar, setConfirmedFar] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked, setConsentChecked]     = useState(false);
  const [couponCode, setCouponCode]     = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [useWallet, setUseWallet]       = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [placing, setPlacing]           = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/eptofresh/wallet').then(r => setWalletBalance(r.data.wallet?.balance || 0)).catch(() => {});
    }
  }, [user]);

  // Auto-select default saved address on first load
  useEffect(() => {
    const saved = user?.addresses || [];
    if (!saved.length) return;
    const def = saved.find(a => a.isDefault) || saved[0];
    setSelectedSavedAddrId(String(def._id));
    setAddress({
      fullName:     def.fullName     || user?.name  || '',
      phone:        def.phone        || user?.phone || '',
      addressLine1: def.addressLine1 || '',
      addressLine2: def.addressLine2 || '',
      city:         def.city         || 'Chennai',
      state:        def.state        || 'Tamil Nadu',
      pincode:      def.pincode      || '',
      landmark:     '',
    });
  }, [user]);

  const loadRazorpay = () => {
    return new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const checkDelivery = async () => {
    if (!address.pincode || !cart?.seller?._id) return;
    setCheckingDelivery(true);
    try {
      const { data } = await api.post('/eptofresh/delivery-check', {
        sellerId: cart.seller._id || cart.seller,
        buyerLat: userLocation?.lat,
        buyerLng: userLocation?.lng,
        orderAmount: cartTotal - couponDiscount,
      });
      if (data.success) {
        setDeliveryInfo(data);
        if (data.warning) setDistanceWarning(data.warning);
        if (data.requiresConsent) {
          setConfirmedFar(false);
          setConsentChecked(false);
          setShowConsentModal(true); // Show mandatory popup before proceeding
        } else {
          setStep(1);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check delivery');
    } finally {
      setCheckingDelivery(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post('/coupon/validate', {
        code: couponCode.trim(),
        orderAmount: cartTotal,
        platform: 'eptofresh',
        sellerId: cart?.seller?._id || cart?.seller || undefined,
      });
      if (data.success) {
        setCouponDiscount(data.discount);
        toast.success(`Promo applied! ₹${data.discount} off`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid promo code');
      setCouponDiscount(0);
    }
  };

  const getTotal = () => {
    const sub  = cartTotal - couponDiscount;
    const dc   = deliveryInfo?.charge || 0;
    const wa   = useWallet ? Math.min(walletBalance, sub + dc) : 0;
    return Math.max(0, sub + dc - wa);
  };

  const placeOrder = async () => {
    if (deliveryInfo?.requiresConsent && !confirmedFar) {
      return toast.error('Please accept the long distance delivery conditions');
    }
    setPlacing(true);
    try {
      const { data } = await api.post('/eptofresh/orders', {
        sellerId:        cart.seller._id || cart.seller,
        shippingAddress: address,
        paymentMethod,
        buyerLat:        userLocation?.lat,
        buyerLng:        userLocation?.lng,
        couponCode:      couponCode || undefined,
        useWallet,
      });

      if (!data.success) throw new Error(data.message);

      if (paymentMethod === 'cod') {
        toast.success('Order placed!');
        clearCart();
        navigate(`/eptofresh/orders/${data.orderId}`);
        return;
      }

      // Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load');

      let handlerCalled = false;
      const rzp = new window.Razorpay({
        key:         data.keyId,
        amount:      data.amount,
        currency:    'INR',
        order_id:    data.razorpayOrderId,
        name:        'EptoFresh Proteins',
        description: `Order #${data.orderNumber}`,
        prefill:     { name: user?.name, email: user?.email, contact: address.phone },
        theme:       { color: '#f4941c' },
        handler: async (response) => {
          handlerCalled = true;
          try {
            const verRes = await api.post('/eptofresh/orders/verify-payment', {
              ...response, orderId: data.orderId,
            });
            if (verRes.data.success) {
              toast.success('Payment successful! Order placed.');
              clearCart();
              navigate(`/eptofresh/orders/${data.orderId}`);
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            if (!handlerCalled) {
              api.put(`/eptofresh/orders/${data.orderId}/cancel`, { reason: 'Payment not completed' }).catch(() => {});
              toast.error('Payment cancelled');
              setPlacing(false);
            }
          },
        },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to place order');
      setPlacing(false);
    }
  };

  const INDIAN_MOBILE = /^[6-9]\d{9}$/;

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F5F4F2', paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── Mandatory Long Distance Consent Modal ── */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10" style={{ background: '#0f2035', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-gray-900 font-bold text-base">LONG DISTANCE DELIVERY NOTICE</h2>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              This seller is located more than 10 KM away from your delivery location.
              Additional delivery charges have been applied based on distance.
            </p>
            <p className="text-gray-400 text-xs mb-1 font-semibold">Due to the extended travel distance:</p>
            <ul className="text-gray-400 text-xs space-y-1 mb-4 list-disc list-inside">
              <li>Delivery time may be longer than usual.</li>
              <li>Product freshness may be affected depending on weather and travel conditions.</li>
              <li>Long-distance delivery charges are <span className="text-red-400 font-semibold">non-refundable</span> once the order is accepted and dispatched.</li>
            </ul>
            <div className="rounded-xl p-3 mb-4 flex justify-between items-center" style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.2)' }}>
              <span className="text-gray-400 text-sm">Distance</span>
              <span className="text-gray-900 font-semibold">{deliveryInfo?.distanceKm} km</span>
            </div>
            <div className="rounded-xl p-3 mb-5 flex justify-between items-center" style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.2)' }}>
              <span className="text-gray-400 text-sm">Delivery Charge</span>
              <span className="text-orange-400 font-bold">₹{deliveryInfo?.charge}</span>
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="w-5 h-5 accent-orange-400 mt-0.5 shrink-0"
              />
              <span className="text-gray-900 text-sm">
                I understand and accept the additional delivery charges and delivery conditions.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConsentModal(false); setDeliveryInfo(null); }}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: 'rgba(0,0,0,0.05)', color: '#fff' }}
              >
                Go Back
              </button>
              <button
                disabled={!consentChecked}
                onClick={() => { setConfirmedFar(true); setShowConsentModal(false); setStep(1); }}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-900 text-sm disabled:opacity-40"
                style={{ background: '#f4941c' }}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <FiArrowLeft className="text-gray-900" />
        </button>
        <h1 className="text-gray-900 font-bold text-lg">Checkout</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 px-4 py-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
              style={{ background: i <= step ? '#f4941c' : 'rgba(255,255,255,0.1)', color: i <= step ? '#fff' : 'rgba(255,255,255,0.3)' }}>
              {i < step ? <FiCheck size={12} /> : i + 1}
            </div>
            <span className="text-xs" style={{ color: i <= step ? '#f4941c' : 'rgba(255,255,255,0.3)' }}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: i < step ? '#f4941c' : 'rgba(255,255,255,0.1)' }} />}
          </div>
        ))}
      </div>

      <div className="px-4">
        {/* Step 0 — Address */}
        {step === 0 && (
          <div className="space-y-3">
            <SavedAddressPicker
              addresses={user?.addresses || []}
              selectedId={selectedSavedAddrId}
              onSelect={a => {
                setSelectedSavedAddrId(String(a._id));
                setAddress({
                  fullName:     a.fullName     || '',
                  phone:        a.phone        || '',
                  addressLine1: a.addressLine1 || '',
                  addressLine2: a.addressLine2 || '',
                  city:         a.city         || 'Chennai',
                  state:        a.state        || 'Tamil Nadu',
                  pincode:      a.pincode      || '',
                  landmark:     '',
                });
              }}
              onNewAddress={() => {
                setSelectedSavedAddrId(null);
                setAddress({ fullName: user?.name || '', phone: user?.phone || '', addressLine1: '', addressLine2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '', landmark: '' });
              }}
            />
            <h2 className="text-gray-900 font-semibold">
              {selectedSavedAddrId ? 'Confirm Address' : 'Delivery Address'}
            </h2>
            {[
              { key: 'fullName', label: 'Full Name', type: 'text' },
              { key: 'phone', label: 'Mobile Number', type: 'tel' },
              { key: 'addressLine1', label: 'House / Flat No., Street', type: 'text' },
              { key: 'addressLine2', label: 'Area / Colony (optional)', type: 'text' },
              { key: 'city', label: 'City', type: 'text' },
              { key: 'pincode', label: 'Pincode', type: 'text' },
              { key: 'landmark', label: 'Landmark (optional)', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                <input
                  type={f.type}
                  value={address[f.key]}
                  onChange={e => setAddress(a => ({ ...a, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-900 outline-none"
                  style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }}
                />
                {f.key === 'phone' && address.phone && !INDIAN_MOBILE.test(address.phone) && (
                  <p className="text-red-400 text-xs mt-1">Enter valid 10-digit Indian mobile number</p>
                )}
              </div>
            ))}

            <button
              onClick={checkDelivery}
              disabled={checkingDelivery || !address.fullName || !INDIAN_MOBILE.test(address.phone) || !address.addressLine1 || !address.pincode}
              className="w-full py-3 rounded-2xl font-bold text-gray-900 mt-4 disabled:opacity-50"
              style={{ background: '#f4941c' }}
            >
              {checkingDelivery ? 'Checking...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 1 — Delivery Info */}
        {step === 1 && deliveryInfo && (
          <div className="space-y-4">
            <h2 className="text-gray-900 font-semibold">Delivery Details</h2>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><FiMapPin size={12} /> Distance</span>
                <span className="text-gray-900">{deliveryInfo.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery Charge</span>
                <span className={deliveryInfo.isFreeDelivery ? 'text-green-400 font-semibold' : 'text-gray-900'}>
                  {deliveryInfo.isFreeDelivery ? 'FREE' : `₹${deliveryInfo.charge}`}
                </span>
              </div>
            </div>

            {distanceWarning && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: deliveryInfo.requiresConsent ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.08)', border: `1px solid ${deliveryInfo.requiresConsent ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                <FiAlertTriangle className={deliveryInfo.requiresConsent ? 'text-red-400' : 'text-yellow-400'} size={14} />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-0.5" style={{ color: deliveryInfo.requiresConsent ? '#f87171' : '#fbbf24' }}>
                    {deliveryInfo.requiresConsent ? 'Long Distance Delivery' : 'Distance Notice'}
                  </p>
                  <p className="text-xs text-gray-400">{distanceWarning}</p>
                  {deliveryInfo.requiresConsent && confirmedFar && (
                    <p className="text-green-400 text-xs mt-1 font-semibold">✓ Conditions accepted</p>
                  )}
                </div>
              </div>
            )}

            {/* Wallet */}
            {walletBalance > 0 && (
              <label className="flex items-center justify-between cursor-pointer rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <p className="text-gray-900 text-sm font-semibold">Use Wallet Balance</p>
                  <p className="text-gray-400 text-xs">Available: ₹{walletBalance.toFixed(2)}</p>
                </div>
                <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} className="w-5 h-5 accent-orange-400" />
              </label>
            )}

            <button onClick={() => setStep(2)} className="w-full py-3 rounded-2xl font-bold text-gray-900" style={{ background: '#f4941c' }}>
              Continue to Payment
            </button>
          </div>
        )}

        {/* Step 2 — Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-gray-900 font-semibold">Payment</h2>

            {/* Coupon input */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1"><FiTag size={11} /> Promo Code</label>
              {couponDiscount > 0 ? (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <span className="text-green-400 text-sm font-bold">🎉 {couponCode} — ₹{couponDiscount} off</span>
                  <button onClick={() => { setCouponCode(''); setCouponDiscount(0); }} className="text-xs text-red-400 font-semibold">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponDiscount(0); }}
                    placeholder="Enter promo code"
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-900 outline-none"
                    style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }}
                  />
                  <button onClick={validateCoupon} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-900" style={{ background: '#f4941c' }}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-gray-900">₹{cartTotal.toFixed(2)}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Promo</span><span className="text-green-400">-₹{couponDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-gray-400">Delivery</span><span className={deliveryInfo?.isFreeDelivery ? 'text-green-400' : 'text-gray-900'}>{deliveryInfo?.isFreeDelivery ? 'FREE' : `₹${deliveryInfo?.charge || 0}`}</span></div>
              {useWallet && <div className="flex justify-between text-sm"><span className="text-gray-400">Wallet</span><span className="text-green-400">-₹{Math.min(walletBalance, cartTotal - couponDiscount + (deliveryInfo?.charge || 0)).toFixed(2)}</span></div>}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-lg">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-400">₹{getTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Payment Method</p>
              <div className="space-y-2">
                {[
                  { key: 'razorpay', label: '💳 Card / UPI / Net Banking', desc: 'Pay securely online' },
                  { key: 'cod', label: '💵 Cash on Delivery', desc: 'Pay when delivered' },
                ].map(m => (
                  <label key={m.key} className="flex items-center gap-3 rounded-xl p-3 cursor-pointer" style={{ background: paymentMethod === m.key ? 'rgba(244,148,28,0.12)' : 'rgba(0,0,0,0.02)', border: `1px solid ${paymentMethod === m.key ? 'rgba(244,148,28,0.3)' : 'rgba(0,0,0,0.05)'}` }}>
                    <input type="radio" name="payment" value={m.key} checked={paymentMethod === m.key} onChange={() => setPaymentMethod(m.key)} className="accent-orange-400" />
                    <div>
                      <p className="text-gray-900 text-sm font-semibold">{m.label}</p>
                      <p className="text-gray-400 text-xs">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing}
              className="w-full py-4 rounded-2xl font-bold text-gray-900 text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f4941c 0%, #e07b10 100%)', boxShadow: '0 8px 24px rgba(244,148,28,0.35)' }}
            >
              {placing ? 'Placing Order...' : `Place Order — ₹${getTotal().toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
