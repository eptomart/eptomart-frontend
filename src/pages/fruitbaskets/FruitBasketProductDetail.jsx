// ============================================
// FRUIT BASKETS & HAMPERS — Product Detail
// Mirrors KoyambeduProductDetail.jsx's structure (hero image, sticky header
// with cart badge, sticky bottom Add/Buy bar) but simplified for Fruit
// Basket's schema — no grades/variants, just a single price + simple qty
// stepper. This is purely additive: FruitBasketShop.jsx's existing inline
// Add/qty stepper on the grid card is completely untouched; this page is
// reached by tapping a basket's image/name, same as Koyambedu's pattern.
// ============================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiShoppingBag, FiGift, FiZap, FiShoppingCart, FiCheckCircle, FiMinus, FiPlus,
} from 'react-icons/fi';
import EptoSEO from '../../components/common/EptoSEO';
import api from '../../utils/api';
import { useFruitBasketCart } from '../../context/FruitBasketCartContext';
import { FB_THEME } from '../../utils/fruitBasketTheme';

const OCCASION_LABELS = {
  general: 'All Occasions', birthday: 'Birthday', anniversary: 'Anniversary',
  'get-well': 'Get Well Soon', festival: 'Festival', congratulations: 'Congratulations', condolence: 'Condolence',
};

const IMG_PLACEHOLDER = 'https://placehold.co/400x300/f5f3ff/6d28d9?text=Basket';

