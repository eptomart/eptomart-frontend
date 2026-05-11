// ============================================
// UZHAVAR FRESH — Farmer Detail + Booking
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiStar, FiArrowLeft, FiShoppingCart, FiPlus, FiMinus, FiMapPin, FiPhone } from 'react-icons/fi';
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
  const [tab, setTab]           = useState('shop'); // shop | profile
  const [cart, setCart]         = useState({}); // productId → qty
  const [bookingType, setBookingType] = useState('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledSlot, setScheduledSlot] = useState('morning');
  const [placing, setPlacing]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/uzhavar/farmers/${farmerId}/profile`);
        setFarmer(res.data.farmer || { _id: farmerId, name: 'Farmer', address: {}, ratings: {} });
        setProducts(res.data.products || []);
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
      return next === 0
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== productId))
        : { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const prod = products.find(p => p._id === id);
    return prod ? { ...prod, qty } : null;
  }).filter(Boolean);

  const subtotal        = cartItems.reduce((s, i) => s + i.pricePerUnit * i.qty, 0);
  const bookingFeeTotal = parseFloat((21 * 1.18).toFixed(2));
  const grandTotal      = parseFloat((subtotal + bookingFeeTotal).toFixed(2));
  const cartCount       = Object.values(cart).reduce((s, v) => s + v, 0);

  const UZHAVAR_MIN_KG = 5;
  const totalKgInCart  = cartItems.filter(i => i.unit === 'kg').reduce((s, i) => s + i.qty, 0);
  const hasKgItems     = cartItems.some(i => i.unit === 'kg');
  const belowMinimum   = hasKgItems && totalKgInCart < UZHAVAR_MIN_KG;
  const kgNeeded       = Math.max(0, UZHAVAR_MIN_KG - totalKgInCart);

  const handleBook = async () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: `/uzhavar/farmer/${farmerId}` } }); return; }
    if (cartItems.length === 0) { toast.error('Add items first'); return; }
    if (bookingType === 'scheduled' && !scheduledDate) { toast.error('Pick delivery date'); return; }
    if (belowMinimum) {
      toast.error(`Minimum order quantity for Uzhavar Fresh is ${UZHAVAR_MIN_KG} kg. Add ${kgNeeded.toFixed(1)} kg more.`);
      return;
    }

    setPlacing(true);
    try {
      const orderRes = await api.post('/uzhavar/orders', {
        farmerId,
        items: cartItems.map(i => ({ productId: i._id, quantity: i.qty })),
        bookingType,
        scheduledDate: bookingType === 'scheduled' ? scheduledDate : null,
        scheduledSlot: bookingType === 'scheduled' ? scheduledSlot : null,
        deliveryAddress: { name: 'Delivery address required' },
        paymentMethod: 'razorpay',
      });
      const order = orderRes.data.order;

      const payRes = await api.post('/uzhavar/orders/payment', { uzhavarOrderId: order._id });
      const { rzpOrderId, amount, currency } = payRes.data;

      const options = {
        key:      import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount, currency,
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
        <div className="bg-gradient-to-br from-green-700 to-lime-500 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl">🧑‍🌾</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl">{farmer?.name}</h1>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">✅ Verified</span>
              </div>
              <p className="text-green-100 text-sm">
                {[farmer?.address?.village, farmer?.address?.taluk, farmer?.address?.district].filter(Boolean).join(', ')}
              </p>
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
          <div className="flex gap-3 mt-3 text-xs text-green-100 flex-wrap">
            <span>📍 {farmer?.deliveryRadius}km delivery</span>
            {farmer?.address?.taluk && <span>🌱 {farmer.address.taluk}</span>}
            <span>🛒 {products.length} products</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'shop',    label: `🥬 Shop (${products.length})` },
            { key: 'profile', label: '👤 Profile' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SHOP TAB ── */}
        {tab === 'shop' && (
          <>
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
                      {prod.harvestFrom && (
                        <p className="text-xs text-green-600 font-medium">
                          🗓 {new Date(prod.harvestFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {prod.harvestTo && prod.harvestTo !== prod.harvestFrom && (
                            <> → {new Date(prod.harvestTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
                          )}
                        </p>
                      )}
                      <p className="font-bold text-green-600 text-sm mt-0.5">
                        ₹{prod.pricePerUnit}/{prod.unit}
                        <span className="font-normal text-gray-400 text-xs ml-2">
                          {prod.availableQuantity} {prod.unit} left
                        </span>
                      </p>
                    </div>
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
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="space-y-4">

            {/* About */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 text-sm mb-3">🧑‍🌾 About this Farmer</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <FiMapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {[farmer?.address?.village, farmer?.address?.taluk, farmer?.address?.district, farmer?.address?.state]
                        .filter(Boolean).join(', ')}
                    </p>
                    {farmer?.address?.pincode && (
                      <p className="text-xs text-gray-400">Pincode: {farmer.address.pincode}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm flex-shrink-0">📦</span>
                  <div>
                    <p className="text-xs text-gray-500">Delivery radius</p>
                    <p className="text-sm font-semibold text-gray-800">{farmer?.deliveryRadius} km from farm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm flex-shrink-0">🌿</span>
                  <div>
                    <p className="text-xs text-gray-500">Language</p>
                    <p className="text-sm font-semibold text-gray-800 capitalize">
                      {farmer?.language === 'ta' ? 'Tamil' : farmer?.language === 'en' ? 'English' : 'Tamil & English'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 text-sm flex-shrink-0">✅</span>
                  <div>
                    <p className="text-xs text-gray-500">Verified status</p>
                    <p className="text-sm font-semibold text-green-700">Government-ID Verified</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="font-black text-green-600 text-xl">{products.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Products</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="font-black text-green-600 text-xl">{farmer?.totalOrders || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Orders</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                <p className="font-black text-green-600 text-xl">{farmer?.acceptanceRate || 100}%</p>
                <p className="text-xs text-gray-500 mt-0.5">Acceptance</p>
              </div>
            </div>

            {/* Ratings breakdown */}
            {farmer?.ratings?.count > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-3">
                  ⭐ Ratings
                  <span className="ml-2 text-xs font-normal text-gray-400">({farmer.ratings.count} reviews)</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {['freshness', 'quality', 'delivery', 'behaviour'].map(k => {
                    const r = farmer.ratings[k];
                    const avg = r?.count > 0 ? (r.total / r.count) : 0;
                    return (
                      <div key={k} className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="capitalize text-xs text-gray-500">{k}</span>
                          <span className="font-bold text-xs text-gray-800">{avg > 0 ? avg.toFixed(1) : '—'}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(avg / 5) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-black text-green-600 text-2xl">{farmer.ratings.average.toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <FiStar key={i} size={14} className={i <= Math.round(farmer.ratings.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">Overall score</p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery slots */}
            {farmer?.deliverySlots?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 text-sm mb-3">🕐 Delivery Slots</h3>
                <div className="flex flex-wrap gap-2">
                  {farmer.deliverySlots.map((slot, i) => (
                    <span key={i} className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {slot.day} {slot.start}–{slot.end}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Sticky cart footer */}
      {cartCount > 0 && tab === 'shop' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl px-4 py-4 z-30">
          <div className="max-w-2xl mx-auto">
            {belowMinimum && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">Minimum order quantity for Uzhavar Fresh is 5 kg.</p>
                  <p className="text-xs text-amber-600">Add {kgNeeded.toFixed(1)} kg more to place the order.</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-600">{cartCount} items · ₹{subtotal.toFixed(0)}</span>
              <span className="text-xs text-gray-400">+ ₹{bookingFeeTotal} booking fee (incl. GST)</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-green-600 text-lg">₹{grandTotal}</span>
            </div>
            <button onClick={handleBook} disabled={placing || belowMinimum}
              className={`w-full text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${belowMinimum ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
              <FiShoppingCart size={16} />
              {placing ? 'Processing...' : belowMinimum ? `Add ${kgNeeded.toFixed(1)} kg more` : 'Freeze Booking & Pay'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
