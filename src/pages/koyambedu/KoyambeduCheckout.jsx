import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function KoyambeduCheckout() {
  const { cart, subtotal, clearCart } = useKoyambeduCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slots,     setSlots]     = useState([]);
  const [step,      setStep]      = useState(1); // 1=address 2=slot 3=payment
  const [loading,   setLoading]   = useState(false);
  const [placedOrder,setPlaced]   = useState(null);

  const [addr, setAddr] = useState({
    fullName:     user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || ''),
    phone:        user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city:         'Chennai',
    pincode:      '',
    landmark:     '',
  });
  const [selectedSlot, setSelectedSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const deliveryCharge = subtotal >= 499 ? 0 : 40;
  const serviceFee = 10;
  const total = subtotal + deliveryCharge + serviceFee;

  useEffect(() => {
    api.get('/koyambedu/slots').then(r => {
      const avail = r.data.slots?.filter(s => s.available) || [];
      setSlots(avail);
      if (avail.length > 0) setSelectedSlot(avail[0].timeLabel);
    }).catch(() => {});
  }, []);

  const handlePlaceOrder = async () => {
    if (!addr.fullName || !addr.addressLine1 || !addr.pincode || !addr.phone) {
      toast.error('Please fill all address fields'); return;
    }
    if (!selectedSlot) { toast.error('Please select a delivery slot'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/koyambedu/orders', {
        shippingAddress: addr,
        paymentMethod,
        deliverySlot: selectedSlot,
      });

      if (paymentMethod === 'cod') {
        await clearCart();
        setPlaced(data.order);
        toast.success('Order placed successfully!');
        return;
      }

      // Razorpay
      const { data: rzpData } = await api.post('/koyambedu/orders/create-razorpay', { orderId: data.order._id });

      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      const options = {
        key:        rzpKey,
        amount:     rzpData.amount * 100,
        currency:   'INR',
        name:       'Koyambedu Daily',
        description:`Order #${data.order.orderId}`,
        order_id:   rzpData.rzpOrderId,
        handler: async (response) => {
          try {
            await api.post('/koyambedu/orders/verify-payment', {
              orderId:            data.order._id,
              razorpayOrderId:    response.razorpay_order_id,
              razorpayPaymentId:  response.razorpay_payment_id,
              razorpaySignature:  response.razorpay_signature,
            });
            await clearCart();
            setPlaced(data.order);
            toast.success('Payment successful! Order confirmed.');
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: addr.fullName, contact: addr.phone, email: user?.email || '' },
        theme: { color: '#16a34a' },
      };

      if (!window.Razorpay) {
        const s = document.createElement('script');
        s.src   = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload= () => new window.Razorpay(options).open();
        document.body.appendChild(s);
      } else {
        new window.Razorpay(options).open();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ── Order placed success screen ──────────
  if (placedOrder) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">✅</span>
      </div>
      <h2 className="font-black text-2xl text-green-700 mb-2">Order Placed!</h2>
      <p className="text-gray-600 text-sm mb-1">Order ID: <strong>{placedOrder.orderId}</strong></p>
      <p className="text-gray-500 text-sm mb-6">
        We've notified the seller. You'll receive WhatsApp updates on your order status.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
        If market prices have changed, we'll send you an approval request before dispatch.
      </div>
      <button onClick={() => navigate('/koyambedu/orders')}
        className="bg-green-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-green-700 transition w-full max-w-xs">
        Track My Order
      </button>
      <button onClick={() => navigate('/koyambedu')} className="mt-3 text-green-600 text-sm font-semibold">
        Continue Shopping
      </button>
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
        <h1 className="text-white font-black text-lg">Checkout</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 bg-white border-b border-green-100">
        {[['1','Address'],['2','Slot'],['3','Payment']].map(([n, label]) => (
          <div key={n} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${Number(n) <= step ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{n}</div>
            <span className={`text-xs font-medium ${Number(n) === step ? 'text-green-700' : 'text-gray-400'}`}>{label}</span>
            {n !== '3' && <span className="text-gray-300 mx-1">›</span>}
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">

        {/* STEP 1 — ADDRESS */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-800">Delivery Address</h2>
            {[
              ['fullName',    'Full Name *',      'text'],
              ['phone',       'Phone Number *',   'tel'],
              ['addressLine1','Address Line 1 *', 'text'],
              ['addressLine2','Address Line 2',   'text'],
              ['city',        'City',             'text'],
              ['pincode',     'Pincode *',        'number'],
              ['landmark',    'Landmark',         'text'],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input
                  type={type}
                  value={addr[key]}
                  onChange={e => setAddr(a => ({ ...a, [key]: e.target.value }))}
                  disabled={key === 'city'}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
            <button onClick={() => setStep(2)}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition mt-2">
              Continue to Slot Selection
            </button>
          </div>
        )}

        {/* STEP 2 — DELIVERY SLOT */}
        {step === 2 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-4">Select Delivery Slot</h2>
            <div className="space-y-2">
              {slots.map(slot => (
                <button key={slot._id}
                  onClick={() => setSelectedSlot(slot.timeLabel)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${selectedSlot === slot.timeLabel ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-2xl">{slot.type === 'today' ? '⚡' : '📅'}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{slot.timeLabel}</p>
                    {slot.note && <p className="text-xs text-gray-500">{slot.note}</p>}
                  </div>
                  {selectedSlot === slot.timeLabel && <span className="ml-auto text-green-600 font-bold">✓</span>}
                </button>
              ))}
              {slots.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No delivery slots available right now</p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={() => setStep(3)} disabled={!selectedSlot}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — PAYMENT */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Payment Method</h2>

            {[
              { val: 'razorpay', label: 'Online Payment', sub: 'Credit/Debit card, UPI, NetBanking', icon: '💳' },
              { val: 'cod',      label: 'Cash on Delivery', sub: 'Pay when order arrives', icon: '💵' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setPaymentMethod(opt.val)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition ${paymentMethod === opt.val ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <span className="text-2xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.sub}</p>
                </div>
                {paymentMethod === opt.val && <span className="text-green-600 font-bold">✓</span>}
              </button>
            ))}

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-green-100 p-4 space-y-2 text-sm">
              <h3 className="font-bold text-gray-800 mb-2">Order Summary</h3>
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Delivery</span><span className={deliveryCharge === 0 ? 'text-green-600' : ''}>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span></div>
              <div className="flex justify-between text-gray-600"><span>Service fee</span><span>₹{serviceFee}</span></div>
              <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-green-50">
                <span>Total</span><span className="text-green-700">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-amber-700 text-[11px]">⚠️ Prices subject to daily market fluctuations. You'll be notified if price changes before dispatch.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={handlePlaceOrder} disabled={loading}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60 transition">
                {loading ? 'Placing...' : `Place Order ₹${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
