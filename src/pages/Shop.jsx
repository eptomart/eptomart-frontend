// ============================================
// SHOP PAGE — Product Listing with Filters
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiFilter, FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import ProductCard from '../components/product/ProductCard';
import { ProductGridSkeleton } from '../components/common/Loader';
import api from '../utils/api';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price',      label: 'Price: Low to High' },
  { value: '-price',     label: 'Price: High to Low' },
  { value: '-ratings.average', label: 'Top Rated' },
  { value: '-soldCount', label: 'Best Selling' },
];

export default function Shop() {
  const { category: categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,     setProducts]     = useState([]);
  const [allCategories,setAllCategories]= useState([]);   // all (parent + sub)
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [categoryId,   setCategoryId]   = useState('');
  const [activeCat,    setActiveCat]    = useState(null); // full category object
  const [showFilters,  setShowFilters]  = useState(false);

  const subCatFilter = searchParams.get('sub') || '';

  const [filters, setFilters] = useState({
    sort:     searchParams.get('sort')     || '-createdAt',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock:  searchParams.get('inStock')  || '',
  });

  // Split into parents and children
  const parentCategories = useMemo(() => allCategories.filter(c => !c.parentCategory), [allCategories]);
  const subCategories    = useMemo(() => allCategories.filter(c => !!c.parentCategory), [allCategories]);

  // Subcategories for the currently selected parent
  const activeSubCategories = useMemo(() => {
    if (!categoryId) return [];
    return subCategories.filter(s => {
      const pid = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
      return pid?.toString() === categoryId;
    });
  }, [subCategories, categoryId]);

  // Load only Eptomart (non-perishable) categories — perishable live in Koyambedu/Uzhavar
  useEffect(() => {
    api.get('/categories?all=true&moduleType=eptomart')
      .then(res => setAllCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  // Resolve category slug → ID + object
  useEffect(() => {
    if (categorySlug) {
      api.get(`/categories/${categorySlug}`)
        .then(res => {
          setCategoryId(res.data.category?._id || '');
          setActiveCat(res.data.category || null);
        })
        .catch(() => { setCategoryId(''); setActiveCat(null); });
    } else {
      setCategoryId('');
      setActiveCat(null);
    }
  }, [categorySlug]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page:  currentPage,
          limit: 12,
          sort:  filters.sort,
          ...(subCatFilter ? { subCategory: subCatFilter } : categoryId ? { category: categoryId } : {}),
          ...(filters.minPrice && { minPrice: filters.minPrice }),
          ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
          ...(filters.inStock  && { inStock:  filters.inStock }),
          ...(searchParams.get('search') && { search: searchParams.get('search') }),
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
  }, [categoryId, subCatFilter, filters, currentPage, searchParams]);

  const searchQuery = searchParams.get('search');
  const activeSubName = subCatFilter
    ? subCategories.find(s => s._id === subCatFilter)?.name
    : null;
  const pageTitle = searchQuery
    ? `Search: "${searchQuery}"`
    : activeSubName
    ? activeSubName
    : activeCat?.name || 'All Products';

  const setSubFilter = (subId) => {
    const next = new URLSearchParams(searchParams);
    if (subId) next.set('sub', subId);
    else next.delete('sub');
    setSearchParams(next);
    setCurrentPage(1);
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} — Buy Online at Eptomart | India</title>
        <meta name="description" content={activeCat ? `Shop ${activeCat} online on Eptomart — trusted sellers, fast pan-India delivery, GST invoices. Browse ${activeCat} products at best prices.` : `Browse thousands of products across all categories on Eptomart. Electronics, fashion, groceries, fresh produce & more. Fast delivery across India.`} />
        <meta name="robots" content="index, follow, max-snippet:-1" />
        <link rel="canonical" href={activeCat ? `https://www.eptomart.com/shop?category=${activeCat}` : "https://www.eptomart.com/shop"} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.eptomart.com/" },
            { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://www.eptomart.com/shop" },
            ...(activeCat ? [{ "@type": "ListItem", "position": 3, "name": activeCat, "item": `https://www.eptomart.com/shop?category=${activeCat}` }] : [])
          ]
        })}</script>
      </Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
        {/* Breadcrumb */}
        {(activeCat || activeSubName) && (
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 flex-wrap">
            <Link to="/" className="hover:text-primary-500">Home</Link>
            <FiChevronRight size={13} />
            <Link to="/shop" className="hover:text-primary-500">Shop</Link>
            {activeCat && (
              <>
                <FiChevronRight size={13} />
                <Link to={`/shop/${activeCat.slug}`} className="hover:text-primary-500">{activeCat.name}</Link>
              </>
            )}
            {activeSubName && (
              <>
                <FiChevronRight size={13} />
                <span className="text-gray-700 font-medium">{activeSubName}</span>
              </>
            )}
          </nav>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-8 rounded-full bg-primary-500 hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold text-gray-800 capitalize">{pageTitle}</h1>
              <p className="text-sm text-gray-500">{total} product{total !== 1 ? 's' : ''} found</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={filters.sort}
                onChange={e => { setFilters(f => ({ ...f, sort: e.target.value })); setCurrentPage(1); }}
                className="input-field pr-8 appearance-none cursor-pointer text-sm py-2"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-1.5 btn-outline btn-sm"
            >
              <FiFilter size={15} /> Filters
            </button>
          </div>
        </div>

        {/* Subcategory chips — shown when a parent category has children */}
        {activeSubCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setSubFilter('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${!subCatFilter ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
            >
              {activeCat?.icon && <span className="mr-1">{activeCat.icon}</span>}
              All {activeCat?.name}
            </button>
            {activeSubCategories.map(sub => (
              <button
                key={sub._id}
                onClick={() => setSubFilter(sub._id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${subCatFilter === sub._id ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}
              >
                {sub.icon && <span className="mr-1">{sub.icon}</span>}
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-56 flex-shrink-0`}>
            <div className="card p-4 sticky top-20 space-y-5">
              <h3 className="font-semibold text-gray-800">Filters</h3>

              {/* Categories */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Category</p>
                <div className="space-y-0.5">
                  <Link
                    to="/shop"
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center
                      ${!categorySlug ? 'bg-orange-100 text-primary-600 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    All Categories
                  </Link>
                  {parentCategories.map(cat => {
                    const isActive = categorySlug === cat.slug;
                    const catSubs = subCategories.filter(s => {
                      const pid = typeof s.parentCategory === 'object' ? s.parentCategory?._id : s.parentCategory;
                      return pid?.toString() === cat._id;
                    });
                    return (
                      <div key={cat._id}>
                        <Link
                          to={`/shop/${cat.slug}`}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between
                            ${isActive ? 'bg-orange-100 text-primary-600 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                          <span>
                            {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                            {cat.name}
                          </span>
                          {catSubs.length > 0 && (
                            <span className="text-xs text-gray-400">{catSubs.length}</span>
                          )}
                        </Link>

                        {/* Show subcategories inline when this parent is active */}
                        {isActive && catSubs.length > 0 && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-orange-200 pl-2">
                            {catSubs.map(sub => (
                              <button
                                key={sub._id}
                                onClick={() => setSubFilter(subCatFilter === sub._id ? '' : sub._id)}
                                className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors
                                  ${subCatFilter === sub._id ? 'bg-orange-100 text-primary-600 font-semibold' : 'hover:bg-gray-100 text-gray-600'}`}
                              >
                                {sub.icon && <span className="mr-1">{sub.icon}</span>}
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Price Range (₹)</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={filters.minPrice}
                    onChange={e => { setFilters(f => ({ ...f, minPrice: e.target.value })); setCurrentPage(1); }}
                    className="input-field text-sm py-2" />
                  <input type="number" placeholder="Max" value={filters.maxPrice}
                    onChange={e => { setFilters(f => ({ ...f, maxPrice: e.target.value })); setCurrentPage(1); }}
                    className="input-field text-sm py-2" />
                </div>
              </div>

              {/* In Stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.inStock === 'true'}
                  onChange={e => { setFilters(f => ({ ...f, inStock: e.target.checked ? 'true' : '' })); setCurrentPage(1); }}
                  className="accent-primary-500" />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>

              <button
                onClick={() => { setFilters({ sort: '-createdAt', minPrice: '', maxPrice: '', inStock: '' }); setSubFilter(''); setCurrentPage(1); }}
                className="w-full text-sm text-primary-500 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Active filter pills */}
            {(subCatFilter || filters.minPrice || filters.maxPrice || filters.inStock) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {subCatFilter && (
                  <span className="inline-flex items-center gap-1 bg-orange-100 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {activeSubCategories.find(s => s._id === subCatFilter)?.name || 'Sub-category'}
                    <button onClick={() => setSubFilter('')}><FiX size={11} /></button>
                  </span>
                )}
                {filters.minPrice && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    Min ₹{filters.minPrice}
                    <button onClick={() => setFilters(f => ({ ...f, minPrice: '' }))}><FiX size={11} /></button>
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    Max ₹{filters.maxPrice}
                    <button onClick={() => setFilters(f => ({ ...f, maxPrice: '' }))}><FiX size={11} /></button>
                  </span>
                )}
                {filters.inStock && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    In Stock
                    <button onClick={() => setFilters(f => ({ ...f, inStock: '' }))}><FiX size={11} /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <ProductGridSkeleton count={12} />
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-5xl mb-3">🔍</p>
                <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                <p className="text-gray-400 text-sm mb-4">Try adjusting your filters or search</p>
                <button
                  onClick={() => { setFilters({ sort: '-createdAt', minPrice: '', maxPrice: '', inStock: '' }); setSubFilter(''); setCurrentPage(1); }}
                  className="btn-primary btn-sm">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 mt-8 flex-wrap">
                    <button
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="h-10 px-3 rounded-xl font-semibold text-sm bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .reduce((acc, page, i, arr) => {
                        if (i > 0 && page - arr[i - 1] > 1) acc.push('…');
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((page, i) => page === '…'
                        ? <span key={`dots-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                        : (
                          <button key={page}
                            onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all
                              ${currentPage === page
                                ? 'bg-primary-500 text-white shadow-md shadow-orange-200'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'}`}>
                            {page}
                          </button>
                        ))}
                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                      className="h-10 px-3 rounded-xl font-semibold text-sm bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Next →
                    </button>
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
