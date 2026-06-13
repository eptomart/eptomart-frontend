// ============================================
// KOYAMBEDU LOCATION PICKER
// Search-based — uses backend Places proxy
// No Google Maps JS SDK needed
// Guest-accessible — no login required
// ============================================
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX, FiChevronRight, FiCheck } from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// Popular Chennai delivery areas with known coordinates
const POPULAR_AREAS = [
  { name: 'Anna Nagar',        lat: 13.0850, lng: 80.2101 },
  { name: 'T. Nagar',          lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery',         lat: 12.9815, lng: 80.2180 },
  { name: 'Adyar',             lat: 13.0012, lng: 80.2565 },
  { name: 'Porur',             lat: 13.0358, lng: 80.1572 },
  { name: 'Tambaram',          lat: 12.9249, lng: 80.1000 },
  { name: 'Perambur',          lat: 13.1152, lng: 80.2452 },
  { name: 'Mogappair',         lat: 13.0827, lng: 80.1700 },
  { name: 'Chromepet',         lat: 12.9516, lng: 80.1462 },
  { name: 'Sholinganallur',    lat: 12.9010, lng: 80.2279 },
  { name: 'Ambattur',          lat: 13.1143, lng: 80.1548 },
  { name: 'Kodambakkam',       lat: 13.0519, lng: 80.2213 },
  { name: 'Pallavaram',        lat: 12.9675, lng: 80.1491 },
  { name: 'Avadi',             lat: 13.1152, lng: 80.1014 },
  { name: 'Madhavaram',        lat: 13.1489, lng: 80.2329 },
  { name: 'Virugambakkam',     lat: 13.0538, lng: 80.1945 },
  { name: 'Nungambakkam',      lat: 13.0569, lng: 80.2425 },
  { name: 'Mylapore',          lat: 13.0339, lng: 80.2619 },
  { name: 'West Mambalam',     lat: 13.0388, lng: 80.2197 },
  { name: 'Guindy',            lat: 13.0067, lng: 80.2206 },
];

const MARKET_LAT = 13.0748;
const MARKET_LNG = 80.2136;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

export default function KoyambeduLocationPicker() {
  const navigate  = useNavigate();
  const { setUserLocation, setLocationLabel, locationLabel } = useKoyambeduCart();

  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [selected,    setSelected]    = useState(locationLabel ? { name: locationLabel } : null);
  const [confirming,  setConfirming]  = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  // ── Search via backend proxy (Google Places) ──────────
  const handleSearch = useCallback((q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/eptofresh/places/autocomplete?q=${encodeURIComponent(q)}`);
        setSuggestions(data.predictions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  // ── Pick a Google Places suggestion ───────────────────
  const pickSuggestion = async (pred) => {
    const name = pred.structured_formatting?.main_text || pred.description.split(',')[0];
    setQuery(name);
    setSuggestions([]);
    setSearching(true);
    try {
      const { data } = await api.get(`/eptofresh/places/details?place_id=${pred.place_id}`);
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        setSelected({ name, lat, lng });
      } else {
        setSelected({ name });
      }
    } catch {
      setSelected({ name });
    } finally {
      setSearching(false);
    }
  };

  // ── Pick a popular area ───────────────────────────────
  const pickPopular = (area) => {
    setQuery(area.name);
    setSuggestions([]);
    setSelected(area);
  };

  // ── Confirm ───────────────────────────────────────────
  const confirm = () => {
    if (!selected || confirming) return;
    setConfirming(true);
    if (selected.lat && selected.lng) {
      setUserLocation({ lat: selected.lat, lng: selected.lng });
    }
    setLocationLabel(selected.name);
    toast.success(`Delivery area set to ${selected.name}`);
    navigate(-1);
  };

  const distKm = selected?.lat
    ? Math.round(haversineKm(selected.lat, selected.lng, MARKET_LAT, MARKET_LNG) * 10) / 10
    : null;

  const filteredPopular = query.length >= 2
    ? POPULAR_AREAS.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_AREAS;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F4F2' }}>

      {/* ── Header ── */}
      <div className="shrink-0" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
      }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">Set Delivery Area</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">Search your area or pick from the list</p>
          </div>
          <FaLeaf size={18} className="text-emerald-200 opacity-70 shrink-0" />
        </div>

        {/* Search bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-3 bg-white"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            <FiSearch size={15} className="text-green-600 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search area, locality, pincode…"
              className="flex-1 text-gray-800 text-sm outline-none placeholder-gray-400 bg-transparent"
              style={{ fontSize: 16 }}
              autoFocus
            />
            {searching && (
              <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            {query && !searching && (
              <button onClick={() => { setQuery(''); setSuggestions([]); setSelected(null); inputRef.current?.focus(); }}>
                <FiX size={15} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">

        {/* Google Places suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Search Results</p>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
              {suggestions.map((pred, i) => {
                const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
                const sub  = pred.structured_formatting?.secondary_text || '';
                return (
                  <button key={pred.place_id} onClick={() => pickSuggestion(pred)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-green-50 transition"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#f0fdf4' }}>
                      <FiMapPin size={15} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{main}</p>
                      {sub && <p className="text-gray-400 text-xs truncate mt-0.5">{sub}</p>}
                    </div>
                    <FiChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected area card */}
        {selected && (
          <div className="mb-4 p-4 bg-white rounded-2xl flex items-start gap-3"
            style={{ boxShadow: '0 2px 16px rgba(22,163,74,0.15)', border: '1.5px solid rgba(22,163,74,0.25)' }}>
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <FiCheck size={18} className="text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Selected area</p>
              <p className="font-extrabold text-gray-900 text-base leading-tight">{selected.name}</p>
              {distKm !== null && (
                <p className={`text-xs mt-1 font-medium ${distKm <= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                  {distKm} km from Koyambedu market
                  {distKm > 30 && ' · Long distance charges may apply'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Popular areas */}
        {(!suggestions.length) && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {query.length >= 2 ? 'Matching Areas' : 'Popular Delivery Areas'}
            </p>
            {filteredPopular.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FiMapPin size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No matching areas — try a different search</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredPopular.map(area => (
                  <button key={area.name} onClick={() => pickPopular(area)}
                    className="flex items-center gap-2 p-3 bg-white rounded-xl text-left active:scale-[0.97] transition"
                    style={{
                      boxShadow: selected?.name === area.name
                        ? '0 2px 12px rgba(22,163,74,0.25)'
                        : '0 1px 6px rgba(0,0,0,0.07)',
                      border: selected?.name === area.name
                        ? '1.5px solid #16a34a'
                        : '1px solid rgba(0,0,0,0.05)',
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: selected?.name === area.name ? '#dcfce7' : '#f0fdf4' }}>
                      <FiMapPin size={13} className={selected?.name === area.name ? 'text-green-700' : 'text-green-500'} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 leading-tight">{area.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky confirm button ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button
          onClick={confirm}
          disabled={!selected || confirming}
          className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
          style={{
            background: selected ? 'linear-gradient(135deg, #16a34a, #059669)' : '#d1d5db',
            boxShadow: selected ? '0 4px 16px rgba(22,163,74,0.4)' : 'none',
          }}>
          <FiCheck size={17} />
          {confirming ? 'Setting area…' : selected ? `Confirm — ${selected.name}` : 'Select an area above'}
        </button>
      </div>
    </div>
  );
}