export default function FruitBasketProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { getQty, updateItem, loading: cartLoading, itemCount } = useFruitBasketCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const existingQty = getQty(idOrSlug);
    api.get(`/fruitbaskets/products/${idOrSlug}`)
      .then(r => {
        setProduct(r.data.product);
        setQty(existingQty > 0 ? existingQty : 1);
      })
      .catch(() => toast.error('Basket not found'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrSlug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: FB_THEME.purple50 }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: FB_THEME.purple600, borderTopColor: 'transparent' }} />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: FB_THEME.purple50 }}>
      <FiGift size={40} style={{ color: FB_THEME.purple200 || FB_THEME.purple100 }} />
      <p className="text-gray-500 font-semibold">Basket not found</p>
      <button onClick={() => navigate('/fruitbaskets')}
        className="font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95 transition"
        style={{ background: FB_THEME.purple50, color: FB_THEME.purple700 }}>
        ← Back to baskets
      </button>
    </div>
  );

  const images = product.images?.length ? product.images : [IMG_PLACEHOLDER];
  const cartQty = getQty(product._id);
  const maxQty = product.stock !== null && product.stock !== undefined ? product.stock : 99;
  const outOfStock = !product.isAvailable || (product.stock !== null && product.stock !== undefined && product.stock <= 0);
  const total = (qty * product.price).toFixed(2);

  const handleAddToCart = () => {
    updateItem(product._id, qty, { productData: product });
  };

  const handleBuyNow = () => {
    updateItem(product._id, qty, { productData: product });
    navigate('/fruitbaskets/checkout');
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: FB_THEME.purple50 }}>
      <EptoSEO
        app="fruitbaskets"
        page="product"
        title={`${product.name} — Fruit Baskets & Hampers | Eptomart`}
        description={product.description || `${product.name} — a curated fruit basket from Eptomart, delivered to your door.`}
        canonical={`https://www.eptomart.com/fruitbaskets/product/${product.slug || product._id}`}
        image={images[0]}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white" style={{ boxShadow: '0 1px 0 #e5e7eb', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: FB_THEME.purple50 }}>
            <FiArrowLeft size={18} style={{ color: FB_THEME.purple700 }} />
          </button>
          <p className="flex-1 font-bold text-gray-800 text-sm truncate">{product.name}</p>
          <Link to="/cart" className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: FB_THEME.purple50 }}>
            <FiShoppingBag size={17} style={{ color: FB_THEME.purple700 }} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                style={{ background: FB_THEME.gold }}>
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Hero image */}
      <div className="bg-white">
        <div className="relative overflow-hidden" style={{ height: 260 }}>
          <img src={images[activeImg] || IMG_PLACEHOLDER} alt={product.name} className="w-full h-full object-cover" />
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-bold">Out of Stock</span>
            </div>
          )}
          {cartQty > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg"
              style={{ background: FB_THEME.purple600 }}>
              <FiCheckCircle size={11} /> {cartQty} in cart
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className="w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition"
                style={{ borderColor: activeImg === i ? FB_THEME.purple500 : FB_THEME.purple100 }}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* Info card */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
            style={{ background: FB_THEME.purple50, color: FB_THEME.purple700, border: `1px solid ${FB_THEME.purple100}` }}>
            <FiGift size={9} /> {OCCASION_LABELS[product.occasion] || 'All Occasions'}
          </span>
          <h1 className="font-extrabold text-gray-900 text-xl leading-tight">{product.name}</h1>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-black text-2xl" style={{ color: FB_THEME.purple700 }}>₹{product.price}</span>
            {product.compareAtPrice > product.price && (
              <span className="text-gray-400 text-sm line-through">₹{product.compareAtPrice}</span>
            )}
          </div>

          {product.weightKg && (
            <p className="text-xs text-gray-400 mt-1">Approx. weight: {product.weightKg} kg</p>
          )}

          {/* What's inside */}
          {product.contents?.length > 0 && (
            <div className="mt-3 rounded-xl p-3" style={{ background: FB_THEME.purple50, border: `1px solid ${FB_THEME.purple100}` }}>
              <p className="text-xs font-black uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: FB_THEME.purple700 }}>
                <FiZap size={12} /> What&apos;s inside
              </p>
              <ul className="space-y-1">
                {product.contents.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-gray-700 text-sm">
                    <FiCheckCircle size={12} className="shrink-0" style={{ color: FB_THEME.purple500 }} />
                    <span>{c.item} <span className="text-gray-400">— {c.qty}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="mt-3 text-gray-500 text-sm leading-relaxed border-t pt-3" style={{ borderColor: FB_THEME.purple100 }}>
              {product.description}
            </p>
          )}

          {product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
            <p className="mt-2 text-xs font-bold text-red-500">Only {product.stock} left!</p>
          )}
        </div>

        {/* Quantity */}
        {!outOfStock && (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: FB_THEME.cardShadow, border: `1px solid ${FB_THEME.purple100}` }}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-sm">Quantity</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition disabled:opacity-40"
                  style={{ background: FB_THEME.purple50, color: FB_THEME.purple700 }}>
                  <FiMinus size={14} />
                </button>
                <span className="font-black text-lg w-8 text-center" style={{ color: FB_THEME.purple800 }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition disabled:opacity-40"
                  style={{ background: FB_THEME.gradientButton }}>
                  <FiPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {!outOfStock && (
        <div className="fixed left-0 right-0 bottom-0 above-bottom-nav bg-white z-[9970]" style={{
          borderTop: `1px solid ${FB_THEME.purple100}`,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          paddingTop: 10, paddingLeft: 12, paddingRight: 12,
        }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 leading-none">{qty} × ₹{product.price}</p>
              <p className="font-black text-base leading-tight" style={{ color: FB_THEME.purple700 }}>₹{total}</p>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="flex items-center gap-1 font-bold px-3 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-60 shrink-0"
              style={{ background: FB_THEME.purple50, color: FB_THEME.purple700, border: `1.5px solid ${FB_THEME.purple500}` }}>
              <FiShoppingCart size={12} />
              {cartLoading ? '…' : cartQty > 0 ? 'Update' : 'Add to Cart'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={cartLoading}
              className="flex items-center gap-1 font-bold px-3 py-2.5 rounded-xl text-xs text-white transition active:scale-95 disabled:opacity-60 shrink-0"
              style={{ background: FB_THEME.gradientHeader, border: FB_THEME.borderGold }}>
              <FiZap size={12} />
              Buy Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
