// ============================================
// UZHAVAR FRESH — Buyer Landing Page
// GPS detect → pincode fallback → farmer list
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiMapPin, FiSearch, FiStar, FiChevronRight, FiFilter } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'vegetable', 'fruit', 'grain', 'herb', 'other'];

export default function UzhavarHome() {
  const navigate = useNavigate();
  const [step, setStep] = useState('location'); // location | results
  const [locLoading, setLocLoading] = useState(false);
  const [pincode, setPincode]       = useState('');
  const [coords, setCoords]         = useState(null);
  const [farmers, setFarmers]       = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [category, setCategory]     = useState('All');
  const [radius, setRadius]         = useState(10);
  const [tab, setTab]               = useState('farmers'); // farmers | products

  // Auto GPS detect
  const detectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported. Enter pincode.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        fetchNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocLoading(false);
        toast.error('Could not get location. Enter pincode.');
      },
      { timeout: 10000 }
    );
  };

  const fetchNearby = async ({ lat, lng, pin, rad = radius }) => {
    setLoading(true);
    try {
      const params = lat
        ? { lat, lng, radius: rad }
        : { pincode: pin, radius: rad };

      const catParam = category !== 'All' ? { ...params, category } : params;

      const [farmersRes, productsRes] = await Promise.all([
        api.get('/uzhavar/farmers/nearby', { params }),
        api.get('/uzhavar/products/search', { params: catParam }),
      ]);
      setFarmers(farmersRes.data.farmers || []);
      setProducts(productsRes.data.products || []);
      setStep('results');
    } catch {
      toast.error('Failed to load farmers. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeSearch = () => {
    if (pincode.length !== 6) { toast.error('Enter valid 6-digit pincode'); return; }
    fetchNearby({ pin: pincode });
  };

  const filteredProducts = category === 'All'
    ? products
    : products.filter(p => p.category === category);

  return (
    <>
      <Helmet>
        <title>Uzhavar Fresh — Farm to Home | Eptomart</title>
        <meta name="description" content="Buy fresh vegetables and fruits directly from farmers near you. Same-day delivery." />
      </Helmet>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-800 via-green-700 to-lime-600 text-white px-4 pt-10 pb-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/icons/icon-192x192.png')] bg-repeat" />
          <div className="relative">
            <div className="text-5xl mb-3">🌾</div>
            <h1 className="text-3xl font-black tracking-tight mb-1">UZHAVAR FRESH</h1>
            <p className="text-green-100 text-sm">உழவர் சந்தை · Farm to Home</p>
            <p className="text-green-200 text-xs mt-2">Buy directly from farmers near you</p>
          </div>
        </div>

        {/* Location card — overlaps hero */}
        <div className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-5">
            {step === 'location' ? (
              <>
                <h2 className="font-bold text-gray-800 text-center mb-4">Find farmers near you</h2>

                <button onClick={detectGPS} disabled={locLoading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl mb-3 transition-colors disabled:opacity-60">
                  <FiMapPin size={16} />
                  {locLoading ? 'Detecting location...' : 'Use my current location'}
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex gap-2">
                  <input
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter pincode"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
                    onKeyDown={e => e.key === 'Enter' && handlePincodeSearch()}
                  />
                  <button onClick={handlePincodeSearch}
                    className="bg-green-600 text-white px-4 rounded-xl hover:bg-green-700 transition-colors">
                    <FiSearch size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiMapPin size={14} className="text-green-600" />
                  <span>{coords ? `Near you · ${radius}km` : `Pincode: ${pincode}`}</span>
                </div>
                <button onClick={() => setStep('location')}
                  className="text-xs text-green-600 font-semibold underline">Change</button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {step === 'results' && (
          <div className="max-w-5xl mx-auto px-4 mt-6 pb-12">
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3 animate-bounce">🌱</div>
                <p>Finding farmers near you...</p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setTab('farmers')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'farmers' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    🧑‍🌾 Farmers ({farmers.length})
                  </button>
                  <button onClick={() => setTab('products')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'products' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    🥬 Products ({products.length})
                  </button>
                </div>

                {/* Category filter (products tab) */}
                {tab === 'products' && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCategory(c)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${category === c ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Farmers list */}
                {tab === 'farmers' && (
                  farmers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">🌾</div>
                      <p>No farmers found nearby. Try increasing radius.</p>
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

                {/* Products list */}
                {tab === 'products' && (
                  filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">🥕</div>
                      <p>No products found. Try different category.</p>
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
        )}

        {/* Info strip */}
        {step === 'location' && (
          <div className="max-w-lg mx-auto px-4 mt-6 pb-12">
            <div className="grid grid-cols-3 gap-3 text-center">
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

            {/* Subscription CTA */}
            <div className="mt-4 bg-gradient-to-r from-green-600 to-lime-500 rounded-2xl p-5 text-white text-center">
              <p className="font-bold text-sm mb-0.5">📦 Uzhavar Fresh Subscription</p>
              <p className="text-green-100 text-xs mb-3">Unlimited fresh orders · No booking fee per order</p>
              <div className="flex gap-2 justify-center text-xs font-semibold">
                <span className="bg-white/20 rounded-lg px-3 py-1.5">₹299 / month</span>
                <span className="bg-white/20 rounded-lg px-3 py-1.5">₹499 / 3 months</span>
              </div>
              <button onClick={() => navigate('/uzhavar/subscribe')}
                className="mt-3 bg-white text-green-700 font-bold px-5 py-2 rounded-xl text-xs hover:bg-green-50 transition-colors">
                Subscribe Now →
              </button>
            </div>
          </div>
        )}
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
          {farmer.availableNow ? '● Available' : '○ Scheduled'}
        </span>
      </div>
      <h3 className="font-bold text-gray-800 text-sm">{farmer.name}</h3>
      <p className="text-xs text-gray-500">{farmer.address?.village}, {farmer.address?.district}</p>
      <div className="flex items-center gap-1 mt-1">
        {avg > 0 && (
          <>
            <FiStar size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-600">{avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({farmer.ratings?.count})</span>
          </>
        )}
      </div>
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
      {product.nameTa && <p className="text-xs text-gray-400">{product.nameTa}</p>}
      <p className="font-bold text-green-600 text-sm mt-1">₹{product.pricePerUnit}/{product.unit}</p>
      <p className="text-xs text-gray-400">{product.farmer?.name}</p>
    </div>
  );
}
