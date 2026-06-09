// ============================================
// EPTOFRESH LOCATION PICKER
// Search + fixed center pin on map
// No GPS — works everywhere including apps
// Uses Leaflet + OpenStreetMap (free, no key)
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// ── Search: Google Places (if configured) → Photon fallback ──
// Returns { type: 'google'|'photon', results: [...] }
async function searchPlaces(query) {
  if (!query || query.length < 2) return null;

  // 1. Try Google Places via backend proxy
  try {
    const { data } = await api.get(`/eptofresh/places/autocomplete?q=${encodeURIComponent(query)}`);
    if (Array.isArray(data.predictions) && data.predictions.length > 0) {
      return { type: 'google', results: data.predictions };
    }
  } catch {}

  // 2. Fallback: Photon (Komoot) — free, no key, great India coverage
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=7&bbox=68.7,8.4,97.25,37.6`;
    const res  = await fetch(url);
    const data = await res.json();
    const features = (data.features || []).filter(f => {
      const c = f.properties?.country;
      return !c || c === 'India';
    });
    return { type: 'photon', results: features };
  } catch {}

  return { type: 'none', results: [] };
}

// Get lat/lng for Google place_id
async function getGooglePlaceLatLng(place_id) {
  try {
    const { data } = await api.get(`/eptofresh/places/details?place_id=${place_id}`);
    const loc = data.result?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng, name: data.result.name, address: data.result.formatted_address } : null;
  } catch { return null; }
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

const DEFAULT = { lat: 13.0827, lng: 80.2707 }; // Chennai

export function EptoFreshLocationPicker() {
  const navigate = useNavigate();
  const { setUserLocation } = useEptoFreshCart();

  const mapDivRef  = useRef(null);
  const mapRef     = useRef(null);
  const moveTimer  = useRef(null);

  const [center, setCenter]           = useState(DEFAULT);
  const [shortAddr, setShortAddr]     = useState('');
  const [fullAddr, setFullAddr]       = useState('');
  const [mapMoving, setMapMoving]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [suggestions, setSuggestions]   = useState(null); // null | { type, results }
  const [searchBusy, setSearchBusy]     = useState(false);
  const [confirming, setConfirming]     = useState(false);

  // ── Load Leaflet from CDN then init map ────
  useEffect(() => {
    let mounted = true;

    const init = () => {
      if (!mounted || !mapDivRef.current || mapRef.current) return;
      const L = window.L;

      const map = L.map(mapDivRef.current, {
        center: [DEFAULT.lat, DEFAULT.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ position: 'bottomleft', prefix: '© OSM' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('movestart', () => setMapMoving(true));
      map.on('moveend', () => {
        setMapMoving(false);
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        clearTimeout(moveTimer.current);
        moveTimer.current = setTimeout(() => {
          reverseGeocode(c.lat, c.lng).then(r => {
            if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
          });
        }, 500);
      });

      mapRef.current = map;
      reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => {
        if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
      });
    };

    if (window.L) {
      init();
    } else {
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.querySelector('#leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = init;
        document.head.appendChild(script);
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
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions(null);
      setSearchBusy(false);
      return;
    }
    setSearchBusy(true);
    const t = setTimeout(async () => {
      const res = await searchPlaces(searchQuery);
      setSuggestions(res);
      setSearchBusy(false);
      if (res && res.results.length === 0) toast('No results. Try a different name.', { icon: '🔍' });
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const pickSuggestion = async (r, type) => {
    setSearchQuery('');
    setSuggestions(null);

    if (type === 'google') {
      setSearchBusy(true);
      const detail = await getGooglePlaceLatLng(r.place_id);
      setSearchBusy(false);
      if (!detail) { toast.error('Could not get location. Try again.'); return; }
      mapRef.current?.setView([detail.lat, detail.lng], 16);
      setCenter({ lat: detail.lat, lng: detail.lng });
      setShortAddr(r.structured_formatting?.main_text || detail.name);
      setFullAddr(r.description || detail.address);

    } else {
      // Photon result — lat/lng are in geometry.coordinates [lng, lat]
      const [lng, lat] = r.geometry.coordinates;
      const p = r.properties;
      const short = p.name || p.city || p.county || '';
      const parts = [p.name, p.city || p.county, p.state].filter(Boolean);
      mapRef.current?.setView([lat, lng], 16);
      setCenter({ lat, lng });
      setShortAddr(short);
      setFullAddr(parts.join(', '));
    }
  };

  const confirm = () => {
    if (!shortAddr || mapMoving) return;
    setConfirming(true);
    setUserLocation(center);
    localStorage.setItem('eptofresh_area', shortAddr);
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#0B1729' }}>

      {/* Map */}
      <div ref={mapDivRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* Top bar */}
      <div
        className="absolute left-0 right-0 z-10 px-4"
        style={{
          top: 0,
          paddingTop: 'env(safe-area-inset-top, 44px)',
          background: 'linear-gradient(180deg, rgba(11,23,41,0.97) 65%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(11,23,41,0.9)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <FiArrowLeft className="text-white" size={18} />
          </button>

          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search area, street or city…"
              className="w-full pl-9 pr-9 py-3 rounded-2xl text-white outline-none"
              style={{
                background: 'rgba(11,23,41,0.92)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '16px',
              }}
            />
            {searchQuery ? (
              <button onClick={() => { setSearchQuery(''); setSuggestions(null); setSearchBusy(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <FiX className="text-gray-400" size={14} />
              </button>
            ) : searchBusy ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            ) : null}
          </div>
        </div>

        {/* Search suggestions */}
        {suggestions?.results?.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-1"
            style={{ background: '#0f2035', border: '1px solid rgba(255,255,255,0.1)' }}>
            {suggestions.results.map((r, i) => {
              const isGoogle = suggestions.type === 'google';
              const main = isGoogle
                ? (r.structured_formatting?.main_text || r.description?.split(',')[0])
                : (r.properties?.name || r.properties?.city || '');
              const sub = isGoogle
                ? (r.structured_formatting?.secondary_text || '')
                : [r.properties?.city, r.properties?.state].filter(Boolean).join(', ');
              return (
                <button key={isGoogle ? r.place_id : i}
                  onClick={() => pickSuggestion(r, suggestions.type)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:opacity-70"
                  style={{ borderBottom: i < suggestions.results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <FiMapPin className="text-orange-400 mt-0.5 shrink-0" size={14} />
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate font-medium">{main}</p>
                    {sub ? <p className="text-gray-500 text-xs truncate">{sub}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed center pin */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ paddingBottom: 160 }}>
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center transition-transform duration-150"
            style={{ transform: mapMoving ? 'translateY(-8px)' : 'translateY(0)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: '#f4941c', border: '3px solid white', boxShadow: '0 4px 20px rgba(244,148,28,0.5)' }}>
              <FiMapPin className="text-white" size={20} />
            </div>
            <div className="w-0.5 h-3" style={{ background: '#f4941c' }} />
          </div>
          <div className="w-3 h-1 rounded-full opacity-30 transition-all duration-150"
            style={{ background: '#000', transform: mapMoving ? 'scale(0.5)' : 'scale(1)' }} />
        </div>
      </div>

      {/* Bottom address + confirm */}
      <div
        className="absolute left-0 right-0 bottom-0 z-10 px-4 pt-6"
        style={{
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(0deg, rgba(11,23,41,1) 0%, rgba(11,23,41,0.97) 75%, transparent 100%)',
        }}
      >
        <div className="rounded-2xl p-4 mb-3 flex items-start gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(244,148,28,0.15)' }}>
            <FiMapPin className="text-orange-400" size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm leading-tight">
              {mapMoving ? 'Moving…' : (shortAddr || 'Search or pan map to select location')}
            </p>
            {!mapMoving && fullAddr ? (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{fullAddr}</p>
            ) : null}
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!shortAddr || mapMoving || confirming}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
          style={{ background: '#f4941c' }}
        >
          {confirming ? 'Setting location…' : '✓  Confirm This Location'}
        </button>
      </div>
    </div>
  );
}
