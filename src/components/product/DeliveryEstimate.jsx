import React, { useState, useEffect } from 'react';
import { FiTruck, FiMapPin, FiLoader } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DeliveryEstimate({ productId, sellerId }) {
  const [pincode,   setPincode]   = useState('');
  const [estimate,  setEstimate]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [inputMode, setInputMode] = useState(false);
  const { user }                  = useAuth();

  // Auto-load if user has address pincode
  useEffect(() => {
    const userPin = user?.addresses?.[0]?.pincode;
    if (userPin) {
      setPincode(userPin);
      fetch(userPin);
    }
  }, [user]);

  const fetch = async (pin) => {
    if (!pin || pin.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await api.post('/delivery/estimate', { productId, sellerId, buyerPincode: pin });
      setEstimate(data.estimate);
    } catch (_) { setEstimate(null); }
    finally { setLoading(false); setInputMode(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); fetch(pincode); };

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

      {estimate && !inputMode ? (
        <div className="flex items-start justify-between">
          <div>
            <p className={`font-semibold ${tierColor[estimate.tier] || 'text-gray-700'}`}>
              🚚 {estimate.label}
            </p>
            {estimate.distanceKm && (
              <p className="text-xs text-gray-400">~{estimate.distanceKm} km from seller</p>
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
            {loading ? '...' : 'Check'}
          </button>
        </form>
      )}
    </div>
  );
}
