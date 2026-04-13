// ============================================
// PRODUCT DETAIL PAGE
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiShoppingCart, FiHeart, FiStar, FiTruck, FiShield, FiArrowLeft, FiMinus, FiPlus } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Loader from '../components/common/Loader';
import ProductCard from '../components/product/ProductCard';
import { useCart } from '../context/CartContext';
import { formatINR, getDiscountPercent, formatDate } from '../utils/currency';
import api from '../utils/api';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, isInCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        setProduct(data.product);

        // Fetch related products
        if (data.product?.category?._id) {
          const relRes = await api.get(`/products?category=${data.product.category._id}&limit=4`);
          setRelatedProducts(relRes.data.products?.filter(p => p._id !== data.product._id).slice(0, 4) || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <><Navbar /><Loader fullPage={false} /></>;
  if (!product) return <><Navbar /><div className="text-center py-20">Product not found</div></>;

  const effectivePrice = product.discountPrice || product.price;
  const discount = getDiscountPercent(product.price, product.discountPrice);
  const inCart = isInCart(product._id);

  return (
    <>
      <Helmet>
        <title>{product.name} — Eptomart</title>
        <meta name="description" content={product.shortDescription || product.description?.slice(0, 160)} />
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary-500">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-500">Shop</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/shop/${product.category.slug}`} className="hover:text-primary-500">{product.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3">
              <img
                src={product.images?.[selectedImage]?.url || 'https://via.placeholder.com/500'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary-500' : 'border-gray-200'}`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-sm text-primary-500 font-medium mb-1">{product.category?.name}</p>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>

            {/* Ratings */}
            {product.ratings?.count > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1 bg-green-500 text-white text-sm px-2 py-0.5 rounded-lg">
                  <span>{product.ratings.average}</span>
                  <FiStar size={12} />
                </div>
                <span className="text-sm text-gray-500">{product.ratings.count} ratings</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-gray-900">{formatINR(effectivePrice)}</span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>
                  <span className="badge bg-green-100 text-green-700">{discount}% OFF</span>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4
              ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </div>

            {/* Description */}
            {product.shortDescription && (
              <p className="text-gray-600 mb-4">{product.shortDescription}</p>
            )}

            {/* Quantity + Actions */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <FiMinus />
                </button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  <FiPlus />
                </button>
              </div>

              <button
                onClick={() => addToCart(product, quantity)}
                disabled={product.stock === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <FiShoppingCart />
                {inCart ? 'Add More to Cart' : 'Add to Cart'}
              </button>

              <button className="w-12 h-12 border-2 border-gray-200 rounded-xl flex items-center justify-center hover:border-red-300 hover:text-red-400 transition-colors">
                <FiHeart />
              </button>
            </div>

            <button
              onClick={() => { addToCart(product, quantity); navigate('/checkout'); }}
              disabled={product.stock === 0}
              className="btn-outline w-full mb-6"
            >
              Buy Now
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: FiTruck, label: 'Free Delivery', sub: 'On orders above ₹499' },
                { icon: FiShield, label: 'Secure Payment', sub: '100% safe checkout' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Icon className="text-primary-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Product Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Reviews */}
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
                      {review.rating} <FiStar size={10} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 ml-10">{review.comment}</p>
                  <p className="text-xs text-gray-400 ml-10 mt-1">{formatDate(review.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="section-title">Related Products</h2>
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
