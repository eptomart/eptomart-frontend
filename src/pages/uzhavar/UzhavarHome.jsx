// ============================================
// UZHAVAR FRESH — Buyer Landing Page
// Compact native-mobile layout matching EptoFresh
// No Navbar/Footer — sticky gradient header
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EptoSEO from '../../components/common/EptoSEO';
import {
  FiMapPin, FiSearch, FiStar, FiChevronRight, FiX,
  FiZap, FiUsers, FiPackage, FiArrowLeft, FiChevronDown,
} from 'react-icons/fi';
import { FaLeaf, FaSeedling } from 'react-icons/fa';
import BottomNav from '../../components/common/BottomNav';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'vegetable', 'fruit', 'grain', 'herb', 'other'];
const CAT_COLORS = {
  All: '#16a34a', vegetable: '#16a34a', fruit: '#f97316',
  grain: '#d97706', herb: '#0d9488', other: '#6b7280',
};
const CAT_BG = {
  All: '#f0fdf4', vegetable: '#f0fdf4', fruit: '#fff4ee',
  grain: '#fffbeb', herb: '#f0fdfa', other: '#f3f4f6',
};

const DISTRICTS_TN = [
  'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli',
  'Tiruppur','Vellore','Erode','Thoothukudi','Dindigul','Thanjavur',
  'Ranipet','Sivaganga','Virudhunagar','Nagapattinam','Kanyakumari',
  'Krishnagiri','Dharmapuri','Perambalur','Ariyalur','Cuddalore',
  'Villupuram','Kallakurichi','Karur','Namakkal','Nilgiris','Pudukkottai',
  'Ramanathapuram','Tenkasi','Tirupattur','Tiruvannamalai',
  'Chengalpattu','Kancheepuram','Tiruvallur','Mayiladuthurai',
].sort();

