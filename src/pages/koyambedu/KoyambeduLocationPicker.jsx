// ============================================
// KOYAMBEDU LOCATION PICKER
// Guest-accessible — no login required
// Sets delivery area via GPS or map tap
// Leaflet.js for map, OSM Nominatim for geocode
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiNavigation, FiCheck } from 'react-icons/fi';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';
import toast from 'react-hot-toast';

const KOYAMBEDU_LAT = 13.0748;
const KOYAMBEDU_LNG = 80.2136;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'Eptomart/1.0' } }
    );
    const data = await res.json();
    return data.address?.suburb || data.address?.neighbourhood || data.address?.village ||
           data.address?.town   || data.address?.city_district  || data.address?.county  || 'Your Location';
  } catch {
    return 'Your Location';
  }
};

export default function KoyambeduLocationPicker() {
  const navigate  = useNavigate();
  const { setUserLocation, setLocationLabel, userLocation, locationLabel } = useKoyambeduCart();

  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);

  const [pos,       setPos]       = useState(userLocation || null);
  const [areaName,  setAreaName]  = useState(locationLabel || '');
  const [distKm,    setDistKm]    = useState(null);
  const [gpsLoading,setGpsLoading]= useState(false);
  const [mapReady,  setMapReady]  = useState(false);

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) { initMap(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  const initMap = () => {
    if (leafletRef.current || !mapRef.current) return;
    const L   = window.L;
    const lat  = pos?.lat || 13.0827;
    const lng  = pos?.lng || 80.2707;
    const map  = L.map(mapRef.current).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:36px;height:36px;background:#16a34a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(22,163,74,0.4);border:3px solid #fff;"></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      className: '',
    });

    if (pos) {
      markerRef.current = L.marker([pos.lat, pos.lng], { icon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        await updatePin(lat, lng);
      });
    }

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', async (ev) => {
          const { lat: la, lng: ln } = ev.target.getLatLng();
          await updatePin(la, ln);
        });
      }
      await updatePin(lat, lng);
    });

    leafletRef.current = map;
    setMapReady(true);
  };

  const updatePin = async (lat, lng) => {
    const dist = haversineKm(lat, lng, KOYAMBEDU_LAT, KOYAMBEDU_LNG);
    setDistKm(Math.round(dist * 10) / 10);
    setPos({ lat, lng });
    const name = await reverseGeocode(lat, lng);
    setAreaName(name);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsLoading(false);
        if (leafletRef.current) {
          const L = window.L;
          const icon = L.divIcon({
            html: `<div style="width:36px;height:36px;background:#16a34a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(22,163,74,0.4);border:3px solid #fff;"></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            className: '',
          });
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(leafletRef.current);
            markerRef.current.on('dragend', async (ev) => {
              const { lat: la, lng: ln } = ev.target.getLatLng();
              await updatePin(la, ln);
            });
          }
          leafletRef.current.setView([lat, lng], 15);
        }
        await updatePin(lat, lng);
      },
      () => {
        setGpsLoading(false);
        toast.error('Could not get your location. Please tap the map.');
      },
      { timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!pos) { toast.error('Please select your delivery area on the map'); return; }
    setUserLocation(pos);
    setLocationLabel(areaName);
    toast.success(`Delivery area set: ${areaName}`);
    navigate(-1);
  };

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
            <p className="text-emerald-100 text-[10px] opacity-80">Tap the map or use GPS to pin your location</p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiMapPin size={15} className="text-white" />
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative flex-1" style={{ minHeight: 360 }}>
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: 360, zIndex: 1 }} />

        {/* GPS button overlay */}
        <button onClick={handleGPS} disabled={gpsLoading}
          className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition disabled:opacity-60"
          style={{ background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {gpsLoading
            ? <span className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            : <FiNavigation size={20} className="text-green-700" />}
        </button>
      </div>

      {/* ── Bottom panel ── */}
      <div className="shrink-0 bg-white px-4 py-4"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>

        {pos ? (
          <div className="mb-4">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)' }}>
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <FiMapPin size={16} className="text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate">{areaName || 'Selected Location'}</p>
                {distKm !== null && (
                  <p className={`text-xs mt-0.5 font-medium ${distKm <= 30 ? 'text-green-600' : 'text-red-500'}`}>
                    {distKm} km from Koyambedu market
                    {distKm > 30 && ' · Long distance charges may apply'}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center py-3">
            <p className="text-gray-400 text-sm font-medium">Tap anywhere on the map to set your delivery area</p>
            <p className="text-gray-300 text-xs mt-0.5">Or use the GPS button</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!pos}
          className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
          style={{ background: pos ? 'linear-gradient(135deg,#16a34a,#059669)' : '#d1d5db', boxShadow: pos ? '0 4px 16px rgba(22,163,74,0.4)' : 'none' }}>
          <FiCheck size={18} />
          Confirm Delivery Area
        </button>
      </div>
    </div>
  );
}
