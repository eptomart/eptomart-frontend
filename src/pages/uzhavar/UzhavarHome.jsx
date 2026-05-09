// ============================================
// UZHAVAR FRESH — Buyer Landing Page
// Loads all farmers immediately, GPS refines list
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiMapPin, FiSearch, FiStar, FiChevronRight, FiX } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'vegetable', 'fruit', 'grain', 'herb', 'other'];

export default function UzhavarHome() {
  const navigate = useNavigate();
  const [farmers,    setFarmers]    = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [category,   setCategory]   = useState('All');
  const [tab,        setTab]        = useState('farmers');
  const [pincode,    setPincode]    = useState('');
  const [locationLabel, setLocationLabel] = useState('All Farmers');
  const [gpsActive,  setGpsActive]  = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const pincodeRef = useRef(null);

  // On mount: load ALL farmers immediately + try GPS silently
  useEffect(() => {
    loadAll();
    tryAutoGPS();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        api.get('/uzhavar/farmers/all'),
        api.get('/uzhavar/products/search'),
      ]);
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  };

  const tryAutoGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetchByCoords(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {}, // silent fail — user can click manually
      { timeout: 8000 }
    );
  };

  const fetchByCoords = async (lat, lng, silent = false) => {
    if (!silent) setLocLoading(true);
    try {
      const params = { lat, lng, radius: 25 };
      const catParam = category !== 'All' ? { ...params, category } : params;
      const [fRes, pRes] = await Promise.all([
        api.get('/uzhavar/farmers/nearby', { params }),
        api.get('/uzhavar/products/search', { params: catParam }),
      ]);
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
      setGpsActive(true);
      setLocationLabel('Near you');
      if (!silent) toast.success('Showing farmers near you');
    } catch {
      if (!silent) toast.error('Could not get nearby farmers');
    } finally {
      setLocLoading(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      () => { setLocLoading(false); toast.error('Could not get location'); },
      { timeout: 10000 }
    );
  };

  const handlePincode = async () => {
    if (pincode.length !== 6) { toast.error('Enter valid 6-digit pincode'); return; }
    setLocLoading(true);
    try {
      const params = { pincode, radius: 25 };
      const catParam = category !== 'All' ? { ...params, category } : params;
      const [fRes, pRes] = await Promise.all([
        api.get('/uzhavar/farmers/nearby', { params }),
        api.get('/uzhavar/products/search', { params: catParam }),
      ]);
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
      setGpsActive(true);
      setLocationLabel(`Pincode: ${pincode}`);
    } catch {
      toast.error('Search failed');
    } finally {
      setLocLoading(false);
    }
  };

  const clearLocation = () => {
    setGpsActive(false);
    setLocationLabel('All Farmers');
    setPincode('');
    loadAll();
  };

  const filteredProducts = category === 'All' ? products : products.filter(p => p.category === category);

  return (
    <>
      <Helmet>
        <title>Uzhavar Fresh — Farm to Home | Eptomart</title>
        <meta name="description" content="Buy fresh vegetables and fruits directly from farmers near you. Same-day delivery." />
      </Helmet>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-800 via-green-700 to-lime-600 text-white px-4 pt-8 pb-14 text-center relative overflow-hidden">
          <div className="relative">
            <div className="text-4xl mb-2">🌾</div>
            <h1 className="text-2xl font-black tracking-tight mb-0.5">UZHAVAR FRESH</h1>
            <p className="text-green-100 text-xs">உழவர் சந்தை · Farm to Home · Direct from Farmers</p>
          </div>
        </div>

        {/* Location filter bar — overlaps hero */}
        <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 mb-4">
          <div className="bg-white rounded-2xl shadow-lg p-3 flex items-center gap-2">
            {/* Current location label */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <FiMapPin size={14} className={gpsActive ? 'text-green-600' : 'text-gray-400'} />
              <span className="text-xs font-semibold text-gray-700 truncate">{locationLabel}</span>
              {gpsActive && (
                <button onClick={clearLocation} className="ml-1 text-gray-400 hover:text-red-400 flex-shrink-0">
                  <FiX size={12} />
                </button>
              )}
            </div>

            {/* Pincode input */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                ref={pincodeRef}
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g,'').slice(0,6))}
                onKeyDown={e => e.key === 'Enter' && handlePincode()}
                placeholder="Pincode"
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-green-400"
              />
              <button onClick={handlePincode} disabled={locLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors">
                Go
              </button>
            </div>

            {/* GPS button */}
            <button onClick={handleGPS} disabled={locLoading}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex-shrink-0 disabled:opacity-60 transition-colors">
              {locLoading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FiMapPin size={12} />}
              {locLoading ? '' : 'Near Me'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 mb-3">
          <div className="flex gap-2">
            <button onClick={() => setTab('farmers')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'farmers' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              🧑‍🌾 Farmers {!loading && `(${farmers.length})`}
            </button>
            <button onClick={() => setTab('products')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'products' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              🥬 Products {!loading && `(${products.length})`}
            </button>
          </div>
        </div>

        {/* Category filter (products tab) */}
        {tab === 'products' && (
          <div className="max-w-5xl mx-auto px-4 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${category === c ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3 animate-bounce">🌱</div>
              <p>Loading farmers...</p>
            </div>
          ) : (
            <>
              {/* Farmers grid */}
              {tab === 'farmers' && (
                farmers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white rounded-2xl shadow-sm">
                    <div className="text-4xl mb-3">🌾</div>
                    <p className="font-semibold">No farmers registered yet</p>
                    <p className="text-xs mt-1">Check back soon — farmers are joining!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {farmers.map(farmer => (
                      <FarmerCard key={farmer._id} farmer={farmer}
                        onClick={() => navigate(`/uzhavar/farmer/${farmer._id}`)} />
                    ))}
                  </div>
                )
              )}

              {/* Products grid */}
              {tab === 'products' && (
                filteredProducts.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white rounded-2xl shadow-sm">
                    <div className="text-4xl mb-3">🥕</div>
                    <p className="font-semibold">No products listed yet</p>
                    <p className="text-xs mt-1">Farmers will add harvest soon!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map(prod => (
                      <ProductCard key={prod._id} product={prod}
                        onClick={() => navigate(`/uzhavar/farmer/${prod.farmer?._id}`)} />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Info strip */}
        <div className="max-w-lg mx-auto px-4 pb-6">
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            {[
              { icon: '🌿', title: 'Farm Fresh', desc: 'Harvested today' },
              { icon: '⚡', title: 'Fast Delivery', desc: 'Same day / scheduled' },
              { icon: '🤝', title: 'Direct Farmer', desc: 'No middlemen' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="font-semibold text-xs text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-green-600 to-lime-500 rounded-2xl p-5 text-white text-center">
            <p className="font-bold text-sm mb-0.5">📦 Uzhavar Fresh Subscription</p>
            <p className="text-green-100 text-xs mb-3">Unlimited fresh orders · No booking fee per order</p>
            <div className="flex gap-2 justify-center text-xs font-semibold mb-3">
              <span className="bg-white/20 rounded-lg px-3 py-1.5">₹299 / month</span>
              <span className="bg-white/20 rounded-lg px-3 py-1.5">₹499 / 3 months</span>
            </div>
            <button onClick={() => navigate('/uzhavar/subscribe')}
              className="bg-white text-green-700 font-bold px-5 py-2 rounded-xl text-xs hover:bg-green-50 transition-colors">
              Subscribe Now →
            </button>
          </div>
        </div>

        {/* Are you a farmer? */}
        <div className="max-w-4xl mx-auto px-4 py-4 pb-10">
          <div className="bg-gradient-to-r from-green-700 to-lime-600 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-white font-black text-base">🌾 Are you a farmer?</p>
              <p className="text-green-100 text-xs mt-0.5">List your harvest and sell directly to buyers near you — no middlemen</p>
              <p className="text-green-200 text-[10px]">நீங்கள் உழவரா? இப்போதே பதிவு செய்யுங்கள்</p>
            </div>
            <button onClick={() => navigate('/uzhavar/farmer')}
              className="flex-shrink-0 bg-white text-green-700 font-black text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors">
              Register as Farmer →
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function FarmerCard({ farmer, onClick }) {
  const avg = farmer.ratings?.average || 0;
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-green-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🧑‍🌾</div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${farmer.availableNow ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {farmer.availableNow ? '● Live' : '○ Scheduled'}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm">{farmer.name}</h3>
      <p className="text-xs text-gray-500">{farmer.address?.village ? `${farmer.address.village}, ` : ''}{farmer.address?.district}</p>
      {avg > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <FiStar size={10} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-600">{avg.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({farmer.ratings?.count})</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-green-600 font-medium">📍 {farmer.deliveryRadius}km delivery</span>
        <FiChevronRight size={14} className="text-gray-400" />
      </div>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:border-green-200 transition-all">
      {product.image
        ? <img src={product.image} alt={product.name} className="w-full h-24 object-cover rounded-xl mb-2 bg-gray-100" />
        : <div className="w-full h-24 rounded-xl bg-green-50 flex items-center justify-center text-3xl mb-2">🥬</div>
      }
      <p className="font-semibold text-xs text-gray-800 line-clamp-1">{product.name}</p>
      {product.nameTa && <p className="text-xs text-gray-400 line-clamp-1">{product.nameTa}</p>}
      <p className="font-bold text-green-600 text-sm mt-1">₹{product.pricePerUnit}/{product.unit}</p>
      <p className="text-xs text-gray-400 truncate">{product.farmer?.name}</p>
    </div>
  );
}