export default function UzhavarHome() {
  const navigate = useNavigate();

  const [farmers,       setFarmers]      = useState([]);
  const [products,      setProducts]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [category,      setCategory]     = useState('All');
  const [pincode,       setPincode]      = useState('');
  const [district,      setDistrict]     = useState('');
  const [locationLabel, setLocationLabel]= useState('All Farmers');
  const [matchType,     setMatchType]    = useState('all');
  const [gpsActive,     setGpsActive]    = useState(false);
  const [locLoading,    setLocLoading]   = useState(false);
  const [showLocPanel,  setShowLocPanel] = useState(false);
  const pincodeRef = useRef(null);

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
      // silent
    } finally {
      setLoading(false);
    }
  };

  const tryAutoGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude, true),
      () => {},
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
      const mt = fRes.data.matchType || 'all';
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
      setMatchType(mt);
      setGpsActive(true);
      setShowLocPanel(false);
      if (mt === 'gps_exact')     { setLocationLabel('Near you');          if (!silent) toast.success('Showing farmers near you'); }
      else if (mt === 'gps_expanded') { setLocationLabel('Nearest farmers');  if (!silent) toast.success('Showing nearest farmers'); }
      else                        { setLocationLabel('All Farmers');        if (!silent) toast('No farmers nearby — showing all', { icon: 'ℹ️' }); }
    } catch {
      if (!silent) toast.error('Could not get location');
    } finally {
      setLocLoading(false);
    }
  };

  const handleDistrict = async (d) => {
    if (!d) { clearLocation(); return; }
    setDistrict(d);
    setLocLoading(true);
    try {
      const params = { district: d };
      const catParam = category !== 'All' ? { ...params, category } : params;
      const [fRes, pRes] = await Promise.all([
        api.get('/uzhavar/farmers/nearby', { params }),
        api.get('/uzhavar/products/search', { params: catParam }),
      ]);
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
      setMatchType(fRes.data.matchType || 'district');
      setGpsActive(true);
      setLocationLabel(d);
      setPincode('');
      setShowLocPanel(false);
      const count = fRes.data.farmers?.length || 0;
      if (count > 0) toast.success(`${count} farmer${count > 1 ? 's' : ''} in ${d}`);
      else toast('No farmers in this district yet', { icon: 'ℹ️' });
    } catch {
      toast.error('Search failed');
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
      const mt = fRes.data.matchType || 'all';
      setFarmers(fRes.data.farmers || []);
      setProducts(pRes.data.products || []);
      setMatchType(mt);
      setGpsActive(true);
      setDistrict('');
      setShowLocPanel(false);
      if (mt === 'pincode_exact')   setLocationLabel(`Pincode: ${pincode}`);
      else if (mt === 'pincode_zone') setLocationLabel(`Zone: ${pincode.slice(0, 3)}xxx`);
      else                          setLocationLabel('All Farmers');
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
    setDistrict('');
    setMatchType('all');
    loadAll();
  };

  const filteredProducts = category === 'All' ? products : products.filter(p => p.category === category);

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F5F4F2' }}>
      <EptoSEO app="uzhavar" page="home" />

      {/* ── Compact sticky green header ── */}
      <div className="sticky top-0 z-30 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #16a34a 100%)',
        boxShadow: '0 4px 24px rgba(22,163,74,0.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Category background image — faded right accent */}
        <img
          src="/categories/uzhavar.jpg"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-[45%] object-cover pointer-events-none select-none"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 100%)',
            opacity: 0.28,
          }}
        />
        <div className="px-4 pt-3 pb-5">

          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FiArrowLeft size={15} className="text-white" />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-white text-base font-extrabold tracking-tight leading-none">Farmer Fresh</h1>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(255,255,255,0.22)' }}>UZHAVAR</span>
                </div>
                <p className="text-green-100 text-[10px] mt-0.5 opacity-80">உழவர் சந்தை · Farm to Home · Direct</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/uzhavar/farmer')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl shrink-0 active:scale-90 transition"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              + Farmer?
            </button>
          </div>

          {/* Location pill */}
          <button
            onClick={() => setShowLocPanel(v => !v)}
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 w-full transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)' }}>
              {locLoading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FiMapPin size={11} className="text-white" />}
            </div>
            <span className="text-white text-xs font-semibold flex-1 text-left truncate opacity-95">
              {locationLabel}
              {gpsActive && <span className="ml-1 text-green-200 text-[10px]">· Tap to change</span>}
            </span>
            {gpsActive
              ? <button onClick={e => { e.stopPropagation(); clearLocation(); }}><FiX size={14} className="text-white opacity-70 shrink-0" /></button>
              : <FiChevronDown size={13} className="text-white opacity-70 shrink-0" />}
          </button>

          {/* Expandable location panel */}
          {showLocPanel && (
            <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <div className="p-3 space-y-2">
                {/* GPS button */}
                <button onClick={handleGPS} disabled={locLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#059669)' }}>
                  {locLoading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <FiMapPin size={14} />}
                  Use My Location (GPS)
                </button>
                {/* District */}
                <select
                  value={district}
                  onChange={e => handleDistrict(e.target.value)}
                  disabled={locLoading}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-green-400 bg-white disabled:opacity-50 appearance-none">
                  <option value="">📍 Select District</option>
                  {DISTRICTS_TN.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {/* Pincode */}
                <div className="flex gap-2">
                  <input
                    ref={pincodeRef}
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && handlePincode()}
                    placeholder="Enter 6-digit pincode"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                    style={{ fontSize: 16 }}
                  />
                  <button onClick={handlePincode} disabled={locLoading || pincode.length !== 6}
                    className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 transition active:scale-95">
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category pills — on white strip */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', paddingTop: 14, paddingBottom: 2 }}>
          <div className="flex gap-2 px-4 overflow-x-auto pb-3 scrollbar-hide">
            {CATEGORIES.map(c => {
              const active = category === c;
              const color  = CAT_COLORS[c] || '#16a34a';
              const bg     = CAT_BG[c] || '#f0fdf4';
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 text-[11px] font-bold transition-all active:scale-95 capitalize"
                  style={{
                    background: active ? color : bg,
                    color: active ? '#fff' : color,
                    boxShadow: active ? `0 4px 14px ${color}40` : '0 1px 4px rgba(0,0,0,0.06)',
                    border: active ? 'none' : `1px solid ${color}22`,
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-4" style={{ background: '#F5F4F2' }}>

        {/* Farmers section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-green-500 shrink-0" />
              <FiUsers size={15} className="text-green-600" /> Farmers
              {!loading && farmers.length > 0 && (
                <span className="text-xs font-semibold text-gray-400">({farmers.length})</span>
              )}
            </h2>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex-shrink-0 w-48 bg-white rounded-2xl p-4 animate-pulse"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="w-12 h-12 bg-gray-100 rounded-xl mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <FaSeedling size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-gray-500">No farmers registered yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Check back soon!</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {farmers.map(farmer => (
                <div key={farmer._id} className="flex-shrink-0 w-48">
                  <FarmerCard farmer={farmer} onClick={() => navigate(`/uzhavar/farmer/${farmer._id}`)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-lime-500 shrink-0" />
              <FaLeaf size={14} className="text-lime-600" /> Fresh Harvest
              {!loading && filteredProducts.length > 0 && (
                <span className="text-xs font-semibold text-gray-400">({filteredProducts.length})</span>
              )}
            </h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-3 animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="w-full h-24 bg-gray-100 rounded-xl mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <FaLeaf size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-gray-500">No products yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Farmers will add harvest soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.map(prod => (
                <ProductCard key={prod._id} product={prod}
                  onClick={() => navigate(`/uzhavar/farmer/${prod.farmer?._id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { Icon: FaLeaf,    color: '#16a34a', title: 'Farm Fresh',    desc: 'Harvested today' },
            { Icon: FiZap,     color: '#f59e0b', title: 'Fast Delivery', desc: 'Same day' },
            { Icon: FiUsers,   color: '#3b82f6', title: 'Direct Farmer', desc: 'No middlemen' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                style={{ background: `${item.color}16` }}>
                <item.Icon size={17} style={{ color: item.color }} />
              </div>
              <p className="font-semibold text-xs text-gray-700">{item.title}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Subscription CTA */}
        <div className="mb-6 rounded-2xl p-5 text-white text-center"
          style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)' }}>
          <p className="font-bold text-sm mb-0.5 flex items-center justify-center gap-1.5">
            <FiPackage size={14} /> Farmer Fresh Subscription
          </p>
          <p className="text-green-100 text-xs mb-3">Unlimited fresh orders · No booking fee</p>
          <div className="flex gap-2 justify-center text-xs font-semibold mb-3">
            <span className="bg-white/20 rounded-lg px-3 py-1.5">₹299 / month</span>
            <span className="bg-white/20 rounded-lg px-3 py-1.5">₹499 / 3 months</span>
          </div>
          <button onClick={() => navigate('/uzhavar/subscribe')}
            className="bg-white text-green-700 font-bold px-5 py-2 rounded-xl text-xs active:scale-95 transition">
            Subscribe Now →
          </button>
        </div>

        {/* Farmer CTA */}
        <div className="mb-6 rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: 'linear-gradient(135deg,#14532d,#065f46)' }}>
          <div>
            <p className="text-white font-black text-sm flex items-center gap-2">
              <FaSeedling size={15} /> Are you a farmer?
            </p>
            <p className="text-green-100 text-xs mt-1">List your harvest · Sell directly to buyers · No middlemen</p>
            <p className="text-green-300 text-[10px] mt-0.5">நீங்கள் உழவரா? இப்போதே பதிவு செய்யுங்கள்</p>
          </div>
          <button onClick={() => navigate('/uzhavar/farmer')}
            className="self-start bg-white text-green-700 font-black text-sm px-5 py-2.5 rounded-xl active:scale-95 transition">
            Register as Farmer →
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function FarmerCard({ farmer, onClick }) {
  const avg = farmer.ratings?.average || 0;
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl p-4 active:scale-[0.98] transition"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <FiUsers size={22} className="text-green-600" />
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${farmer.availableNow ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {farmer.availableNow ? '● Live' : '○ Scheduled'}
        </span>
      </div>
      <p className="font-bold text-gray-800 text-sm leading-tight">{farmer.name}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {farmer.address?.village ? `${farmer.address.village}, ` : ''}{farmer.address?.district}
      </p>
      {avg > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <FiStar size={10} className="text-amber-400" style={{ fill: '#fbbf24', stroke: '#fbbf24' }} />
          <span className="text-xs text-gray-600">{avg.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({farmer.ratings?.count})</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
          <FiMapPin size={10} /> {farmer.deliveryRadius}km
        </span>
        <FiChevronRight size={13} className="text-gray-300" />
      </div>
    </button>
  );
}

function ProductCard({ product, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl overflow-hidden active:scale-[0.98] transition"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
      {product.image
        ? <img src={product.image} alt={product.name} className="w-full h-20 object-cover" />
        : <div className="w-full h-20 bg-green-50 flex items-center justify-center">
            <FaLeaf size={24} className="text-green-300" />
          </div>}
      <div className="p-2">
        <p className="font-semibold text-xs text-gray-800 line-clamp-1">{product.name}</p>
        {product.nameTa && <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">{product.nameTa}</p>}
        <p className="font-bold text-green-600 text-xs mt-1">₹{product.pricePerUnit}/{product.unit}</p>
        <p className="text-[10px] text-gray-400 truncate">{product.farmer?.name}</p>
      </div>
    </button>
  );
}
