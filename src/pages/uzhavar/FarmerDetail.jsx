// ============================================
// UZHAVAR FRESH — Farmer Detail + Booking
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiStar, FiArrowLeft, FiShoppingCart, FiPlus, FiMinus, FiTruck } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function FarmerDetail() {
  const { farmerId } = useParams();
  const navigate     = useNavigate();
  const { isLoggedIn } = useAuth();

  const [farmer, setFarmer]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [cart, setCart]         = useState({}); // productId → qty
  const [bookingType, setBookingType] = useState('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledSlot, setScheduledSlot] = useState('morning');
  const [placing, setPlacing]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [fRes, pRes] = await Promise.all([
          api.get(`/uzhavar/farmers/nearby?lat=0&lng=0&radius=99999`), // hack: get all, filter below
          api.get(`/uzhavar/farmers/${farmerId}/products`),
        ]);
        const f = (fRes.data.farmers || []).find(x => x._id === farmerId);
        setFarmer(f || { _id: farmerId, name: 'Farmer', address: {}, ratings: {} });
        setProducts(pRes.data.products || []);
      } catch {
        toast.error('Failed to load farmer');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [farmerId]);

  const updateCart = (productId, delta) => {
    setCart(prev => {
      const cur = prev[productId] || 0;
      const next = Math.max(0, cur + delta);
      return next === 0 ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== productId)) : { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const prod = products.find(p => p._id === id);
    return prod ? { ...prod, qty } : null;
  }).filter(Boolean);

  const subtotal = cartItems.reduce((s, i) => s + i.pricePerUnit * i.qty, 0);
  const bookingFeeTotal = parseFloat((21 * 1.18).toFixed(2));
  const grandTotal = parseFloat((subtotal + bookingFeeTotal).toFixed(2));
  const cartCount  = Object.values(cart).reduce((s, v) => s + v, 0);

  const handleBook = async () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: `/uzhavar/farmer/${farmerId}` } }); return; }
    if (cartItems.length === 0) { toast.error('Add items first'); return; }
    if (bookingType === 'scheduled' && !scheduledDate) { toast.error('Pick delivery date'); return; }

    setPlacing(true);
    try {
      // 1. Create order
      const orderRes = await api.post('/uzhavar/orders', {
        farmerId,
        items: cartItems.map(i => ({ productId: i._id, quantity: i.qty })),
        bookingType,
        scheduledDate: bookingType === 'scheduled' ? scheduledDate : null,
        scheduledSlot: bookingType === 'scheduled' ? scheduledSlot : null,
        deliveryAddress: { name: 'Delivery address required' }, // filled at checkout
        paymentMethod: 'razorpay',
      });

      const order = orderRes.data.order;

      // 2. Create Razorpay order
      const payRes = await api.post('/uzhavar/orders/payment', { uzhavarOrderId: order._id });
      const { rzpOrderId, amount, currency } = payRes.data;

      // 3. Open Razorpay
      const options = {
        key:      import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name:     'Uzhavar Fresh',
        description: 'Farm booking fee',
        order_id: rzpOrderId,
        handler: async (response) => {
          await api.post('/uzhavar/orders/verify-payment', {
            uzhavarOrderId: order._id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          toast.success('Booking confirmed! Waiting for farmer.');
          navigate('/uzhavar/my-orders');
        },
        prefill: {},
        theme: { color: '#16a34a' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Booking failed');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <><Navbar /><Loader /></>;

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 10);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <>
      <Helmet><title>{farmer?.name} — Uzhavar Fresh</title></Helmet>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-40 min-h-screen">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 mb-4 transition-colors">
          <FiArrowLeft size={14} /> Back to farmers
        </button>

        {/* Farmer header */}
        <div className="bg-gradient-to-br from-green-700 to-lime-500 rounded-2xl p-5 text-white mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl">🧑‍🌾</div>
            <div className="flex-1">
              <h1 className="font-black text-xl">{farmer?.name}</h1>
              <p className="text-green-100 text-sm">{farmer?.address?.village}, {farmer?.address?.district}</p>
              {farmer?.ratings?.average > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <FiStar size={12} className="fill-yellow-300 text-yellow-300" />
                  <span className="text-sm font-semibold">{farmer.ratings.average.toFixed(1)}</span>
                  <span className="text-green-200 text-xs">({farmer.ratings.count} ratings)</span>
                </div>
              )}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${farmer?.availableNow ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>
              {farmer?.availableNow ? '● Live' : '○ Scheduled'}
            </span>
          </div>
          <div className="flex gap-3 mt-3 text-xs text-green-100">
            <span>📍 {farmer?.deliveryRadius}km delivery</span>
            <span>🌱 {farmer?.address?.taluk}</span>
          </div>
        </div>

        {/* Products */}
        <h2 className="font-bold text-gray-800 mb-3">Available Today</h2>
        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl">
            <div className="text-3xl mb-2">🌱</div>
            <p>No products listed yet</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {products.map(prod => (
              <div key={prod._id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                {prod.image
                  ? <img src={prod.image} alt={prod.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                  : <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center text-2xl">🥬</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{prod.name}</p>
                  {prod.nameTa && <p className="text-xs text-gray-400">{prod.nameTa}</p>}
                  <p className="text-xs text-gray-400 capitalize">{prod.category} · {prod.deliveryType}</p>
                  <p className="font-bold text-green-600 text-sm mt-0.5">
                    ₹{prod.pricePerUnit}/{prod.unit}
                    <span className="font-normal text-gray-400 text-xs ml-2">
                      {prod.availableQuantity} {prod.unit} left
                    </span>
                  </p>
                </div>
                {/* Qty control */}
                <div className="flex items-center gap-2">
                  {cart[prod._id] ? (
                    <>
                      <button onClick={() => updateCart(prod._id, -0.5)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-green-400">
                        <FiMinus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{cart[prod._id]}</span>
                      <button onClick={() => updateCart(prod._id, 0.5)}
                        className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700">
                        <FiPlus size={12} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => updateCart(prod._id, 0.5)}
                      className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                      <FiPlus size={12} /> Add
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking type */}
        {cartCount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Delivery Type</h3>
            <div className="flex gap-2 mb-3">
              {['instant', 'scheduled'].map(t => (
                <button key={t} onClick={() => setBookingType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${bookingType === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t === 'instant' ? '⚡ Instant' : '📅 Scheduled'}
                </button>
              ))}
            </div>

            {bookingType === 'scheduled' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Delivery date</label>
                  <input type="date" min={today} max={maxDateStr} value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Time slot</label>
                  <select value={scheduledSlot} onChange={e => setScheduledSlot(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400">
                    <option value="morning">Morning (6am – 10am)</option>
                    <option value="afternoon">Afternoon (12pm – 3pm)</option>
                    <option value="evening">Evening (5pm – 8pm)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ratings breakdown */}
        {farmer?.ratings?.count > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">⭐ Farmer Ratings</h3>
            <div className="grid grid-cols-2 gap-3">
              {['freshness', 'quality', 'delivery', 'behaviour'].map(k => {
                const r = farmer.ratings[k];
                const avg = r?.count > 0 ? (r.total / r.count).toFixed(1) : '—';
                return (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-500 text-xs">{k}</span>
                    <span className="font-bold text-gray-800">{avg} <FiStar className="inline text-yellow-400" size={10} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Sticky cart footer */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl px-4 py-4 z-30">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-600">{cartCount} items · ₹{subtotal.toFixed(0)}</span>
              <span className="text-xs text-gray-400">+ ₹{bookingFeeTotal} booking fee (incl. GST)</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-green-600 text-lg">₹{grandTotal}</span>
            </div>
            <button onClick={handleBook} disabled={placing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              <FiShoppingCart size={16} />
              {placing ? 'Processing...' : 'Freeze Booking & Pay'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
