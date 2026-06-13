// ============================================
// KOYAMBEDU LOCATION PICKER — Google Maps
// Center-pin drag approach (same as EptoFresh)
// No GPS — user drags map then taps Confirm
// Key fetched securely from /eptofresh/maps/config
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX, FiCheck } from 'react-icons/fi';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const DEFAULT    = { lat: 13.0827, lng: 80.2707 }; // Chennai centre
const MARKET_LAT = 13.0748;
const MARKET_LNG = 80.2136;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

// Load Google Maps JS SDK (key from backend — never exposed in frontend)
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    api.get('/eptofresh/maps/config')
      .then(({ data }) => {
        if (!data.key) { reject(new Error('No key')); return; }
        const cb = '__gmKbd_' + Date.now();
        window[cb] = () => { resolve(); delete window[cb]; };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&callback=${cb}`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      })
      .catch(reject);
  });
}

function reverseGeocode(lat, lng) {
  return new Promise(resolve => {
    const g = new window.google.maps.Geocoder();
    g.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) { resolve({ short: 'Unknown area', full: '' }); return; }
      const r = results[0];
      const c = r.address_components || [];
      const get = t => c.find(x => x.types.includes(t))?.long_name || '';
      const nb  = get('sublocality_level_2') || get('sublocality_level_1') || get('sublocality') || get('neighborhood');
      const loc = get('locality') || get('postal_town');
      const short = nb ? `${nb}, ${loc}`.replace(/^, |, $/, '') : loc || r.formatted_address.split(',')[0];
      resolve({ short, full: r.formatted_address });
    });
  });
}

export default function KoyambeduLocationPicker() {
  const navigate = useNavigate();
  const { setUserLocation, setLocationLabel } = useKoyambeduCart();

  const mapDivRef    = useRef(null);
  const mapRef       = useRef(null);
  const geoTimer     = useRef(null);
  const acRef        = useRef(null);
  const tokenRef     = useRef(null);

  const [mapReady,    setMapReady]    = useState(false);
  const [loadError,   setLoadError]   = useState(false);
  const [center,      setCenter]      = useState(DEFAULT);
  const [shortAddr,   setShortAddr]   = useState('');
  const [fullAddr,    setFullAddr]    = useState('');
  const [mapMoving,   setMapMoving]   = useState(false);
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchBusy,  setSearchBusy]  = useState(false);
  const [showSugg,    setShowSugg]    = useState(false);
  const [confirming,  setConfirming]  = useState(false);

  const distKm = center
    ? Math.round(haversineKm(center.lat, center.lng, MARKET_LAT, MARKET_LNG) * 10) / 10
    : null;

  // ── Init map ─────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(() => {
        if (!alive || !mapDivRef.current) return;
        const map = new window.google.maps.Map(mapDivRef.current, {
          center:           DEFAULT,
          zoom:             14,
          disableDefaultUI: true,
          gestureHandling:  'greedy',
          clickableIcons:   false,
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        });

        map.addListener('dragstart', () => { setMapMoving(true); setShowSugg(false); });
        map.addListener('idle', () => {
          setMapMoving(false);
          const c = map.getCenter();
          const pos = { lat: c.lat(), lng: c.lng() };
          setCenter(pos);
          clearTimeout(geoTimer.current);
          geoTimer.current = setTimeout(() => {
            reverseGeocode(pos.lat, pos.lng).then(r => {
              if (alive) { setShortAddr(r.short); setFullAddr(r.full); }
            });
          }, 400);
        });

        mapRef.current  = map;
        acRef.current   = new window.google.maps.places.AutocompleteService();
        tokenRef.current= new window.google.maps.places.AutocompleteSessionToken();

        reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => {
          if (alive) { setShortAddr(r.short); setFullAddr(r.full); }
        });
        setMapReady(true);
      })
      .catch(() => { if (alive) setLoadError(true); });

    return () => { alive = false; clearTimeout(geoTimer.current); };
  }, []);

  // ── Search debounce ──────────────────────────────────
  useEffect(() => {
    if (!query || query.length < 2 || !acRef.current) {
      setSuggestions([]); setSearchBusy(false); return;
    }
    setSearchBusy(true);
    const t = setTimeout(() => {
      acRef.current.getPlacePredictions(
        { input: query, sessionToken: tokenRef.current, componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] },
        (preds, status) => {
          setSearchBusy(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
            setSuggestions(preds); setShowSugg(true);
          } else { setSuggestions([]); }
        }
      );
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // ── Pick suggestion ──────────────────────────────────
  const pickSuggestion = useCallback((pred) => {
    setQuery(pred.structured_formatting?.main_text || pred.description);
    setSuggestions([]); setShowSugg(false); setSearchBusy(true);
    const svc = new window.google.maps.places.PlacesService(mapRef.current);
    svc.getDetails(
      { placeId: pred.place_id, fields: ['geometry', 'name', 'formatted_address'], sessionToken: tokenRef.current },
      (place, status) => {
        tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setSearchBusy(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) {
          toast.error('Could not load location.'); return;
        }
        const loc = place.geometry.location;
        mapRef.current.panTo(loc);
        mapRef.current.setZoom(16);
        setShortAddr(pred.structured_formatting?.main_text || place.name);
        setFullAddr(pred.description || place.formatted_address);
      }
    );
  }, []);

  // ── Confirm ──────────────────────────────────────────
  const confirm = () => {
    if (!shortAddr || mapMoving || confirming) return;
    setConfirming(true);
    setUserLocation(center);
    setLocationLabel(shortAddr);
    toast.success(`Delivery area: ${shortAddr}`);
    navigate(-1);
  };

  // ── Error screen ─────────────────────────────────────
  if (loadError) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: '#F5F4F2' }}>
      <FiMapPin size={40} className="text-green-300" />
      <p className="font-bold text-gray-800 text-lg">Map unavailable</p>
      <p className="text-gray-400 text-sm leading-relaxed">
        Set <code className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs">GOOGLE_PLACES_API_KEY</code> in Render environment variables.
      </p>
      <button onClick={() => navigate(-1)}
        className="px-6 py-2.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition"
        style={{ background: '#16a34a' }}>
        Go Back
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#e8e8e8' }}>

      {/* ── Map ── */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* ── Loading overlay ── */}
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4" style={{ background: '#F5F4F2' }}>
          <div className="w-12 h-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading map…</p>
        </div>
      )}

      {/* ── Top bar (back + search) ── */}
      <div className="absolute left-0 right-0 z-10 px-3"
        style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 44px)' }}>
        <div className="flex items-center gap-2 pb-2">
          <button onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
            <FiArrowLeft size={18} className="text-gray-700" />
          </button>
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => suggestions.length && setShowSugg(true)}
              placeholder="Search area, street or landmark…"
              className="w-full py-3 pl-10 pr-9 rounded-2xl text-gray-800 placeholder-gray-400 outline-none"
              style={{ background: '#fff', fontSize: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}
            />
            {query
              ? <button onClick={() => { setQuery(''); setSuggestions([]); setShowSugg(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FiX size={16} className="text-gray-400" />
                </button>
              : searchBusy
                ? <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                : null}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSugg && suggestions.length > 0 && (
          <div className="rounded-2xl overflow-hidden mt-0.5" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            {suggestions.map((pred, i) => {
              const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
              const sub  = pred.structured_formatting?.secondary_text || '';
              return (
                <button key={pred.place_id} onClick={() => pickSuggestion(pred)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-gray-50"
                  style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#f0fdf4' }}>
                    <FiMapPin size={14} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-semibold truncate">{main}</p>
                    {sub && <p className="text-gray-400 text-xs truncate mt-0.5">{sub}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fixed centre pin ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ paddingBottom: 220 }}>
        <div className="flex flex-col items-center">
          <div className="transition-all duration-200 ease-out"
            style={{ transform: mapMoving ? 'translateY(-14px) scale(1.1)' : 'translateY(0) scale(1)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: '#16a34a',
                border: '3px solid #fff',
                boxShadow: mapMoving
                  ? '0 8px 28px rgba(22,163,74,0.6), 0 3px 10px rgba(0,0,0,0.3)'
                  : '0 4px 16px rgba(22,163,74,0.5), 0 2px 6px rgba(0,0,0,0.2)',
              }}>
              <FiMapPin className="text-white" size={20} />
            </div>
            <div className="w-0.5 h-4 mx-auto" style={{ background: 'linear-gradient(#16a34a, transparent)' }} />
          </div>
          <div className="rounded-full transition-all duration-200"
            style={{ width: mapMoving ? 6 : 14, height: mapMoving ? 3 : 5, background: 'rgba(0,0,0,0.2)', filter: 'blur(2px)', marginTop: -2 }} />
        </div>
      </div>

      {/* ── Bottom panel with Confirm button ── */}
      <div className="absolute left-0 right-0 bottom-0 z-10 bg-white"
        style={{
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
        }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#e5e7eb' }} />

        {/* Address label */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: '#f0fdf4' }}>
            <FiMapPin size={16} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              {mapMoving ? 'Adjusting…' : 'Delivery area'}
            </p>
            <p className="font-extrabold text-gray-900 text-base leading-tight">
              {mapMoving ? 'Keep dragging…' : (shortAddr || 'Drag the map to your area')}
            </p>
            {!mapMoving && fullAddr && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{fullAddr}</p>
            )}
            {/* Distance — always shown once we have a centre, regardless of geocoder */}
            {distKm !== null && (
              <p className={`text-xs mt-1.5 font-semibold ${distKm <= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                📍 {distKm} km from Koyambedu market
                {distKm > 30 && ' · Long distance charges may apply'}
              </p>
            )}
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={confirm}
          disabled={!shortAddr || mapMoving || confirming || !mapReady}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
          style={{
            background: (shortAddr && !mapMoving && mapReady)
              ? 'linear-gradient(135deg, #16a34a, #059669)'
              : '#d1d5db',
            boxShadow: (shortAddr && !mapMoving && mapReady)
              ? '0 4px 16px rgba(22,163,74,0.4)'
              : 'none',
          }}>
          <FiCheck size={20} />
          {confirming ? 'Setting area…' : mapMoving ? 'Keep dragging…' : 'Confirm Delivery Area'}
        </button>
      </div>
    </div>
  );
}
