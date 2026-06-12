// ============================================
// PRODUCT DETAIL PAGE — multi-seller, GST, delivery, insights
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiShoppingCart, FiHeart, FiStar, FiTruck, FiShield,
  FiMinus, FiPlus, FiRepeat, FiColumns, FiInfo, FiArrowLeft, FiShare2,
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
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const byId      = new URLSearchParams(location.search).get('byId') === 'true';
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
  const [selectedVariant,  setSelectedVariant]   = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}${byId ? '?byId=true' : ''}`);
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

  const isUnavailable  = product.isActive === false;
  const activeSeller   = selectedSeller || null;
  const activeGstRate  = activeSeller?.product?.gstRate || product.gstRate || 18;

  // ── Variant logic ─────────────────────────────────────────
  const hasVariants   = product.variants?.length > 0;
  // Variants that carry their own price — the ones the buyer must choose
  const pricedVariants = hasVariants
    ? product.variants.filter(v => v.price != null && v.price > 0)
    : [];
  const requireVariantSelect = pricedVariants.length > 0;  // block cart if true and none selected

  // Lowest priced variant (for "From ₹X" display)
  const lowestVariantPrice = requireVariantSelect
    ? Math.min(...pricedVariants.map(v => v.price))
    : null;

  // Active price: variant price takes priority; then seller price; then product price
  const activePrice =
    selectedVariant?.price                          // selected variant with explicit price
    || activeSeller?.product?.price                 // selected alt-seller price
    || product.discountPrice                        // product-level discount
    || product.price;                               // product base price

  const activeStock    = selectedVariant?.stock ?? activeSeller?.product?.stock ?? product.stock;
  const priceExGst     = extractBasePrice(activePrice, activeGstRate);
  const gstAmount      = priceExGst * activeGstRate / 100;
  const discount       = getDiscountPercent(product.price, activePrice);
  const inCart         = isInCart(product._id);
  const inWishlist     = isInWishlist(product._id);
  const activeSellerId = activeSeller?.seller?._id || product.seller?._id;

  const variantLabel = selectedVariant
    ? [selectedVariant.label, selectedVariant.value, selectedVariant.unit].filter(Boolean).join(' ')
    : null;

  const handleAddToCart = () => {
    // Block if product has priced variants and none is selected
    if (requireVariantSelect && !selectedVariant) {
      toast.error('Please select a variant before adding to cart');
      return;
    }
    addToCart({
      ...product,
      discountPrice: activePrice,   // always the correct variant/seller/product price
      selectedSeller: activeSeller?.seller,
      gstRate: activeGstRate,
      ...(variantLabel ? { variantLabel } : {}),
    }, quantity);
  };

  const handleBuyNow = () => {
    if (requireVariantSelect && !selectedVariant) {
      toast.error('Please select a variant before buying');
      return;
    }
    navigate('/checkout', {
      state: {
        buyNow: {
          _id: product._id,
          product: product._id,
          name: product.name,
          image: product.images?.[0]?.url || '',
          price: activePrice,
          quantity,
          gstRate: activeGstRate,
          ...(variantLabel ? { variantLabel } : {}),
        }
      }
    });
  };

  const handleShare = async () => {
    const url  = `${window.location.origin}/product/${slug}`;
    const text = `Check out ${product.name} on Eptomart!`;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, text, url }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Product link copied to clipboard! 🔗');
      } catch {
        toast.error('Could not copy link');
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>{product.name} — Buy Online at Best Price | Eptomart India</title>
        <meta name="description" content={`Buy ${product.name} online at best price in India. ${product.shortDescription || product.description?.slice(0, 100) || ''} Fast delivery, GST invoice, verified seller — Eptomart.`} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={`https://www.eptomart.com/product/${slug}`} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} — Eptomart`} />
        <meta property="og:description" content={product.shortDescription || product.description?.slice(0, 155)} />
        <meta property="og:image" content={product.images?.[0]?.url} />
        <meta property="og:url" content={`https://www.eptomart.com/product/${slug}`} />
        <meta property="og:site_name" content="Eptomart" />
        <meta property="product:price:amount" content={activePrice} />
        <meta property="product:price:currency" content="INR" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} — Eptomart`} />
        <meta name="twitter:description" content={product.shortDescription || product.description?.slice(0, 155)} />
        <meta name="twitter:image" content={product.images?.[0]?.url} />
        {/* JSON-LD structured data — Google Shopping + rich results */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": product.name,
          "image": product.images?.map(i => i.url) || [],
          "description": product.shortDescription || product.description?.slice(0, 300),
          "sku": product._id,
          "brand": { "@type": "Brand", "name": product.brand || "Eptomart" },
          "offers": {
            "@type": "Offer",
            "url": `https://www.eptomart.com/product/${slug}`,
            "priceCurrency": "INR",
            "price": activePrice,
            "itemCondition": "https://schema.org/NewCondition",
            "availability": activeStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": "Eptomart" }
          },
          ...(product.ratings?.count > 0 ? {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": product.ratings.average,
              "reviewCount": product.ratings.count
            }
          } : {})
        })}</script>
        {/* BreadcrumbList — improves SERP appearance */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.eptomart.com/" },
            { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://www.eptomart.com/shop" },
            ...(product.category ? [{ "@type": "ListItem", "position": 3, "name": product.category, "item": `https://www.eptomart.com/shop?category=${encodeURIComponent(product.category)}` }] : []),
            { "@type": "ListItem", "position": product.category ? 4 : 3, "name": product.name, "item": `https://www.eptomart.com/product/${slug}` }
          ]
        })}</script>
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 font-medium mb-4 transition-colors group"
        >
          <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary-500">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-500">Shop</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/shop/${product.category.slug}`} className="hover:text-primary-500">{product.category.name}</Link>
            </>
          )}
          {product.subCategory && (
            <>
              <span>/</span>
              <Link to={`/shop/${product.category?.slug}?sub=${product.subCategory._id}`} className="hover:text-primary-500">{product.subCategory.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* ── Images ──────────────────────────────── */}
          <div className="md:sticky md:top-32 md:self-start">
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3 relative border border-gray-100 shadow-card group">
              <img
                key={selectedImage}
                src={product.images?.[selectedImage]?.url || 'https://via.placeholder.com/500'}
                alt={product.name}
                className="w-full h-full object-cover animate-fade-in md:group-hover:scale-105 transition-transform duration-500"
              />
              {discount > 0 && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-sm font-extrabold px-2.5 py-0.5 rounded-lg shadow-sm">
                  {discount}% OFF
                </span>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                      ${selectedImage === i ? 'border-primary-500 ring-2 ring-primary-200 scale-[1.03]' : 'border-gray-200 hover:border-primary-300 opacity-80 hover:opacity-100'}`}>
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
                {requireVariantSelect && !selectedVariant ? (
                  // No variant selected yet — show "From ₹X"
                  <span className="text-3xl font-bold text-gray-900">
                    From {formatINR(lowestVariantPrice)}
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-gray-900">{formatINR(activePrice)}</span>
                    {discount > 0 && (
                      <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>
                    )}
                  </>
                )}
              </div>
              {(!requireVariantSelect || selectedVariant) && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <FiInfo size={11} />
                  <span>
                    ₹{priceExGst.toFixed(2)} + {activeGstRate}% GST (₹{gstAmount.toFixed(2)})
                    {' = '}
                    <span className="font-medium text-gray-700">₹{activePrice.toFixed(2)} incl. GST</span>
                  </span>
                </div>
              )}
            </div>

            {/* Seller info — Amazon-style banner */}
            {product.seller?.businessName && (
              <div className="border border-orange-200 rounded-xl overflow-hidden mb-4">
                <div className="bg-orange-50 px-4 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Sold by</p>
                    <p className="font-bold text-gray-800 truncate">{product.seller.businessName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.seller.sellerId && (
                        <span className="text-xs font-mono text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                          {product.seller.sellerId}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/store/${product.seller._id}`}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    🏪 Visit Store
                  </Link>
                </div>
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

            {/* Variant Selector */}
            {hasVariants && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {requireVariantSelect ? 'Select Option' : 'Options'}
                    {requireVariantSelect && <span className="text-red-500 ml-0.5">*</span>}
                  </p>
                  {requireVariantSelect && !selectedVariant && (
                    <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                      Required — select to see price
                    </span>
                  )}
                  {selectedVariant && (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      ✓ {variantLabel} — {formatINR(selectedVariant.price || activePrice)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => {
                    const isSelected = selectedVariant?._id === v._id ||
                      (selectedVariant && !v._id && selectedVariant.label === v.label && selectedVariant.value === v.value);
                    const outOfStock = (v.stock != null && v.stock === 0);
                    const displayLabel = [v.label, v.value ? `${v.value}${v.unit || ''}` : null].filter(Boolean).join(' – ');
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!outOfStock) setSelectedVariant(v); }}
                        disabled={outOfStock}
                        className={`px-3 py-1.5 text-sm rounded-xl border-2 font-medium transition-all
                          ${isSelected
                            ? 'border-primary-500 bg-orange-50 text-primary-700 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-400 text-gray-700'}
                          ${outOfStock ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}`}
                      >
                        {displayLabel}
                        {v.price ? <span className="ml-1 text-xs font-normal opacity-75">· {formatINR(v.price)}</span> : null}
                        {outOfStock && <span className="ml-1 text-[10px] text-red-400">OOS</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seller unavailable banner */}
            {isUnavailable && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <strong>Seller not available</strong>
                  <p className="text-red-600 mt-0.5 text-xs">This product's seller has been deactivated. You cannot add it to cart at this time.</p>
                </div>
              </div>
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

              <button
                onClick={handleAddToCart}
                disabled={activeStock === 0 || isUnavailable}
                className={`btn-primary flex-1 flex items-center justify-center gap-2 min-w-[140px]
                  ${(isUnavailable || activeStock === 0) ? 'opacity-50 cursor-not-allowed' : ''}
                  ${(requireVariantSelect && !selectedVariant) ? 'bg-gray-400 hover:bg-gray-500' : ''}`}
              >
                <FiShoppingCart size={16} />
                {isUnavailable
                  ? 'Not Available'
                  : (requireVariantSelect && !selectedVariant)
                    ? 'Select a Variant First'
                    : inCart ? 'Add More' : 'Add to Cart'}
              </button>

              <button onClick={() => toggleWishlist(product)}
                className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all
                  ${inWishlist ? 'border-red-400 bg-red-50 text-red-400' : 'border-gray-200 hover:border-red-300 hover:text-red-400'}`}
                title="Add to wishlist">
                <FiHeart size={18} style={{ fill: inWishlist ? 'currentColor' : 'none' }} />
              </button>

              <button onClick={() => addToCompare(product)}
                className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-blue-300 hover:text-blue-500 transition-all"
                title="Add to compare">
                <FiColumns size={16} />
              </button>

              <button onClick={handleShare}
                className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-green-300 hover:text-green-600 transition-all"
                title="Share this product">
                <FiShare2 size={16} />
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              disabled={activeStock === 0 || isUnavailable}
              className={`btn-primary w-full mb-4
                ${(isUnavailable || activeStock === 0) ? 'opacity-50 cursor-not-allowed' : ''}
                ${(requireVariantSelect && !selectedVariant) ? 'bg-gray-400 hover:bg-gray-500' : ''}`}
            >
              {(requireVariantSelect && !selectedVariant) ? '⚡ Select Variant to Buy' : '⚡ Buy Now'}
            </button>

            {/* Delivery Estimate */}
            <div className="mb-4">
              <DeliveryEstimate productId={product._id} sellerId={activeSellerId} />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center">
                <FiShield className="text-primary-500" size={18} />
                <div>
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">Secure Payment</p>
                  <p className="text-[10px] text-gray-500">Razorpay encrypted</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center">
                <FiRepeat className="text-primary-500" size={18} />
                <div>
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">Easy Returns</p>
                  <p className="text-[10px] text-gray-500">7-day policy</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center">
                <FiTruck className="text-primary-500" size={18} />
                <div>
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">GST Invoice</p>
                  <p className="text-[10px] text-gray-500">On every order</p>
                </div>
              </div>
            </div>

            {/* Instagram link — only shown if set by admin */}
            {product.instagramLink && (
              <a
                href={product.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl px-4 py-2.5 transition-all mt-3 w-fit"
              >
                <span className="text-base">📸</span>
                View on Instagram
              </a>
            )}
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

      {/* ── Sticky mobile buy bar (sits above BottomNav) ── */}
      {!isUnavailable && (
        <div
          className="md:hidden fixed left-0 right-0 z-[9970] px-3 py-2.5 flex items-center gap-3 animate-slide-up"
          style={{
            bottom: 'calc(58px + env(safe-area-inset-bottom))',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 -6px 24px rgba(11,25,40,0.10)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex-shrink-0 min-w-0">
            {requireVariantSelect && !selectedVariant ? (
              <p className="text-base font-extrabold text-gray-900 leading-tight">From {formatINR(lowestVariantPrice)}</p>
            ) : (
              <>
                <p className="text-base font-extrabold text-gray-900 leading-tight">{formatINR(activePrice)}</p>
                {discount > 0 && <p className="text-[10px] text-gray-400 line-through leading-tight">{formatINR(product.price)}</p>}
              </>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={activeStock === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 border-primary-500 text-primary-600 active:scale-95 transition-all disabled:opacity-50">
            <FiShoppingCart size={15} /> Add
          </button>
          <button
            onClick={handleBuyNow}
            disabled={activeStock === 0}
            className="flex-[1.4] py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#ff9d30,#f4941c)' }}>
            {activeStock === 0 ? 'Out of Stock' : (requireVariantSelect && !selectedVariant) ? 'Select Variant' : '⚡ Buy Now'}
          </button>
        </div>
      )}

      <Footer />
    </>
  );
}
