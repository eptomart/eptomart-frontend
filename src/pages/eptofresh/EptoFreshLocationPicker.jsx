// ============================================
// EPTOFRESH LOCATION PICKER
// Full-screen map with fixed center pin
// Search + GPS — like Swiggy / Zomato
// Uses Leaflet + OpenStreetMap (free, no key)
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiNavigation, FiMapPin, FiArrowLeft, FiX } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import toast from 'react-hot-toast';

// ── Nominatim helpers ────────────────────────
async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    return await res.json();
  } catch { return []; }
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const a = data.address || {};
    const short = [
      a.suburb || a.neighbourhood || a.village || a.town || a.city_district,
      a.city || a.county || a.state_district,
    ].filter(Boolean).join(', ');
    const full = data.display_name
      ? data.display_name.split(',').slice(0, 4).join(',').trim()
      : '';
    return { short: short || full.split(',')[0] || 'Unknown area', full };
  } catch { return { short: 'Unknown area', full: '' }; }
}

// Default center: Chennai
const DEFAULT = { lat: 13.0827, lng: 80.2707 };

export function EptoFreshLocationPicker() {
  const navigate = useNavigate();
  const { setUserLocation } = useEptoFreshCart();

  const mapDivRef      = useRef(null);
  const leafletRef     = useRef(null);   // L instance
  const mapRef         = useRef(null);   // map instance
  const moveTimer      = useRef(null);
  const gpsActiveRef   = useRef(false);

  const [center, setCenter]         = useState(DEFAULT);
  const [shortAddr, setShortAddr]   = useState('');
  const [fullAddr, setFullAddr]     = useState('');
  const [mapMoving, setMapMoving]   = useState(false);

  const [searchQuery, setSearchQuery]     = useState('');
  const [suggestions, setSuggestions]     = useState([]);
  const [searchBusy, setSearchBusy]       = useState(false);
  const [gpsLoading, setGpsLoading]       = useState(false);
  const [confirming, setConfirming]       = useState(false);
  const [gpsBlocked, setGpsBlocked]       = useState(false); // permission denied

  // ── Load Leaflet from CDN then init map ────
  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted || !mapDivRef.current || mapRef.current) return;
      const L = window.L;
      leafletRef.current = L;

      const map = L.map(mapDivRef.current, {
        center: [DEFAULT.lat, DEFAULT.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Tiny attribution bottom-left
      L.control.attribution({ position: 'bottomleft', prefix: '© OSM' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('movestart', () => setMapMoving(true));
      map.on('moveend', () => {
        setMapMoving(false);
        const c = map.getCenter();
        const loc = { lat: c.lat, lng: c.lng };
        setCenter(loc);
        clearTimeout(moveTimer.current);
        moveTimer.current = setTimeout(() => {
          reverseGeocode(c.lat, c.lng).then(r => {
            if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
          });
        }, 500);
      });

      mapRef.current = map;

      // Initial geocode for default center
      reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => {
        if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
      });
    };

    if (window.L) {
      init();
    } else {
      // Load CSS
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Load JS
      if (!document.querySelector('#leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = init;
        document.head.appendChild(script);
      } else {
        // Script tag exists but may already be loaded
        const existing = document.querySelector('#leaflet-js');
        existing.addEventListener('load', init);
      }
    }

    return () => {
      mounted = false;
      clearTimeout(moveTimer.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Search debounce ────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearchBusy(true);
      const res = await searchPlaces(searchQuery);
      setSuggestions(res);
      setSearchBusy(false);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fly map to search result ───────────────
  const pickSuggestion = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 16);
    setCenter({ lat, lng });
    const a = r.address || {};
    const short = [
      a.suburb || a.neighbourhood || a.village || a.town || a.city_district,
      a.city || a.county,
    ].filter(Boolean).join(', ') || r.display_name.split(',')[0];
    setShortAddr(short);
    setFullAddr(r.display_name);
    setSearchQuery('');
    setSuggestions([]);
  };

  // ── GPS ────────────────────────────────────
  const useGPS = async () => {
    if (gpsActiveRef.current) return;
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return; }

    // Check permission state first — avoids silent failure in iOS PWA
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') { setGpsBlocked(true); return; }
      } catch {}
    }

    gpsActiveRef.current = true;
    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {                    // keep sync — no async here
        gpsActiveRef.current = false;
        setGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapRef.current?.setView([lat, lng], 16);
        setCenter({ lat, lng });
        reverseGeocode(lat, lng).then(r => { setShortAddr(r.short); setFullAddr(r.full); });
      },
      (err) => {
        gpsActiveRef.current = false;
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsBlocked(true);      // show Settings instructions instead of toast
        } else {
          toast.error('GPS timed out. Search your area or pan the map.');
        }
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  };

  // ── Confirm ────────────────────────────────
  const confirm = () => {
    if (!shortAddr) return;
    setConfirming(true);
    setUserLocation(center);
    localStorage.setItem('eptofresh_area', shortAddr);
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#0B1729' }}>

      {/* ── Map fills entire screen ── */}
      <div ref={mapDivRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* ── Top bar: back + search ── */}
      <div
        className="absolute left-0 right-0 z-10 px-4"
        style={{
          top: 0,
          paddingTop: 'env(safe-area-inset-top, 44px)',
          background: 'linear-gradient(180deg,rgba(11,23,41,0.96) 60%,transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2 pb-2">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(11,23,41,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <FiArrowLeft className="text-white" size={18} />
          </button>

          {/* Search input */}
          <div className="flex-1 relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search area, street or city…"
              className="w-full pl-9 pr-9 py-3 rounded-2xl text-white outline-none"
              style={{
                background: 'rgba(11,23,41,0.9)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '16px',
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <FiX className="text-gray-400" size={14} />
              </button>
            ) : searchBusy ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            ) : null}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden mb-1"
            style={{ background: '#0f2035', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {suggestions.map((r, i) => (
              <button
                key={i}
                onClick={() => pickSuggestion(r)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left"
                style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <FiMapPin className="text-orange-400 mt-0.5 shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-white text-sm truncate font-medium">
                    {r.display_name.split(',')[0]}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {r.display_name.split(',').slice(1, 3).join(',')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed center pin (map moves under it) ── */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ paddingBottom: 160 }}
      >
        <div className="flex flex-col items-center">
          {/* Pin bounces slightly while map is moving */}
          <div
            className="flex flex-col items-center transition-transform duration-150"
            style={{ transform: mapMoving ? 'translateY(-6px)' : 'translateY(0)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: '#f4941c',
                border: '3px solid white',
                boxShadow: '0 4px 20px rgba(244,148,28,0.5)',
              }}
            >
              <FiMapPin className="text-white" size={20} />
            </div>
            {/* Pin stem */}
            <div className="w-0.5 h-3" style={{ background: '#f4941c' }} />
          </div>
          {/* Shadow dot on map */}
          <div
            className="w-3 h-1 rounded-full opacity-30 transition-all duration-150"
            style={{
              background: '#000',
              transform: mapMoving ? 'scale(0.6)' : 'scale(1)',
            }}
          />
        </div>
      </div>

      {/* ── GPS blocked sheet ── */}
      {gpsBlocked && (
        <>
          <div className="absolute inset-0 z-20" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setGpsBlocked(false)} />
          <div className="absolute left-0 right-0 bottom-0 z-30 rounded-t-3xl px-5 pt-4 pb-6"
            style={{ background: '#0f2035', border: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'max(24px,env(safe-area-inset-bottom))' }}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-600" /></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(244,148,28,0.15)' }}>
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Location Access Blocked</p>
                <p className="text-gray-400 text-xs mt-0.5">Enable it in your device Settings to use GPS</p>
              </div>
            </div>
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-gray-300 text-xs leading-5">
                <span className="text-white font-semibold">iPhone:</span> Settings → Privacy & Security → Location Services → Safari / your browser → select <span className="text-orange-400">While Using</span>
              </p>
              <p className="text-gray-500 text-xs mt-2">After enabling, come back and tap the GPS button again.</p>
            </div>
            <button onClick={() => setGpsBlocked(false)}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm"
              style={{ background: '#f4941c' }}>
              OK — I'll search my area instead
            </button>
          </div>
        </>
      )}

      {/* ── GPS button ── */}
      <div className="absolute z-10" style={{ bottom: 220, right: 16 }}>
        <button
          onClick={useGPS}
          disabled={gpsLoading}
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          style={{
            background: '#0f2035',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {gpsLoading
            ? <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            : <FiNavigation className="text-orange-400" size={20} />}
        </button>
      </div>

      {/* ── Bottom address + confirm ── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-10 px-4 pt-5 pb-4"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(0deg,rgba(11,23,41,1) 0%,rgba(11,23,41,0.97) 70%,transparent 100%)',
        }}
      >
        {/* Address card */}
        <div
          className="rounded-2xl p-4 mb-3 flex items-start gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(244,148,28,0.15)' }}
          >
            <FiMapPin className="text-orange-400" size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm leading-tight">
              {mapMoving ? 'Moving map…' : (shortAddr || 'Pan map to select location')}
            </p>
            {!mapMoving && fullAddr ? (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{fullAddr}</p>
            ) : null}
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={confirm}
          disabled={!shortAddr || mapMoving || confirming}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50"
          style={{ background: '#f4941c' }}
        >
          {confirming ? 'Setting location…' : '✓  Confirm This Location'}
        </button>
      </div>
    </div>
  );
}
