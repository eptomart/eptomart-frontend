// ============================================
// FRUIT BASKETS & HAMPERS — Shop / Listing page
// Cart is now backed by FruitBasketCartContext (guest localStorage + server
// persistence for logged-in users), so items also appear in the common
// Eptomart /cart page under their own "Fruit Baskets & Hampers" tab.
// Checkout page (FruitBasketCheckout.jsx) and all pricing/order logic are
// unchanged — only the source of the cart changed.
// ============================================
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShoppingBag, FiPlus, FiMinus, FiArrowRight, FiGift, FiTruck, FiPhoneCall, FiEdit3, FiZap } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';
import { useFruitBasketCart } from '../../context/FruitBasketCartContext';
import { FB_THEME } from '../../utils/fruitBasketTheme';

const OCCASION_LABELS = {
  general: 'All Occasions', birthday: 'Birthday', anniversary: 'Anniversary',
  'get-well': 'Get Well Soon', festival: 'Festival', congratulations: 'Congratulations', condolence: 'Condolence',
};

export default function FruitBasketShop() {
  const navigate = useNavigate();
  const [status, setStatus]     = useState(null); // { featureEnabled, ... }
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [occasion, setOccasion] = useState('');
  const { cart, fetchCart, updateItem, getQty, itemCount, subtotal } = useFruitBasketCart();

  useEffect(() => {
    api.get('/fruitbaskets/status').then(r => setStatus(r.data)).catch(() => setStatus({ featureEnabled: false }));
    fetchCart();
  }, []);

  useEffect(() => {
    if (!status?.featureEnabled) { setLoading(false); return; }
    setLoading(true);
    const q = occasion ? `?occasion=${occasion}` : '';
    api.get(`/fruitbaskets/products${q}`)
      .then(r => setProducts(r.data.products || []))
      .catch(() => toast.error('Failed to load baskets'))
      .finally(() => setLoading(false));
  }, [status, occasion]);

  const setQty = (product, qty) => {
    updateItem(product._id, qty, { productData: product });
  };

  const cartItems = cart.items || [];
  const cartCount = itemCount;
  const cartTotal = subtotal;

  const goToCheckout = () => {
    if (cartItems.length === 0) { toast.error('Add a basket first'); return; }
    navigate('/fruitbaskets/checkout');
  };

  if (status && !status.featureEnabled) {
    return (
      <div className="min-h-screen" style={{ background: FB_THEME.purple50 }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <FiGift size={40} className="mx-auto mb-4" style={{ color: FB_THEME.purple600 }} />
          <h1 className="text-xl font-black text-gray-800 mb-2">Fruit Baskets & Hampers</h1>
          <p className="text-gray-500 text-sm">This is coming back soon — please check again shortly.</p>
          <Link to="/" className="inline-block mt-6 font-bold text-sm" style={{ color: FB_THEME.purple700 }}>Back to Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: FB_THEME.purple50 }}>
      <Navbar />

      {/* Header */}
      <div className="relative overflow-hidden fb-royal-header" style={{ background: FB_THEME.gradientHero }}>
        <span className="pointer-events-none absolute inset-0 fb-royal-shimmer" />
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 relative z-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: FB_THEME.gradientGold, color: FB_THEME.purple900 }}>
            <FiGift size={11} /> Fruit Baskets & Hampers
          </span>
          <h1 className="font-black text-2xl md:text-3xl mt-3"
            style={{ color: FB_THEME.goldLight, textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
            Gift a basket, delight a day
          </h1>
          <p className="text-sm mt-1.5 max-w-lg" style={{ color: FB_THEME.purple100 }}>
            Curated fruit baskets and hampers, hand-packed and delivered to your door — pick a slot that suits you.
          </p>
        </div>
      </div>

      {/* Occasion filter */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['', ...Object.keys(OCCASION_LABELS).filter(k => k !== 'general')].map(key => (
            <button key={key || 'all'} onClick={() => setOccasion(key)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors"
              style={occasion === key
                ? { background: FB_THEME.gradientButton, color: '#fff', borderColor: FB_THEME.purple700 }
                : { background: '#fff', color: FB_THEME.purple700, borderColor: FB_THEME.purple100 }}>
              {key ? OCCASION_LABELS[key] : 'All Occasions'}
            </button>
          ))}
        </div>
      </div>

      {/* Custom order / urgent order banner */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <a
          href="tel:+919500050027"
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-4 py-4 md:px-6 md:py-5 transition-transform active:scale-[0.99]"
          style={{
            background: FB_THEME.gradientHeader,
            border: FB_THEME.borderGold,
            boxShadow: FB_THEME.shadowPurple,
          }}
        >
          {/* Subtle sheen sweep */}
          <span className="pointer-events-none absolute inset-0 fb-cta-shine" />
          {/* Decorative ring glow behind the icon */}
          <span className="pointer-events-none absolute -left-6 -top-6 w-28 h-28 rounded-full blur-2xl" style={{ background: 'rgba(212,175,55,0.25)' }} />

          <div className="relative flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl backdrop-blur-sm flex items-center justify-center fb-cta-icon"
            style={{ background: 'rgba(212,175,55,0.18)', border: FB_THEME.borderGold }}>
            <FiGift size={22} style={{ color: FB_THEME.goldLight }} />
          </div>

          <div className="relative flex-1 min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase mb-0.5" style={{ color: FB_THEME.goldLight }}>
              <FiEdit3 size={11} /> Customised baskets <span style={{ color: 'rgba(245,213,118,0.5)' }}>·</span> <FiZap size={11} /> Urgent orders
            </p>
            <p className="text-white font-bold text-sm md:text-base leading-snug">
              Want your own choice of fruits, custom printing, or an urgent same-day basket?
            </p>
            <p className="text-xs md:text-sm mt-0.5" style={{ color: FB_THEME.purple100 }}>
              Talk to us directly — we'll set it up for you.
            </p>
          </div>

          <div className="relative flex-shrink-0 flex flex-col items-end gap-1">
            <span className="flex items-center gap-1.5 font-black text-xs md:text-sm px-3.5 py-2 rounded-xl shadow-md transition-colors fb-cta-pulse"
              style={{ background: FB_THEME.gradientGold, color: FB_THEME.purple900 }}>
              <FiPhoneCall size={14} /> +91 95000 50027
            </span>
            <span className="text-[10px] font-semibold pr-1" style={{ color: FB_THEME.purple100 }}>Tap to call</span>
          </div>
        </a>
      </div>

      {/* Product grid */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl" style={{ height: 220 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No baskets available right now.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map(p => {
              const qty = getQty(p._id);
              return (
                <div key={p._id} className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${FB_THEME.purple100}`, boxShadow: FB_THEME.cardShadow }}>
                  <div className="aspect-square bg-gray-50 relative">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: FB_THEME.purple100 }}><FiGift size={32} /></div>
                    )}
                    {!p.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-black" style={{ color: FB_THEME.purple700 }}>₹{p.price}</span>
                      {p.compareAtPrice > p.price && (
                        <span className="text-[10px] text-gray-400 line-through">₹{p.compareAtPrice}</span>
                      )}
                    </div>
                    {p.isAvailable && (
                      qty === 0 ? (
                        <button onClick={() => setQty(p, 1)}
                          className="mt-2 w-full text-white text-xs font-bold py-1.5 rounded-lg active:scale-[0.97] transition-transform"
                          style={{ background: FB_THEME.gradientButton }}>
                          Add
                        </button>
                      ) : (
                        <div className="mt-2 flex items-center justify-between rounded-lg px-1 py-1" style={{ background: FB_THEME.purple50 }}>
                          <button onClick={() => setQty(p, qty - 1)} className="w-6 h-6 flex items-center justify-center" style={{ color: FB_THEME.purple700 }}><FiMinus size={12} /></button>
                          <span className="text-xs font-black" style={{ color: FB_THEME.purple800 }}>{qty}</span>
                          <button onClick={() => setQty(p, qty + 1)} className="w-6 h-6 flex items-center justify-center" style={{ color: FB_THEME.purple700 }}><FiPlus size={12} /></button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
          <button onClick={goToCheckout}
            className="max-w-5xl mx-auto w-full text-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl active:scale-[0.98] transition-transform"
            style={{ background: FB_THEME.gradientHeader, border: FB_THEME.borderGold }}>
            <span className="flex items-center gap-2 text-sm font-bold">
              <FiShoppingBag size={16} /> {cartCount} item{cartCount > 1 ? 's' : ''} · ₹{cartTotal}
            </span>
            <span className="flex items-center gap-1 text-sm font-black">
              Checkout <FiArrowRight size={15} />
            </span>
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
}
