// ============================================
// EPTOFRESH LOCATION PICKER — Google Maps
// Fixed-center pin pattern (Swiggy/Zomato style)
// Uses Google Maps JS API + Places Autocomplete
// Requires: VITE_GOOGLE_MAPS_API_KEY in .env
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX, FiNavigation } from 'react-icons/fi';
import { useEptoFreshCart } from '../../context/EptoFreshCartContext';
import toast from 'react-hot-toast';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT    = { lat: 13.0827, lng: 80.2707 }; // Chennai

// ── Load Google Maps JS API (once) ───────────────────────
function loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const cbName = '__gmReady_' + Date.now();
    window[cbName] = () => { resolve(); delete window[cbName]; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=${cbName}`;
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Reverse geocode via Google Geocoder ──────────────────
function reverseGeocode(lat, lng) {
  return new Promise(resolve => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        resolve({ short: 'Unknown area', full: '' });
        return;
      }
      const r = results[0];
      const comps = r.address_components || [];
      const get = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
      const neighbourhood = get('sublocality_level_2') || get('sublocality_level_1') || get('sublocality') || get('neighborhood');
      const locality      = get('locality') || get('postal_town');
      const short = neighbourhood
        ? `${neighbourhood}, ${locality}`.trim().replace(/^, |, $/, '')
        : locality || r.formatted_address.split(',')[0];
      resolve({ short, full: r.formatted_address });
    });
  });
}

export function EptoFreshLocationPicker() {
  const navigate = useNavigate();
  const { setUserLocation } = useEptoFreshCart();

  const mapDivRef    = useRef(null);
  const mapRef       = useRef(null);
  const geocodeTimer = useRef(null);
  const autocomplete = useRef(null);
  const sessionToken = useRef(null);

  const [ready, setReady]             = useState(false);
  const [loadError, setLoadError]     = useState(false);
  const [center, setCenter]           = useState(DEFAULT);
  const [shortAddr, setShortAddr]     = useState('');
  const [fullAddr, setFullAddr]       = useState('');
  const [mapMoving, setMapMoving]     = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchBusy, setSearchBusy]   = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);

  // ── Init Google Maps ────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_KEY) { setLoadError(true); return; }
    let mounted = true;

    loadGoogleMaps(GOOGLE_KEY)
      .then(() => {
        if (!mounted || !mapDivRef.current) return;

        const map = new window.google.maps.Map(mapDivRef.current, {
          center: DEFAULT,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          gestureHandling: 'greedy',
          clickableIcons: false,
          mapTypeId: 'roadmap',
        });

        map.addListener('dragstart', () => setMapMoving(true));

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

        setReady(true);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });

    return () => {
      mounted = false;
      clearTimeout(geocodeTimer.current);
    };
  }, []);

  // ── Places search debounce ──────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !autocomplete.current) {
      setSuggestions([]);
      setSearchBusy(false);
      return;
    }
    setSearchBusy(true);
    const t = setTimeout(() => {
      autocomplete.current.getPlacePredictions(
        {
          input: searchQuery,
          sessionToken: sessionToken.current,
          componentRestrictions: { country: 'in' },
          types: ['geocode', 'establishment'],
        },
        (preds, status) => {
          setSearchBusy(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
            setSuggestions(preds);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            if (searchQuery.length > 3) toast('No results found', { icon: '🔍' });
          }
        }
      );
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Pick suggestion ─────────────────────────────────────
  const pickSuggestion = useCallback((pred) => {
    setSearchQuery(pred.structured_formatting?.main_text || pred.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchBusy(true);

    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.getDetails(
      {
        placeId: pred.place_id,
        fields: ['geometry', 'name', 'formatted_address'],
        sessionToken: sessionToken.current,
      },
      (place, status) => {
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        setSearchBusy(false);

        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) {
          toast.error('Could not get location. Try again.');
          return;
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

  // ── GPS ─────────────────────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('GPS not available'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(16);
        setCenter(loc);
        reverseGeocode(loc.lat, loc.lng).then(r => {
          setShortAddr(r.short);
          setFullAddr(r.full);
        });
        setGpsLoading(false);
      },
      () => { toast.error('Location access denied'); setGpsLoading(false); },
      { timeout: 8000 }
    );
  };

  // ── Confirm ─────────────────────────────────────────────
  const confirm = () => {
    if (!shortAddr || mapMoving || confirming) return;
    setConfirming(true);
    setUserLocation(center);
    localStorage.setItem('eptofresh_area', shortAddr);
    navigate(-1);
  };

  // ── Error: key missing ──────────────────────────────────
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: '#0B1729' }}>
        <div className="text-4xl">🗺️</div>
        <p className="text-white font-semibold">Google Maps key not configured</p>
        <p className="text-gray-500 text-sm">
          Add <code className="text-orange-400 bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your Vercel environment variables.
        </p>
        <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2.5 rounded-2xl text-white font-semibold" style={{ background: '#f4941c' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#e5e5e5' }}>

      {/* Map */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: '#0B1729' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            <p className="text-gray-400 text-sm">Loading map…</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className="absolute left-0 right-0 z-10 px-3"
        style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 44px)' }}
      >
        <div className="flex items-center gap-2 pb-2">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
          >
            <FiArrowLeft className="text-gray-700" size={18} />
          </button>

          {/* Search input */}
          <div className="flex-1 relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: '#9ca3af' }}
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => suggestions.length && setShowSuggestions(true)}
              placeholder="Search area, street or landmark…"
              className="w-full py-3 pl-10 pr-9 rounded-2xl text-gray-800 placeholder-gray-400 outline-none"
              style={{
                background: '#fff',
                fontSize: '16px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <FiX style={{ color: '#9ca3af' }} size={16} />
              </button>
            ) : searchBusy ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            ) : null}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden mt-0.5 mb-1"
            style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            {suggestions.map((pred, i) => {
              const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
              const sub  = pred.structured_formatting?.secondary_text || '';
              return (
                <button
                  key={pred.place_id}
                  onClick={() => pickSuggestion(pred)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-gray-50"
                  style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: '#fff7ed' }}
                  >
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

      {/* Fixed center pin */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ paddingBottom: 190 }}
      >
        <div className="flex flex-col items-center">
          <div
            className="flex flex-col items-center transition-all duration-200 ease-out"
            style={{ transform: mapMoving ? 'translateY(-14px) scale(1.1)' : 'translateY(0) scale(1)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: '#f4941c',
                border: '3px solid #fff',
                boxShadow: mapMoving
                  ? '0 8px 28px rgba(244,148,28,0.55), 0 3px 10px rgba(0,0,0,0.3)'
                  : '0 4px 16px rgba(244,148,28,0.45), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <FiMapPin className="text-white" size={20} />
            </div>
            {/* Stem */}
            <div className="w-0.5 h-4 transition-all duration-200" style={{ background: 'linear-gradient(#f4941c, transparent)' }} />
          </div>
          {/* Shadow */}
          <div
            className="rounded-full transition-all duration-200"
            style={{
              width: mapMoving ? 6 : 14,
              height: mapMoving ? 3 : 5,
              background: 'rgba(0,0,0,0.2)',
              filter: 'blur(2px)',
              marginTop: -2,
            }}
          />
        </div>
      </div>

      {/* GPS / My Location button */}
      {ready && (
        <button
          onClick={useMyLocation}
          disabled={gpsLoading}
          className="absolute z-10 right-4 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{
            bottom: 220,
            width: 44,
            height: 44,
            background: '#fff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          {gpsLoading
            ? <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            : <FiNavigation style={{ color: '#f4941c' }} size={18} />
          }
        </button>
      )}

      {/* Bottom panel */}
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
        {/* Drag indicator */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: '#e5e7eb' }} />

        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
          Deliver to
        </p>

        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: '#fff7ed' }}
          >
            <FiMapPin style={{ color: '#f4941c' }} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base leading-tight" style={{ color: '#111827' }}>
              {mapMoving ? 'Moving…' : (shortAddr || 'Pan the map to select a location')}
            </p>
            {!mapMoving && fullAddr && (
              <p className="text-sm mt-0.5 line-clamp-2" style={{ color: '#6b7280' }}>{fullAddr}</p>
            )}
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!shortAddr || mapMoving || confirming || !ready}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all"
          style={{ background: '#f4941c' }}
        >
          {confirming ? 'Setting location…' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
}
