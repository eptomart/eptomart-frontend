import React, { useState, useEffect, useCallback } from 'react';
import { FiTruck, FiMapPin } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DeliveryEstimate({ productId, sellerId, deliveryPincode }) {
  const [pincode,   setPincode]   = useState('');
  const [estimate,  setEstimate]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [inputMode, setInputMode] = useState(false);
  const { user }                  = useAuth();

  // If parent passes a pincode (e.g. from Checkout), use it
  useEffect(() => {
    if (deliveryPincode && deliveryPincode.length === 6 && deliveryPincode !== pincode) {
      setPincode(deliveryPincode);
      fetchEstimate(deliveryPincode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryPincode]);

  // Auto-load if user has saved address pincode
  useEffect(() => {
    if (deliveryPincode) return; // prefer parent-passed pincode
    const userPin = user?.addresses?.[0]?.pincode;
    if (userPin && userPin !== pincode) {
      setPincode(userPin);
      fetchEstimate(userPin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchEstimate = useCallback(async (pin) => {
    if (!pin || pin.length !== 6) return;
    setLoading(true);
    setEstimate(null);
    try {
      // Try Shiprocket EDD first (uses real courier serviceability)
      const { data: codData } = await api.get(`/delivery/cod-check?delivery=${pin}`);
      if (codData.success && codData.edd) {
        const eddDate = new Date(codData.edd);
        const today   = new Date();
        const diffMs  = eddDate - today;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setEstimate({
          source:      'shiprocket',
          label:       diffDays <= 2 ? `Delivery by ${eddDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}` : `${codData.eddDays || diffDays} day${(codData.eddDays || diffDays) !== 1 ? 's' : ''} delivery`,
          edd:         codData.edd,
          eddDays:     codData.eddDays || diffDays,
          courierName: codData.courierName || '',
          codAvailable:codData.codAvailable,
          tier:        diffDays <= 1 ? 'local' : diffDays <= 3 ? 'regional' : diffDays <= 7 ? 'national' : 'remote',
        });
        setInputMode(false);
        setLoading(false);
        return;
      }
    } catch (_) {}

    // Fall back to internal estimate (distance-based)
    try {
      const { data } = await api.post('/delivery/estimate', { productId, sellerId, buyerPincode: pin });
      setEstimate({ source: 'internal', ...data.estimate });
    } catch (_) { setEstimate(null); }
    finally { setLoading(false); setInputMode(false); }
  }, [productId, sellerId]);

  const handleSubmit = (e) => { e.preventDefault(); fetchEstimate(pincode); };

  const tierColor = {
    same_day: 'text-green-600',
    local:    'text-green-600',
    regional: 'text-blue-600',
    national: 'text-orange-600',
    remote:   'text-red-500',
  };

  return (
    <div className="border border-gray-200 rounded-xl p-3 text-sm">
      <div className="flex items-center gap-1.5 text-gray-600 mb-2">
        <FiTruck size={15} />
        <span className="font-medium">Delivery Estimate</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-xs py-1">
          <span className="w-3 h-3 border-2 border-gray-300 border-t-primary-400 rounded-full animate-spin" />
          Checking availability...
        </div>
      ) : estimate && !inputMode ? (
        <div className="flex items-start justify-between">
          <div>
            <p className={`font-semibold ${tierColor[estimate.tier] || 'text-gray-700'}`}>
              🚚 {estimate.label}
            </p>
            {estimate.courierName && (
              <p className="text-xs text-gray-400">via {estimate.courierName}</p>
            )}
            {!estimate.courierName && estimate.distanceKm && (
              <p className="text-xs text-gray-400">~{estimate.distanceKm} km from seller</p>
            )}
            {estimate.codAvailable === false && (
              <p className="text-xs text-amber-600 mt-0.5">⚠️ COD not available for this pincode</p>
            )}
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <FiMapPin size={11} /> {pincode}
              <button onClick={() => setInputMode(true)} className="ml-1 text-primary-500 hover:underline">Change</button>
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={pincode}
            onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter delivery pincode"
            maxLength={6}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <button type="submit" disabled={loading || pincode.length !== 6}
            className="bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50">
            Check
          </button>
        </form>
      )}
    </div>
  );
}
