// ============================================
// EPTOMART EXPRESS — Location Picker
// Contained card-style modal (not an edge-to-edge fullscreen map — that
// felt oversized, especially on desktop) with a Places search bar so the
// customer can type their area/street/landmark and jump straight there,
// in addition to dragging the center-pin. Same backend nearest-store
// lookup as before; still explains out-of-range / suggests Koyambedu
// Daily (spec sections 8 & 9).
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX, FiCheck, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';

const DEFAULT = { lat: 13.0389, lng: 80.1730 }; // Valasaravakkam, Chennai

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    api.get('/eptofresh/maps/config')
      .then(({ data }) => {
        if (!data.key) { reject(new Error('No key')); return; }
        const cb = '__gmExpress_' + Date.now();
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

export default function ExpressLocationPicker() {
  const navigate = useNavigate();
  const { setSelectedStore } = useExpressCart();

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const geoTimer = useRef(null);
  const acRef = useRef(null);
  const tokenRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [center, setCenter] = useState(DEFAULT);
  const [shortAddr, setShortAddr] = useState('Valasaravakkam, Chennai');
  const [fullAddr, setFullAddr] = useState('');
  const [mapMoving, setMapMoving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outOfRange, setOutOfRange] = useState(null); // { message } when checked and out of range

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [showSugg, setShowSugg] = useState(false);

  // ── Init map ─────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(() => {
        if (!alive || !mapDivRef.current) return;
        const map = new window.google.maps.Map(mapDivRef.current, {
          center: DEFAULT,
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        });
        map.addListener('dragstart', () => { setMapMoving(true); setShowSugg(false); });
        map.addListener('idle', () => {
          setMapMoving(false);
          const c = map.getCenter();
          const pos = { lat: c.lat(), lng: c.lng() };
          setCenter(pos);
          setOutOfRange(null);
          clearTimeout(geoTimer.current);
          geoTimer.current = setTimeout(() => {
            reverseGeocode(pos.lat, pos.lng).then(r => { if (alive) { setShortAddr(r.short); setFullAddr(r.full); } });
          }, 400);
        });
        mapRef.current = map;
        acRef.current = new window.google.maps.places.AutocompleteService();
        tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => { if (alive) { setShortAddr(r.short); setFullAddr(r.full); } });
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

  // ── Pick a search suggestion — pans/pins the map there ──
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
        setOutOfRange(null);
        setShortAddr(pred.structured_formatting?.main_text || place.name);
        setFullAddr(pred.description || place.formatted_address);
      }
    );
  }, []);

  const confirm = async () => {
    if (!center || mapMoving || checking) return;
    setChecking(true);
    setOutOfRange(null);
    try {
      const { data } = await api.post('/express/nearest-store', { lat: center.lat, lng: center.lng });
      if (data.expressDisabled) {
        toast.error('Eptomart Express is currently unavailable.');
        setOutOfRange({ message: 'Eptomart Express is currently unavailable.' });
        return;
      }
      if (!data.withinRange) {
        setOutOfRange({ message: data.message || "You're outside our Express delivery range." });
        return;
      }
      setSelectedStore(data.store);
      toast.success(`Delivering from our ${data.store.name} store`);
      navigate('/express/shop');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check delivery availability');
    } finally {
      setChecking(false);
    }
  };

  if (loadError) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 text-center max-w-xs w-full">
        <FiMapPin size={40} className="text-indigo-300" />
        <p className="font-bold text-gray-800 text-lg">Map unavailable</p>
        <button onClick={() => navigate(-1)} className="w-full py-2.5 rounded-2xl text-white font-bold text-sm bg-indigo-600">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
      <div className="relative w-full max-w-md h-[82vh] max-h-[680px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* ── Header: back + title ── */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 bg-white z-20">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 active:bg-gray-200">
            <FiArrowLeft size={17} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <FiZap className="text-amber-500 shrink-0" size={15} />
            <span className="font-bold text-gray-800 text-sm truncate">Eptomart Express</span>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="px-3 pb-2 shrink-0 relative z-20">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={15} />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => suggestions.length && setShowSugg(true)}
              placeholder="Search area, street or landmark…"
              className="w-full py-2.5 pl-9 pr-8 rounded-xl text-gray-800 placeholder-gray-400 outline-none bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition"
              style={{ fontSize: '15px' }}
            />
            {query
              ? <button onClick={() => { setQuery(''); setSuggestions([]); setShowSugg(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <FiX size={15} className="text-gray-400" />
                </button>
              : searchBusy
                ? <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                : null}
          </div>

          {/* Suggestions dropdown */}
          {showSugg && suggestions.length > 0 && (
            <div className="absolute left-3 right-3 mt-1 rounded-2xl overflow-hidden bg-white shadow-xl border border-gray-100 max-h-56 overflow-y-auto">
              {suggestions.map((pred, i) => {
                const main = pred.structured_formatting?.main_text || pred.description.split(',')[0];
                const sub = pred.structured_formatting?.secondary_text || '';
                return (
                  <button key={pred.place_id} onClick={() => pickSuggestion(pred)}
                    className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left active:bg-gray-50"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-indigo-50">
                      <FiMapPin size={12} className="text-indigo-600" />
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

        {/* ── Map (fills remaining space) ── */}
        <div className="relative flex-1 min-h-0">
          <div ref={mapDivRef} className="absolute inset-0" />

          {!mapReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          )}

          {/* Fixed centre pin */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center" style={{ marginBottom: 16 }}>
              <div className="transition-all duration-200 ease-out" style={{ transform: mapMoving ? 'translateY(-12px) scale(1.08)' : 'translateY(0) scale(1)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#4f46e5', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(79,70,229,0.5)' }}>
                  <FiMapPin className="text-white" size={17} />
                </div>
              </div>
              <div className="rounded-full transition-all duration-200"
                style={{ width: mapMoving ? 5 : 12, height: mapMoving ? 2 : 4, background: 'rgba(0,0,0,0.2)', filter: 'blur(1.5px)', marginTop: -1 }} />
            </div>
          </div>
        </div>

        {/* ── Bottom panel: address + confirm ── */}
        <div className="shrink-0 bg-white px-4 pt-3 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-indigo-50">
              <FiMapPin size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                {mapMoving ? 'Adjusting…' : 'Delivery location'}
              </p>
              <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">
                {mapMoving ? 'Keep dragging…' : shortAddr}
              </p>
              {!mapMoving && fullAddr && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{fullAddr}</p>
              )}
            </div>
          </div>

          {outOfRange && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 font-semibold mb-1.5">{outOfRange.message}</p>
              <button onClick={() => navigate('/koyambedu')} className="text-xs font-bold text-amber-900 underline">
                Shop Koyambedu Daily instead →
              </button>
            </div>
          )}

          <button onClick={confirm} disabled={!center || mapMoving || checking || !mapReady}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
            style={{ background: (!mapMoving && mapReady) ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#d1d5db' }}>
            <FiCheck size={18} />
            {checking ? 'Checking availability…' : mapMoving ? 'Keep dragging…' : 'Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
