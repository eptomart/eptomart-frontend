// ============================================
// PRODUCT DETAIL PAGE — multi-seller, GST, delivery, insights
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiShoppingCart, FiHeart, FiStar, FiTruck, FiShield,
  FiMinus, FiPlus, FiRepeat, FiColumns, FiMapPin, FiInfo,
} from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Loader from '../components/common/Loader';
import ProductCard from '../components/product/ProductCard';
import DeliveryEstimate from '../components/product/DeliveryEstimate';
import RecentlyViewed from '../components/product/RecentlyViewed';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { formatINR, getDiscountPercent, formatDate } from '../utils/currency';
import { extractBasePrice } from '../utils/gst';
import api from '../utils/api';

export default function ProductPage() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const { addToCart, isInCart }          = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare }                 = useCompare();
  const { addProduct: trackViewed }      = useRecentlyViewed();

  const [product,          setProduct]          = useState(null);
  const [otherSellers,     setOtherSellers]      = useState([]);
  const [relatedProducts,  setRelatedProducts]   = useState([]);
  const [loading,          setLoading]           = useState(true);
  const [selectedImage,    setSelectedImage]     = useState(0);
  const [quantity,         setQuantity]          = useState(1);
  const [selectedSeller,   setSelectedSeller]    = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        const p = data.product;
        setProduct(p);
        setOtherSellers(data.otherSellers || []);

        trackViewed(p);
        if (p?.category?._id) {
          const rel = await api.get(`/products?category=${p.category._id}&limit=4`);
          setRelatedProducts(rel.data.products?.filter(x => x._id !== p._id).slice(0, 4) || []);
        }
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetch();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <><Navbar /><Loader fullPage={false} /></>;
  if (!product) return <><Navbar /><div className="text-center py-20 text-gray-400">Product not found</div></>;

  const activeSeller   = selectedSeller || null;
  const activePrice    = activeSeller?.product?.price || product.discountPrice || product.price;
  const activeStock    = activeSeller?.product?.stock ?? product.stock;
  const activeGstRate  = activeSeller?.product?.gstRate || product.gstRate || 18;
  const priceExGst     = extractBasePrice(activePrice, activeGstRate);
  const gstAmount      = priceExGst * activeGstRate / 100;
  const discount       = getDiscountPercent(product.price, activePrice);
  const inCart         = isInCart(product._id);
  const inWishlist     = isInWishlist(product._id);
  const activeSellerId = activeSeller?.seller?._id || product.seller?._id;

  const handleAddToCart = () => {
    addToCart({ ...product, discountPrice: activePrice, selectedSeller: activeSeller?.seller, gstRate: activeGstRate }, quantity);
  };

  return (
    <>
      <Helmet>
        <title>{product.name} — Eptomart</title>
        <meta name="description" content={product.shortDescription || product.description?.slice(0, 160)} />
        <meta property="og:title" content={`${product.name} — Eptomart`} />
        <meta property="og:description" content={product.shortDescription || product.description?.slice(0, 155)} />
        <meta property="og:image" content={product.images?.[0]?.url} />
        <meta property="og:url" content={`https://eptomart.com/product/${slug}`} />
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary-500">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-500">Shop</Link>
          {product.category && (
            <><span>/</span>
              <Link to={`/shop/${product.category.slug}`} className="hover:text-primary-500">{product.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* ── Images ──────────────────────────────── */}
          <div>
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3 relative">
              <img
                src={product.images?.[selectedImage]?.url || 'https://via.placeholder.com/500'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
                  {discount}% OFF
                </span>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary-500' : 'border-gray-200'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ─────────────────────────── */}
          <div>
            <p className="text-sm text-primary-500 font-medium mb-1">{product.category?.name}</p>
            <h1 className="text-2xl font-bold text-gray-800 mb-2 leading-snug">{product.name}</h1>

            {/* Ratings + insights */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {product.ratings?.count > 0 && (
                <div className="flex items-center gap-1 bg-green-500 text-white text-sm px-2 py-0.5 rounded-lg">
                  <span>{product.ratings.average?.toFixed(1)}</span>
                  <FiStar size={11} style={{ fill: 'white' }} />
                  <span className="opacity-75 text-xs">({product.ratings.count})</span>
                </div>
              )}
              {product.likeCount > 0 && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  ❤️ {product.likeCount} people saved this
                </span>
              )}
              {product.repeatBuyerCount > 0 && (
                <span className="text-xs text-blue-500 flex items-center gap-1">
                  <FiRepeat size={11} /> {product.repeatBuyerCount} repeat buyers
                </span>
              )}
            </div>

            {/* Price + GST */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-gray-900">{formatINR(activePrice)}</span>
                {discount > 0 && (
                  <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <FiInfo size={11} />
                <span>
                  ₹{priceExGst.toFixed(2)} + {activeGstRate}% GST (₹{gstAmount.toFixed(2)})
                  {' = '}
                  <span className="font-medium text-gray-700">₹{activePrice.toFixed(2)} incl. GST</span>
                </span>
              </div>
            </div>

            {/* Seller info */}
            {product.seller && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-sm">
                <p className="text-gray-600">
                  Sold by <span className="font-semibold text-gray-800">{product.seller.businessName || 'Eptomart'}</span>
                  {product.seller.address?.city && <span className="text-gray-500"> · {product.seller.address.city}</span>}
                </p>
              </div>
            )}

            {/* Stock */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4
              ${activeStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${activeStock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              {activeStock > 0
                ? activeStock <= 5 ? `Only ${activeStock} left!` : `In Stock (${activeStock})`
                : 'Out of Stock'}
            </div>
            {product.codAvailable === false && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Online payment only</span>
            )}

            {product.shortDescription && (
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">{product.shortDescription}</p>
            )}

            {/* Quantity + Actions */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <FiMinus size={14} />
                </button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(activeStock, q + 1))} disabled={quantity >= activeStock}
                  className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-50">
                  <FiPlus size={14} />
                </button>
              </div>

              <button onClick={handleAddToCart} disabled={activeStock === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2 min-w-[140px]">
                <FiShoppingCart size={16} />
                {inCart ? 'Add More' : 'Add to Cart'}
              </button>

              <button onClick={() => toggleWishlist(product)}
                className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all
                  ${inWishlist ? 'border-red-400 bg-red-50 text-red-400' : 'border-gray-200 hover:border-red-300 hover:text-red-400'}`}>
                <FiHeart size={18} style={{ fill: inWishlist ? 'currentColor' : 'none' }} />
              </button>

              <button onClick={() => addToCompare(product)}
                className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-blue-300 hover:text-blue-500 transition-all"
                title="Add to compare">
                <FiColumns size={16} />
              </button>
            </div>

            <button onClick={() => { handleAddToCart(); navigate('/checkout'); }} disabled={activeStock === 0}
              className="btn-outline w-full mb-4">
              Buy Now
            </button>

            {/* Delivery Estimate */}
            <div className="mb-4">
              <DeliveryEstimate productId={product._id} sellerId={activeSellerId} />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: FiTruck,   label: 'Free Delivery',   sub: 'On orders above ₹499' },
                { icon: FiShield,  label: 'Secure Payment',  sub: '100% safe checkout' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Icon className="text-primary-500 flex-shrink-0" size={16} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Other Sellers ───────────────────────── */}
        {otherSellers.length > 0 && (
          <div className="card p-5 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🏪 Also available from {otherSellers.length} other seller{otherSellers.length > 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {otherSellers.map((listing, i) => {
                const lPrice = listing.product?.discountPrice || listing.product?.price;
                const isSelected = selectedSeller?.seller?._id === listing.seller?._id;
                return (
                  <div key={i}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${isSelected ? 'border-primary-500 bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}
                    onClick={() => setSelectedSeller(isSelected ? null : listing)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{listing.seller?.businessName}</p>
                      <p className="text-xs text-gray-500">{listing.seller?.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{formatINR(lPrice)}</p>
                      {listing.deliveryEstimate && (
                        <p className="text-xs text-gray-500">🚚 {listing.deliveryEstimate.label}</p>
                      )}
                    </div>
                    <button
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all
                        ${isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-primary-100'}`}>
                      {isSelected ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedSeller && (
              <p className="text-xs text-primary-600 mt-2">
                ✓ You'll buy from <strong>{selectedSeller.seller?.businessName}</strong> at {formatINR(selectedSeller.product?.price || activePrice)}
              </p>
            )}
          </div>
        )}

        {/* ── Description ─────────────────────────── */}
        {product.description && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-3">Product Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">{product.description}</p>
          </div>
        )}

        {/* ── Reviews ─────────────────────────────── */}
        {product.reviews?.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Customer Reviews ({product.reviews.length})</h2>
            <div className="space-y-4">
              {product.reviews.slice(0, 5).map((review, i) => (
                <div key={i} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">
                      {review.name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-medium text-sm">{review.name}</span>
                    <div className="flex items-center gap-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded ml-auto">
                      {review.rating} <FiStar size={9} style={{ fill: 'white' }} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 ml-10">{review.comment}</p>
                  <p className="text-xs text-gray-400 ml-10 mt-1">{formatDate(review.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recently Viewed ──────────────────────── */}
        <RecentlyViewed excludeSlug={slug} />

        {/* ── Related Products ─────────────────────── */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedProducts.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
