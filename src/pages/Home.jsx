// ============================================
// HOME PAGE
// ============================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ProductCard from '../components/product/ProductCard';
import RecentlyViewed from '../components/product/RecentlyViewed';
import { ProductGridSkeleton } from '../components/common/Loader';
import api from '../utils/api';

const FEATURES = [
  { icon: FiTruck, title: 'Free Delivery', desc: 'On orders above ₹499' },
  { icon: FiShield, title: 'Secure Payment', desc: 'UPI, COD & more' },
  { icon: FiRefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
  { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help' },
];

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?featured=true&limit=8'),
          api.get('/products?limit=8&sort=-createdAt'),
        ]);
        setCategories(catRes.data.categories || []);
        setFeaturedProducts(featuredRes.data.products || []);
        setNewArrivals(newRes.data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Helmet>
        <title>Eptomart — Shop Everything Online | India's Best Online Store</title>
        <meta name="description" content="Shop electronics, fashion, groceries and more at the best prices. Fast delivery across India." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen">
        {/* Hero Banner */}
        <section className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
            <div className="max-w-2xl">
              <p className="text-orange-100 font-medium mb-2 text-sm">🇮🇳 India's Fastest Growing Store</p>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                Shop Everything,<br />Delivered Fast 🚀
              </h1>
              <p className="text-orange-100 text-lg mb-8">
                Millions of products at the best prices. Free delivery above ₹499.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/shop" className="bg-white text-primary-600 font-bold py-3 px-8 rounded-xl hover:bg-orange-50 transition-colors inline-flex items-center gap-2">
                  Shop Now <FiArrowRight />
                </Link>
                <Link to="/shop" className="border-2 border-white/60 text-white font-semibold py-3 px-8 rounded-xl hover:bg-white/10 transition-colors">
                  Browse Deals
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="text-primary-500" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
          {/* Categories */}
          {categories.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">Shop by Category</h2>
                <Link to="/shop" className="text-primary-500 text-sm font-medium hover:underline flex items-center gap-1">
                  View All <FiArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {categories.slice(0, 8).map(cat => (
                  <Link
                    key={cat._id}
                    to={`/shop/${cat.slug}`}
                    className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl hover:shadow-md transition-all group"
                  >
                    {cat.image?.url ? (
                      <img src={cat.image.url} alt={cat.name} className="w-12 h-12 object-cover rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                        {cat.icon || '🛍️'}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 text-center line-clamp-1 group-hover:text-primary-600">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Featured Products */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">⭐ Featured Products</h2>
              <Link to="/shop?featured=true" className="text-primary-500 text-sm font-medium hover:underline flex items-center gap-1">
                View All <FiArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {featuredProducts.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No featured products yet.</div>
            )}
          </section>

          {/* New Arrivals */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">🆕 New Arrivals</h2>
              <Link to="/shop?sort=-createdAt" className="text-primary-500 text-sm font-medium hover:underline flex items-center gap-1">
                View All <FiArrowRight size={14} />
              </Link>
            </div>
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {newArrivals.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* CTA Banner */}
          <section className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-3xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">📱 Install Eptomart App</h2>
            <p className="text-gray-300 mb-6">Add to Home Screen for a faster, app-like shopping experience!</p>
            <button
              onClick={() => {
                if (window.deferredPrompt) {
                  window.deferredPrompt.prompt();
                } else {
                  alert('To install: tap the browser menu and select "Add to Home Screen"');
                }
              }}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-8 rounded-xl transition-colors inline-flex items-center gap-2"
            >
              📲 Install Now — It's Free!
            </button>
          </section>
        </div>
      </main>

      {/* Recently Viewed — shows after user has browsed products */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <RecentlyViewed />
      </div>

      <Footer />
    </>
  );
}
