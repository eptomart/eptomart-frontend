// ============================================
// EPTOMART EXPRESS — Location Picker
// Two modes:
//   'list' — if the customer already has saved addresses (the same global
//            address book used by Koyambedu/FruitBasket/EptoFresh
//            checkouts), show them for a one-tap "Deliver Here" instead of
//            forcing a fresh map pin every time. Addresses can be edited
//            (full edit lives on the Profile page) or removed from here.
//   'pin'  — the original map+search picker, used only when the customer
//            has no saved addresses yet, or explicitly taps "Add New
//            Address". Pinning a location is mandatory for a NEW address —
//            confirming here saves it to the global address book (with
//            lat/lng attached) before continuing to the nearest-store
//            lookup, so it's immediately available as a one-tap option
//            next time.
// Once a store has been resolved, ExpressEntry (see App.jsx) skips this
// page entirely on future visits — this page is only reached on first use
// or when the customer explicitly taps "Change location" from the shop.
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiSearch, FiMapPin, FiArrowLeft, FiX, FiCheck, FiZap, FiPlus, FiEdit2, FiTrash2, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';
import { useAuth } from '../../context/AuthContext';

const DEFAULT = { lat: 13.0389, lng: 80.1730 }; // Valasaravakkam, Chennai — fallback only, rarely hit now

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

function geocodeAddressText(addr) {
  return new Promise(resolve => {
    const g = new window.google.maps.Geocoder();
    const text = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    g.geocode({ address: text }, (results, status) => {
      if (status !== 'OK' || !results?.length) { resolve(null); return; }
      const loc = results[0].geometry.location;
      resolve({ lat: loc.lat(), lng: loc.lng() });
    });
  });
}

