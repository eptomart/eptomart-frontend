// ============================================
// SELLER STORE PAGE — Public seller profile with products
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiStar, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ProductCard from '../components/product/ProductCard';
import { ProductGridSkeleton } from '../components/common/Loader';
import { formatINR, formatNumber } from '../utils/currency';
import api from '../utils/api';

export default function SellerStore() {
  const { sellerId } = useParams();

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchStoreData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/sellers/${sellerId}/store?page=${currentPage}&limit=20`);
        setSeller(data.seller);
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error('Failed to load seller store:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchStoreData();
      window.scrollTo(0, 0);
    }
  }, [sellerId, currentPage]);

  if (loading) return <><Navbar /><div className="min-h-screen flex items-center justify-center"><ProductGridSkeleton count={12} /></div></>;

  if (!seller) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-4xl mb-3">🏪</p>
          <h3 className="text-lg font-semibold text-gray-600">Seller not found</h3>
          <p className="text-gray-400 mb-6">This seller store is no longer available</p>
          <Link to="/shop" className="btn-primary">Back to Shop</Link>
        </div>
        <Footer />
      </>
    );
  }

  const {
    businessName = 'Seller',
    displayName = businessName,
    description = '',
    logo = '',
    contact = {},
    rating = 0,
  } = seller;

  return (
    <>
      <Helmet>
        <title>{businessName} Store — Eptomart</title>
        <meta name="description" content={description || `Shop at ${businessName} on Eptomart`} />
        <meta property="og:title" content={`${businessName} Store — Eptomart`} />
        <meta property="og:description" content={description || `Shop products from ${businessName}`} />
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link to="/shop" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 font-medium mb-6 transition-colors group">
          <FiArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Shop
        </Link>

        {/* Seller Banner */}
        <div className="card p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Logo */}
          {logo && (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
              <img
                src={logo}
                alt={businessName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Seller Info */}
          <div className="flex-1">
            <div className="flex flex-col gap-2 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-sm text-gray-500">{businessName}</p>
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-lg">
                  <span className="text-lg font-bold">{rating.toFixed(1)}</span>
                  <FiStar size={16} style={{ fill: 'white' }} />
                </div>
                <span className="text-sm text-gray-600">{total} products</span>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4 max-w-2xl">{description}</p>
            )}

            {/* Contact Info */}
            {contact?.city && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiMapPin size={14} />
                {contact.city}{contact.state ? `, ${contact.state}` : ''}{contact.country ? `, ${contact.country}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Products from {displayName}</h2>
            <p className="text-sm text-gray-500 mt-1">{total} products available</p>
          </div>

          {loading ? (
            <ProductGridSkeleton count={20} />
          ) : products.length === 0 ? (
            <div className="text-center py-16 card">
              <p className="text-4xl mb-3">📦</p>
              <h3 className="text-lg font-semibold text-gray-600">No products yet</h3>
              <p className="text-gray-400">This seller hasn't listed any products yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                {products.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8 flex-wrap">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-semibold text-sm transition-colors
                        ${currentPage === page ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
