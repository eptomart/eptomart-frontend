// ============================================
// EPTOMART EXPRESS — Checkout
// Simple address form + Razorpay payment. Mirrors the create→verify
// Razorpay pattern used by every other vertical's checkout
// (FruitBasketCheckout.jsx / KoyambeduCheckout.jsx are the reference
// implementations this was modeled on — neither is touched here).
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function ExpressCheckout() {
  const navigate = useNavigate();
  const { selectedStore, cart, fetchCart } = useExpressCart();
  const [address, setAddress] = useState({ name: '', phone: '', addressLine: '', city: '', pincode: '' });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => { fetchCart(); }, []);

  useEffect(() => {
    if (!selectedStore?._id) navigate('/express/location');
    else if (!cart.itemCount) navigate('/express/shop');
  }, [selectedStore, cart.itemCount]);

  const getQuote = async () => {
    if (!address.addressLine || !address.phone || !address.name) return toast.error('Please fill in name, phone and address');
    setQuoting(true);
    try {
      const { data } = await api.post('/express/quote', {
        deliveryAddress: { ...address, lat: selectedStore?.location?.lat, lng: selectedStore?.location?.lng },
      });
      setQuote(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to price your order');
    } finally {
      setQuoting(false);
    }
  };

  const placeOrder = async () => {
    if (!quote) return toast.error('Please get a quote first');
    setPlacing(true);
    try {
      const { data } = await api.post('/express/orders/create-razorpay', {
        deliveryAddress: { ...address, lat: selectedStore?.location?.lat, lng: selectedStore?.location?.lng },
      });

      if (data.demoMode) {
        await api.post('/express/orders/verify-payment', {
          orderId: data.orderId, razorpayOrderId: data.rzpOrderId,
          razorpayPaymentId: `demo_pay_${Date.now()}`, razorpaySignature: 'demo',
        });
        toast.success('Order placed!');
        navigate('/express/my-orders');
        return;
      }

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        order_id: data.rzpOrderId,
        name: 'Eptomart Express',
        description: 'Same-day delivery order',
        handler: async (resp) => {
          try {
            await api.post('/express/orders/verify-payment', {
              orderId: data.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            toast.success('Order placed!');
            navigate('/express/my-orders');
          } catch {
            toast.error('Payment verification failed');
          }
        },
        prefill: { name: address.name, contact: address.phone },
        theme: { color: '#4f46e5' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start checkout');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 pb-28">
      <div className="flex items-center gap-2 mb-4">
        <FiZap className="text-amber-500" size={20} />
        <h1 className="text-xl font-black text-indigo-900">Checkout</h1>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4 grid gap-3">
        <h2 className="font-bold text-gray-700 text-sm">Delivery Address</h2>
        <input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Phone" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Address" value={address.addressLine} onChange={e => setAddress(a => ({ ...a, addressLine: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Pincode" value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={getQuote} disabled={quoting} className="px-4 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50">
          {quoting ? 'Calculating…' : 'Get Price'}
        </button>
      </div>

      {quote && (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <h2 className="font-bold text-gray-700 text-sm mb-2">Order Summary</h2>
          {quote.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{it.name} × {it.quantity}</span>
              <span>₹{it.lineTotal}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-gray-800 pt-2 border-t mt-2">
            <span>Total ({quote.totalWeightKg} kg)</span>
            <span>₹{quote.total}</span>
          </div>
          {quote.largeOrderWarning && (
            <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={14} />
              <p className="text-xs text-amber-800">This is a large order. Consider Koyambedu Daily for better availability.</p>
            </div>
          )}
        </div>
      )}

      {quote && (
        <button onClick={placeOrder} disabled={placing}
          className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
          <FiCheck size={20} /> {placing ? 'Placing order…' : `Pay ₹${quote.total}`}
        </button>
      )}
    </div>
  );
}
