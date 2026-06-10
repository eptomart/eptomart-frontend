// ============================================
// EPTOFRESH TRACKING — Live Delivery Tracking
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { FiArrowLeft, FiMapPin, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';

const STATUS_STEPS = [
  { key: 'placed',           label: 'Order Placed',        icon: '📋' },
  { key: 'accepted',         label: 'Seller Accepted',     icon: '✅' },
  { key: 'packed',           label: 'Packed & Ready',      icon: '📦' },
  { key: 'porter_assigned',  label: 'Driver Assigned',     icon: '🚗' },
  { key: 'picked_up',        label: 'Picked Up',           icon: '🔄' },
  { key: 'out_for_delivery', label: 'On The Way',          icon: '🛵' },
  { key: 'delivered',        label: 'Delivered',           icon: '🎉' },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

export default function EptoFreshTracking() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading]   = useState(true);
  const intervalRef = useRef(null);

  const fetchTracking = async () => {
    try {
      const { data } = await api.get(`/eptofresh/orders/${orderId}/tracking`);
      if (data.success) setTracking(data.tracking);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTracking();
    // Poll every 30s when order is active
    intervalRef.current = setInterval(fetchTracking, 30000);
    return () => clearInterval(intervalRef.current);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1729' }}>
        <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(tracking?.orderStatus);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      <Navbar />
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <FiArrowLeft className="text-white" />
        </button>
        <h1 className="text-white font-bold flex-1">Live Tracking</h1>
        <button onClick={fetchTracking} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <FiRefreshCw className="text-gray-400" size={16} />
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Map placeholder — integrate with Google Maps / Leaflet for real GPS */}
        {tracking?.porter?.driverLat && (
          <div className="rounded-2xl overflow-hidden" style={{ height: 200, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-full h-full flex items-center justify-center flex-col gap-2">
              <FiMapPin size={30} className="text-orange-400" />
              <p className="text-white text-sm font-semibold">Driver Location</p>
              <p className="text-gray-500 text-xs">Lat: {tracking.porter.driverLat?.toFixed(4)}, Lng: {tracking.porter.driverLng?.toFixed(4)}</p>
              {tracking.porter.trackingUrl && (
                <a href={tracking.porter.trackingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-orange-400 text-xs underline">Open in Porter App</a>
              )}
            </div>
          </div>
        )}

        {/* Driver info */}
        {tracking?.porter?.driverName && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center">
              <FiUser className="text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{tracking.porter.driverName}</p>
              <p className="text-gray-500 text-xs">Delivery Partner</p>
            </div>
            {tracking.porter.estimatedDelivery && (
              <div className="text-right">
                <p className="text-orange-400 text-sm font-bold flex items-center gap-1">
                  <FiClock size={12} />
                  {new Date(tracking.porter.estimatedDelivery).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-gray-500 text-[10px]">Est. arrival</p>
              </div>
            )}
          </div>
        )}

        {/* OTP */}
        {tracking?.deliveryOtp && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(244,148,28,0.08)', border: '1px solid rgba(244,148,28,0.25)' }}>
            <p className="text-gray-400 text-xs mb-1">Show this OTP to the delivery person</p>
            <p className="text-4xl font-black tracking-[0.3em] text-orange-400">{tracking.deliveryOtp}</p>
            <p className="text-gray-500 text-xs mt-1">Do not share with anyone else</p>
          </div>
        )}

        {/* Progress steps */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-white font-semibold mb-4">Order Progress</h3>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStatusIdx;
              const isCurrent   = idx === currentStatusIdx;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${isCurrent ? 'scale-110' : ''}`}
                      style={{ background: isCompleted ? (isCurrent ? '#f4941c' : 'rgba(52,211,153,0.2)') : 'rgba(255,255,255,0.05)' }}>
                      {isCompleted ? (isCurrent ? step.icon : '✓') : <span className="text-gray-600 text-xs">{idx + 1}</span>}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className="w-0.5 h-6 mt-1" style={{ background: isCompleted ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)' }} />
                    )}
                  </div>
                  <div className="pb-5 pt-1">
                    <p className="text-sm font-semibold" style={{ color: isCompleted ? (isCurrent ? '#f4941c' : '#34d399') : 'rgba(255,255,255,0.3)' }}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
