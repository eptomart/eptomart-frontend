// ============================================
// EPTOFRESH LOCATION PICKER — Google Maps
// PWA-friendly: auto GPS → map → search
// iOS Safari safe: synchronous GPS callback
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const DEFAULT = { lat: 13.0827, lng: 80.2707 }; // Chennai


// ── Fetch key from backend → load Google Maps ────────────
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    api.get('/eptofresh/maps/config')
      .then(({ data }) => {
        if (!data.key) { reject(new Error('No key')); return; }
        const cbName = '__gmReady_' + Date.now();
        window[cbName] = () => { resolve(); delete window[cbName]; };
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&callback=${cbName}`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      })
      .catch(reject);
  });
}

// ── Google reverse geocode ───────────────────────────────
function reverseGeocode(lat, lng) {
  return new Promise(resolve => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) { resolve({ short: 'Unknown area', full: '' }); return; }
      const r = results[0];
      const comps = r.address_components || [];
      const get = t => comps.find(c => c.types.includes(t))?.long_name || '';
      const neighbourhood = get('sublocality_level_2') || get('sublocality_level_1') || get('sublocality') || get('neighborhood');
      const locality = get('locality') || get('postal_town');
      const short = neighbourhood
        ? `${neighbourhood}, ${locality}`.trim().replace(/^, |, $/, '')
        : locality || r.formatted_address.split(',')[0];
      resolve({ short, full: r.formatted_address });
    });
  });
}

// GPS states: idle → requesting → success | denied
export function EptoFreshLocationPicker() {
  const navigate = useNavigate();
  const { setUserLocation } = useEptoFreshCart();

  const mapDivRef    = useRef(null);
  const mapRef       = useRef(null);
  const geocodeTimer = useRef(null);
  const autocomplete = useRef(null);
  const sessionToken = useRef(null);

  const [mapReady, setMapReady]         = useState(false);
  const [loadError, setLoadError]       = useState(false);
  const [center, setCenter]             = useState(DEFAULT);
  const [shortAddr, setShortAddr]       = useState('');
  const [fullAddr, setFullAddr]         = useState('');
  const [mapMoving, setMapMoving]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [searchBusy, setSearchBusy]     = useState(false);
  const [showSugg, setShowSugg]         = useState(false);
  const [confirming, setConfirming]     = useState(false);

  // ── Init map ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (!mounted || !mapDivRef.current) return;
        const map = new window.google.maps.Map(mapDivRef.current, {
          center: DEFAULT,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: false,          // hide default — we add our own
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        map.addListener('dragstart', () => { setMapMoving(true); setShowSugg(false); });
        map.addListener('idle', () => {
          setMapMoving(false);
          const c = map.getCenter();
          const pos = { lat: c.lat(), lng: c.lng() };
          setCenter(pos);
          clearTimeout(geocodeTimer.current);
          geocodeTimer.current = setTimeout(() => {
            reverseGeocode(pos.lat, pos.lng).then(r => {
              if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
            });
          }, 400);
        });
        mapRef.current = map;
        autocomplete.current = new window.google.maps.places.AutocompleteService();
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => {
          if (mounted) { setShortAddr(r.short); setFullAddr(r.full); }
        });
        setMapReady(true);
      })
      .catch(() => { if (mounted) setLoadError(true); });
    return () => {
      mounted = false;
      clearTimeout(geocodeTimer.current);
    };
  }, []);


  // ── Search debounce ──────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !autocomplete.current) {
      setSuggestions([]); setSearchBusy(false); return;
    }
    setSearchBusy(true);
    const t = setTimeout(() => {
      autocomplete.current.getPlacePredictions(
        { input: searchQuery, sessionToken: sessionToken.current, componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] },
        (preds, status) => {
          setSearchBusy(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
            setSuggestions(preds); setShowSugg(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Pick suggestion ──────────────────────────────────────
  const pickSuggestion = useCallback((pred) => {
    setSearchQuery(pred.structured_formatting?.main_text || pred.description);
    setSuggestions([]); setShowSugg(false); setSearchBusy(true);
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.getDetails(
      { placeId: pred.place_id, fields: ['geometry', 'name', 'formatted_address'], sessionToken: sessionToken.current },
      (place, status) => {
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        setSearchBusy(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) {
          toast.error('Could not get location.'); return;
        }
        const loc = place.geometry.location;
        mapRef.current.panTo(loc);
        mapRef.current.setZoom(16);
        setCenter({ lat: loc.lat(), lng: loc.lng() });
        setShortAddr(pred.structured_formatting?.main_text || place.name);
        setFullAddr(pred.description || place.formatted_address);
      }
    );
  }, []);

  const confirm = () => {
    if (!shortAddr || mapMoving || confirming) return;
    setConfirming(true);
    setUserLocation(center);
    localStorage.setItem('eptofresh_area', shortAddr);
    navigate(-1);
  };

  // ── Error screen ─────────────────────────────────────────
  if (loadError) return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: '#0B1729' }}>
      <div className="text-4xl">🗺️</div>
      <p className="text-white font-semibold">Map unavailable</p>
      <p className="text-gray-500 text-sm">Add <code className="text-orange-400 bg-white/10 px-1 rounded">GOOGLE_PLACES_API_KEY</code> to your Render backend environment variables.</p>
      <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2.5 rounded-2xl text-white font-semibold" style={{ background: '#f4941c' }}>Go Back</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#e8e8e8' }}>

      {/* ── Map ─────────────────────────────────────────── */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* ── Loading overlay ──────────────────────────────── */}
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4" style={{ background: '#0B1729' }}>
          <div className="w-12 h-12 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
          <p className="text-gray-300 text-sm">Loading map…</p>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 z-10 px-3"
        style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 44px)' }}
      >
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
          >
            <FiArrowLeft className="text-gray-700" size={18} />
          </button>
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => suggestions.length && setShowSugg(true)}
              placeholder="Search area, street or landmark…"
              className="w-full py-3 pl-10 pr-9 rounded-2xl text-gray-800 placeholder-gray-400 outline-none"
              style={{ background: '#fff', fontSize: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}
            />
            {searchQuery
              ? <button onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSugg(false); }} className="absolute right-3 top-1/2 -translate-y-1/2"><FiX className="text-gray-400" size={16} /></button>
              : searchBusy
                ? <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                : null
            }
          </div>
        </div>

        {/* Suggestions */}
        {showSugg && suggestions.length > 0 && (
          <div className="rounded-2xl overflow-hidden mt-0.5 mb-1" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            {suggestions.map((pred, i) => {
              const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
              const sub  = pred.structured_formatting?.secondary_text || '';
              return (
                <button key={pred.place_id} onClick={() => pickSuggestion(pred)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-gray-50"
                  style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#fff7ed' }}>
                    <FiMapPin style={{ color: '#f4941c' }} size={14} />
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

      {/* ── Fixed center pin ─────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 190 }}>
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center transition-all duration-200 ease-out"
            style={{ transform: mapMoving ? 'translateY(-14px) scale(1.1)' : 'translateY(0) scale(1)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: '#f4941c', border: '3px solid #fff',
                boxShadow: mapMoving
                  ? '0 8px 28px rgba(244,148,28,0.55), 0 3px 10px rgba(0,0,0,0.3)'
                  : '0 4px 16px rgba(244,148,28,0.45), 0 2px 6px rgba(0,0,0,0.2)',
              }}>
              <FiMapPin className="text-white" size={20} />
            </div>
            <div className="w-0.5 h-4 transition-all duration-200" style={{ background: 'linear-gradient(#f4941c, transparent)' }} />
          </div>
          <div className="rounded-full transition-all duration-200"
            style={{ width: mapMoving ? 6 : 14, height: mapMoving ? 3 : 5, background: 'rgba(0,0,0,0.2)', filter: 'blur(2px)', marginTop: -2 }} />
        </div>
      </div>

      {/* ── Bottom panel ─────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-10"
        style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
          padding: '16px 16px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#e5e7eb' }} />

        {/* Selected address */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#fff7ed' }}>
            <FiMapPin style={{ color: '#f4941c' }} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              {mapMoving ? 'Adjusting…' : 'Selected location'}
            </p>
            <p className="font-bold text-base leading-tight text-gray-900">
              {mapMoving ? 'Move the pin to your spot' : (shortAddr || 'Search or drag the map')}
            </p>
            {!mapMoving && fullAddr && <p className="text-xs mt-0.5 line-clamp-2 text-gray-500">{fullAddr}</p>}
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!shortAddr || mapMoving || confirming || !mapReady}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all"
          style={{ background: '#f4941c' }}
        >
          {confirming ? 'Setting location…' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
}
