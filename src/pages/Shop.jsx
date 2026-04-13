// ============================================
// SHOP PAGE — Product Listing with Filters
// ============================================
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiFilter, FiChevronDown } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ProductCard from '../components/product/ProductCard';
import { ProductGridSkeleton } from '../components/common/Loader';
import api from '../utils/api';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-ratings.average', label: 'Top Rated' },
  { value: '-soldCount', label: 'Best Selling' },
];

export default function Shop() {
  const { category: categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    sort: searchParams.get('sort') || '-createdAt',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') || '',
  });
  const [categoryId, setCategoryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load categories
  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.categories || []));
  }, []);

  // Resolve category slug to ID
  useEffect(() => {
    if (categorySlug) {
      api.get(`/categories/${categorySlug}`)
        .then(res => setCategoryId(res.data.category?._id || ''))
        .catch(() => setCategoryId(''));
    } else {
      setCategoryId('');
    }
  }, [categorySlug]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: 12,
          sort: filters.sort,
          ...(categoryId && { category: categoryId }),
          ...(filters.minPrice && { minPrice: filters.minPrice }),
          ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
          ...(filters.inStock && { inStock: filters.inStock }),
          ...(searchParams.get('search') && { search: searchParams.get('search') }),
          ...(searchParams.get('featured') && { featured: 'true' }),
        });

        const { data } = await api.get(`/products?${params}`);
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId, filters, currentPage, searchParams]);

  const searchQuery = searchParams.get('search');
  const pageTitle = searchQuery ? `Search: "${searchQuery}"` : categorySlug ? categorySlug.replace(/-/g, ' ') : 'All Products';

  return (
    <>
      <Helmet>
        <title>{pageTitle} — Eptomart Shop</title>
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 capitalize">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{total} products found</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}
                className="input-field pr-8 appearance-none cursor-pointer text-sm py-2"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-1.5 btn-outline btn-sm"
            >
              <FiFilter size={15} /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-56 flex-shrink-0`}>
            <div className="card p-4 sticky top-20 space-y-5">
              <h3 className="font-semibold text-gray-800">Filters</h3>

              {/* Categories */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Category</p>
                <div className="space-y-1">
                  <button
                    onClick={() => window.location.href = '/shop'}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${!categorySlug ? 'bg-orange-100 text-primary-600 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    All Categories
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => window.location.href = `/shop/${cat.slug}`}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${categorySlug === cat.slug ? 'bg-orange-100 text-primary-600 font-medium' : 'hover:bg-gray-100'}`}
                    >
                      {cat.icon && <span className="mr-1.5">{cat.icon}</span>}{cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Price Range (₹)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                    className="input-field text-sm py-2"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    className="input-field text-sm py-2"
                  />
                </div>
              </div>

              {/* In Stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock === 'true'}
                  onChange={(e) => setFilters(f => ({ ...f, inStock: e.target.checked ? 'true' : '' }))}
                  className="accent-primary-500"
                />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>

              <button
                onClick={() => setFilters({ sort: '-createdAt', minPrice: '', maxPrice: '', inStock: '' })}
                className="w-full text-sm text-primary-500 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <ProductGridSkeleton count={12} />
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
                <p className="text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-semibold text-sm transition-colors
                          ${currentPage === page ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
