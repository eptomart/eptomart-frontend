// ============================================
// EPTOMART EXPRESS — Location Picker
// Center-pin drag map (same UX pattern as KoyambeduLocationPicker), but
// instead of just remembering a delivery area, it calls the backend's
// nearest-active-store lookup and either routes the customer into the
// Express shop or explains why they're out of range / should use
// Koyambedu Daily instead (spec sections 8 & 9).
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiArrowLeft, FiCheck, FiZap } from 'react-icons/fi';
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
      if (status !== 'OK' || !results?.length) { resolve({ short: 'Unknown area' }); return; }
      const r = results[0];
      const c = r.address_components || [];
      const get = t => c.find(x => x.types.includes(t))?.long_name || '';
      const nb  = get('sublocality_level_2') || get('sublocality_level_1') || get('sublocality') || get('neighborhood');
      const loc = get('locality') || get('postal_town');
      const short = nb ? `${nb}, ${loc}`.replace(/^, |, $/, '') : loc || r.formatted_address.split(',')[0];
      resolve({ short });
    });
  });
}

export default function ExpressLocationPicker() {
  const navigate = useNavigate();
  const { setSelectedStore } = useExpressCart();

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const geoTimer = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [center, setCenter] = useState(DEFAULT);
  const [shortAddr, setShortAddr] = useState('Valasaravakkam, Chennai');
  const [mapMoving, setMapMoving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outOfRange, setOutOfRange] = useState(null); // { message } when checked and out of range

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
        });
        map.addListener('dragstart', () => setMapMoving(true));
        map.addListener('idle', () => {
          setMapMoving(false);
          const c = map.getCenter();
          const pos = { lat: c.lat(), lng: c.lng() };
          setCenter(pos);
          setOutOfRange(null);
          clearTimeout(geoTimer.current);
          geoTimer.current = setTimeout(() => {
            reverseGeocode(pos.lat, pos.lng).then(r => { if (alive) setShortAddr(r.short); });
          }, 400);
        });
        mapRef.current = map;
        reverseGeocode(DEFAULT.lat, DEFAULT.lng).then(r => { if (alive) setShortAddr(r.short); });
        setMapReady(true);
      })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; clearTimeout(geoTimer.current); };
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
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center bg-gray-50">
      <FiMapPin size={40} className="text-indigo-300" />
      <p className="font-bold text-gray-800 text-lg">Map unavailable</p>
      <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-2xl text-white font-bold text-sm bg-indigo-600">Go Back</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: '#e8e8e8' }}>
      <div ref={mapDivRef} className="absolute inset-0" />

      {!mapReady && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-gray-50">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading map…</p>
        </div>
      )}

      <div className="absolute left-0 right-0 z-40 px-3" style={{ top: 0, paddingTop: 'env(safe-area-inset-top, 44px)' }}>
        <div className="flex items-center gap-2 pb-2">
          <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white shadow-lg">
            <FiArrowLeft size={18} className="text-gray-700" />
          </button>
          <div className="flex-1 bg-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2">
            <FiZap className="text-amber-500" size={16} />
            <span className="font-bold text-gray-800 text-sm">Eptomart Express — Same-Day Delivery</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 220 }}>
        <div className="flex flex-col items-center">
          <div className="transition-all duration-200 ease-out" style={{ transform: mapMoving ? 'translateY(-14px) scale(1.1)' : 'translateY(0) scale(1)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#4f46e5', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(79,70,229,0.5)' }}>
              <FiMapPin className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-gray-200" />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-indigo-50">
            <FiMapPin size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              {mapMoving ? 'Adjusting…' : 'Delivery location'}
            </p>
            <p className="font-extrabold text-gray-900 text-base leading-tight">
              {mapMoving ? 'Keep dragging…' : shortAddr}
            </p>
          </div>
        </div>

        {outOfRange && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 font-semibold mb-2">{outOfRange.message}</p>
            <button onClick={() => navigate('/koyambedu')} className="text-xs font-bold text-amber-900 underline">
              Shop Koyambedu Daily instead →
            </button>
          </div>
        )}

        <button onClick={confirm} disabled={!center || mapMoving || checking || !mapReady}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: (!mapMoving && mapReady) ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#d1d5db' }}>
          <FiCheck size={20} />
          {checking ? 'Checking availability…' : mapMoving ? 'Keep dragging…' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
}
