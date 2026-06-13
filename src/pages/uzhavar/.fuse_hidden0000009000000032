// ============================================
// UZHAVAR FRESH — Subscription page
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'monthly',
    label: '1 Month',
    base: 299,
    gst: parseFloat((299 * 0.18).toFixed(2)),
    total: parseFloat((299 * 1.18).toFixed(2)),
    perks: ['Unlimited orders', 'No booking fee per order', 'Priority farmer allocation', 'Early harvest alerts'],
    badge: null,
  },
  {
    key: 'quarterly',
    label: '3 Months',
    base: 499,
    gst: parseFloat((499 * 0.18).toFixed(2)),
    total: parseFloat((499 * 1.18).toFixed(2)),
    perks: ['All monthly perks', 'Save ₹398 vs monthly', 'Exclusive farmer deals', 'Free delivery upgrades'],
    badge: 'Best Value',
  },
];

export default function UzhavarSubscribe() {
  const navigate   = useNavigate();
  const { isLoggedIn } = useAuth();
  const [selected, setSelected]   = useState('quarterly');
  const [existing, setExisting]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setChecking(false); return; }
    api.get('/uzhavar/subscription/my')
      .then(r => setExisting(r.data.subscription))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isLoggedIn]);

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleSubscribe = async () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: '/uzhavar/subscribe' } }); return; }
    setLoading(true);
    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        toast.error('Payment gateway failed to load. Check your internet and try again.');
        setLoading(false);
        return;
      }

      const res = await api.post('/uzhavar/subscription', { plan: selected });
      const { subscriptionId, rzpOrderId, amount } = res.data;

      const options = {
        key:      import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name:     'Uzhavar Fresh',
        description: `${selected === 'quarterly' ? '3 Month' : '1 Month'} Subscription`,
        order_id: rzpOrderId,
        handler: async (response) => {
          await api.post('/uzhavar/subscription/verify', {
            subscriptionId,
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          toast.success('Subscription activated! 🎉');
          navigate('/uzhavar');
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: '#16a34a' },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <><Navbar /></>;

  return (
    <>
      <Helmet><title>Uzhavar Fresh Subscription</title></Helmet>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 min-h-screen pb-16">
        <button onClick={() => navigate('/uzhavar')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-700 mb-6">
          <FiArrowLeft size={14} /> Back
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-2xl font-black text-gray-800">Uzhavar Fresh Subscription</h1>
          <p className="text-gray-500 text-sm mt-1">Unlimited fresh orders · No booking fee</p>
        </div>

        {/* Active subscription */}
        {existing && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-center">
            <p className="font-bold text-green-700">✅ Active Subscription</p>
            <p className="text-green-600 text-sm capitalize">{existing.plan} plan</p>
            <p className="text-green-500 text-xs mt-1">
              Valid till {new Date(existing.endDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {PLANS.map(plan => (
            <button key={plan.key} onClick={() => setSelected(plan.key)}
              className={`relative rounded-2xl p-4 text-left border-2 transition-all ${selected === plan.key ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 bg-white'}`}>
              {plan.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
              <p className="font-bold text-gray-800 text-sm">{plan.label}</p>
              <p className="text-2xl font-black text-green-600 mt-1">₹{plan.base}</p>
              <p className="text-xs text-gray-400">+ ₹{plan.gst} GST</p>
              <p className="text-xs font-semibold text-green-600 mt-2">= ₹{plan.total} total</p>
            </button>
          ))}
        </div>

        {/* Perks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">What you get</h3>
          {PLANS.find(p => p.key === selected)?.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FiCheck size={11} className="text-green-600" />
              </div>
              <span className="text-sm text-gray-700">{perk}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSubscribe} disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-black py-4 rounded-2xl text-base shadow-lg disabled:opacity-60 active:scale-95 transition-transform">
          {loading ? 'Processing...' : `Subscribe — ₹${PLANS.find(p => p.key === selected)?.total}`}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">GST invoice generated automatically</p>
      </main>
      <Footer />
    </>
  );
}
