// ============================================
// NAVBAR — Top Navigation Bar
// ============================================
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiUser, FiMenu, FiX, FiLogOut, FiPackage, FiSettings, FiHeart } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import api from '../../utils/api';

export default function Navbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef();
  const searchTimeout = useRef();

  // Live search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/products/search?q=${searchQuery}&limit=6`);
        setSearchResults(data.products || []);
      } catch (_) {}
    }, 300);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm safe-top">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16 gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-xl text-gray-800 hidden sm:block">
              Epto<span className="text-primary-500">mart</span>
            </span>
          </Link>

          {/* Search Bar — Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-6 relative">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 pr-4"
              />
              {/* Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl mt-1 border z-50 overflow-hidden">
                  {searchResults.map(product => (
                    <Link
                      key={product._id}
                      to={`/product/${product.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    >
                      <img src={product.images?.[0]?.url} alt={product.name} className="w-10 h-10 object-cover rounded-lg" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-primary-600 font-semibold">₹{(product.discountPrice || product.price)?.toLocaleString('en-IN')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {/* Mobile Search Toggle */}
            <button onClick={() => setShowSearch(!showSearch)} className="md:hidden p-2 rounded-xl hover:bg-gray-100">
              <FiSearch size={22} />
            </button>

            {/* Wishlist */}
            {isLoggedIn && (
              <button onClick={() => navigate('/wishlist')} className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors hidden sm:flex">
                <FiHeart size={22} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart */}
            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <FiShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 bg-white shadow-xl rounded-2xl p-2 w-52 border z-50">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm" onClick={() => setShowUserMenu(false)}>
                      <FiUser size={16} /> My Profile
                    </Link>
                    <Link to="/orders" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm" onClick={() => setShowUserMenu(false)}>
                      <FiPackage size={16} /> My Orders
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm" onClick={() => setShowUserMenu(false)}>
                      <FiHeart size={16} /> My Wishlist
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-sm text-primary-600 font-medium" onClick={() => setShowUserMenu(false)}>
                        <FiSettings size={16} /> Admin Panel
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-sm text-red-500">
                      <FiLogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary btn-sm">Login</Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <form onSubmit={handleSearch} className="pb-3 md:hidden">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="input-field pl-10 pr-4"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="bg-white shadow-xl rounded-xl mt-1 border overflow-hidden">
                {searchResults.map(product => (
                  <Link
                    key={product._id}
                    to={`/product/${product.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                  >
                    <img src={product.images?.[0]?.url} alt={product.name} className="w-10 h-10 object-cover rounded-lg" />
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{product.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </form>
        )}
      </div>
    </header>
  );
}