export default function ExpressLocationPicker() {
  const navigate = useNavigate();
  const { setSelectedStore } = useExpressCart();
  const { user, loadUser } = useAuth();

  const addresses = user?.addresses || [];
  const [mode, setMode] = useState(addresses.length > 0 ? 'list' : 'pin');
  const [checkingId, setCheckingId] = useState(null); // address._id currently being resolved (list mode)

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const geoTimer = useRef(null);
  const acRef = useRef(null);
  const tokenRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [center, setCenter] = useState(DEFAULT);
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState('');
  const [mapMoving, setMapMoving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outOfRange, setOutOfRange] = useState(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [showSugg, setShowSugg] = useState(false);

  // New-address save form, shown after confirming a pin in 'pin' mode
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveForm, setSaveForm] = useState({ label: 'Home', fullName: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const pendingConfirm = useRef(null); // { lat, lng } queued while the save-address form is open

  // ── Init map (only needed once we're in 'pin' mode, or to geocode a
  // saved address that has no lat/lng yet) ────────────────────────────
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(() => {
        if (!alive) return;
        setMapReady(true);
        if (mode !== 'pin' || !mapDivRef.current) return;
        initMap();
      })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; clearTimeout(geoTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const initMap = useCallback(() => {
    if (mapRef.current || !mapDivRef.current) return;
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
        reverseGeocode(pos.lat, pos.lng).then(r => { setShortAddr(r.short); setFullAddr(r.full); });
      }, 400);
    });
    mapRef.current = map;
    acRef.current = new window.google.maps.places.AutocompleteService();
    tokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => { setShortAddr(r.short); setFullAddr(r.full); });
  }, []);

  useEffect(() => {
    if (mode === 'pin' && mapReady) initMap();
  }, [mode, mapReady, initMap]);

  // ── Search debounce (pin mode) ───────────────────────────────────────
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

  // ── Nearest-store lookup, shared by both modes ───────────────────────
  const checkAndProceed = async (lat, lng, storeSuccessMsg) => {
    try {
      const { data } = await api.post('/express/nearest-store', { lat, lng });
      if (data.expressDisabled) {
        toast.error('Eptomart Express is currently unavailable.');
        return { ok: false, message: 'Eptomart Express is currently unavailable.' };
      }
      if (!data.withinRange) {
        return { ok: false, message: data.message || "You're outside our Express delivery range." };
      }
      setSelectedStore(data.store);
      toast.success(storeSuccessMsg || `Delivering from our ${data.store.name} store`);
      navigate('/express/shop');
      return { ok: true };
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check delivery availability');
      return { ok: false };
    }
  };

  // ── List mode: pick a saved address ──────────────────────────────────
  const deliverToAddress = async (addr) => {
    setCheckingId(addr._id);
    setOutOfRange(null);
    try {
      let { lat, lng } = addr;
      if (lat == null || lng == null) {
        // Legacy address with no coordinates — geocode it on the fly so the
        // customer never has to manually re-pin an address they already saved.
        await loadGoogleMaps();
        const geo = await geocodeAddressText(addr);
        if (!geo) { toast.error('Could not locate this address on the map — try adding it again with a pin.'); return; }
        lat = geo.lat; lng = geo.lng;
      }
      const result = await checkAndProceed(lat, lng, `Delivering to ${addr.label || 'your address'}`);
      if (!result.ok && result.message) setOutOfRange({ message: result.message });
    } finally {
      setCheckingId(null);
    }
  };

  const removeAddress = async (addr) => {
    if (!window.confirm(`Remove "${addr.label || 'this address'}"?`)) return;
    try {
      await api.delete(`/auth/address/${addr._id}`);
      await loadUser();
      toast.success('Address removed');
    } catch {
      toast.error('Failed to remove address');
    }
  };

  // ── Pin mode: confirm → save as a new address → proceed ──────────────
  const confirmPin = () => {
    if (!center || mapMoving || checking) return;
    pendingConfirm.current = { lat: center.lat, lng: center.lng };
    setShowSaveForm(true);
  };

  const saveNewAddressAndProceed = async () => {
    if (!saveForm.fullName || !saveForm.phone) return toast.error('Name and phone are required');
    const { lat, lng } = pendingConfirm.current || center;
    setSaving(true);
    setChecking(true);
    try {
      await api.post('/auth/add-address', {
        label: saveForm.label, fullName: saveForm.fullName, phone: saveForm.phone,
        addressLine1: fullAddr || shortAddr, city: '', state: '', pincode: '',
        lat, lng,
      });
      await loadUser();
      setShowSaveForm(false);
      const result = await checkAndProceed(lat, lng);
      if (!result.ok && result.message) setOutOfRange({ message: result.message });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save address');
    } finally {
      setSaving(false);
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

  // ══════════════════════════════ LIST MODE ══════════════════════════════
  if (mode === 'list') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
        <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 active:bg-gray-200">
              <FiArrowLeft size={17} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <FiZap className="text-amber-500 shrink-0" size={15} />
              <span className="font-bold text-gray-800 text-sm truncate">Choose delivery address</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {outOfRange && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800 font-semibold mb-2">{outOfRange.message}</p>
                <button onClick={() => navigate('/koyambedu')} className="text-xs font-bold text-amber-900 underline">
                  Shop Koyambedu Daily instead →
                </button>
              </div>
            )}

            <div className="grid gap-2 mb-3">
              {addresses.map(addr => (
                <div key={addr._id} className="border rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => deliverToAddress(addr)} disabled={checkingId === addr._id} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <FiHome size={11} className="text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{addr.label || 'Home'}</span>
                        {addr.isDefault && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">Default</span>}
                      </div>
                      <p className="font-bold text-gray-900 text-sm truncate">{addr.fullName}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{[addr.addressLine1, addr.addressLine2, addr.city].filter(Boolean).join(', ') || 'Tap to use this address'}</p>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <Link to="/profile" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><FiEdit2 size={13} /></Link>
                      <button onClick={() => removeAddress(addr)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><FiTrash2 size={13} /></button>
                    </div>
                  </div>
                  <button onClick={() => deliverToAddress(addr)} disabled={checkingId === addr._id}
                    className="w-full mt-2 py-2 rounded-xl font-bold text-xs text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
                    {checkingId === addr._id ? 'Checking…' : 'Deliver Here'}
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setMode('pin')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-50">
              <FiPlus size={15} /> Add New Address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════ PIN MODE ══════════════════════════════
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6">
      <div className="relative w-full max-w-md h-[82vh] max-h-[680px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 bg-white z-20">
          <button onClick={() => (addresses.length > 0 ? setMode('list') : navigate(-1))}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100 active:bg-gray-200">
            <FiArrowLeft size={17} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <FiZap className="text-amber-500 shrink-0" size={15} />
            <span className="font-bold text-gray-800 text-sm truncate">Pin your delivery location</span>
          </div>
        </div>

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

        <div className="relative flex-1 min-h-0">
          <div ref={mapDivRef} className="absolute inset-0" />

          {!mapReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Loading map…</p>
            </div>
          )}

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

        <div className="shrink-0 bg-white px-4 pt-3 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
          {!showSaveForm ? (
            <>
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-indigo-50">
                  <FiMapPin size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                    {mapMoving ? 'Adjusting…' : 'Delivery location'}
                  </p>
                  <p className="font-extrabold text-gray-900 text-sm leading-tight truncate">
                    {mapMoving ? 'Keep dragging…' : shortAddr || 'Drag the map to your location'}
                  </p>
                  {!mapMoving && fullAddr && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{fullAddr}</p>}
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

              <button onClick={confirmPin} disabled={!center || mapMoving || checking || !mapReady}
                className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
                style={{ background: (!mapMoving && mapReady) ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#d1d5db' }}>
                <FiCheck size={18} /> {mapMoving ? 'Keep dragging…' : 'Confirm Location'}
              </button>
            </>
          ) : (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Save this address</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={saveForm.label} onChange={e => setSaveForm(f => ({ ...f, label: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                  {['Home', 'Work', 'Other'].map(l => <option key={l}>{l}</option>)}
                </select>
                <input placeholder="Phone" value={saveForm.phone} onChange={e => setSaveForm(f => ({ ...f, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <input placeholder="Full name" value={saveForm.fullName} onChange={e => setSaveForm(f => ({ ...f, fullName: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mb-2" />
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{fullAddr || shortAddr}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowSaveForm(false)} className="flex-1 py-3 rounded-2xl border font-bold text-sm">Back</button>
                <button onClick={saveNewAddressAndProceed} disabled={saving}
                  className="flex-1 py-3 rounded-2xl font-extrabold text-white text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
                  {saving ? 'Saving…' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
