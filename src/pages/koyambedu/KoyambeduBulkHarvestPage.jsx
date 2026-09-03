// ============================================
// KOYAMBEDU BULK HARVEST — Public page (ad board, no cart/checkout)
// Teaser (crop, quantity, price, location, photos) is visible to every
// visitor. Tapping "Call Farmer" requires login — that's the only gated
// action, and it's the lead signal the admin dashboard tracks.
// ============================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPhoneCall, FiMapPin, FiLock, FiCalendar, FiTruck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

function ListingCard({ listing }) {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [revealing, setRevealing] = useState(false);

  const img = listing.images?.[0]?.url || 'https://placehold.co/400x300/dcfce7/166534?text=🌾';
  const harvestText = listing.harvestWindow?.start
    ? `Harvest: ${fmtDate(listing.harvestWindow.start)}${listing.harvestWindow.end ? ` – ${fmtDate(listing.harvestWindow.end)}` : ''}`
    : null;

  const callFarmer = async () => {
    if (!isLoggedIn) {
      toast('Login to call the farmer directly', { icon: '🔒' });
      navigate('/login', { state: { from: '/koyambedu' } });
      return;
    }
    setRevealing(true);
    try {
      const { data } = await api.post(`/koyambedu/bulk-harvest/${listing._id}/reveal`);
      window.location.href = `tel:${data.farmerPhone}`;
    } catch {
      toast.error('Could not connect — please try again');
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        <img src={img} alt={listing.cropName} className="w-full h-40 object-cover" />
        <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          {listing.quantityAvailable} {listing.quantityUnit} available
        </span>
      </div>

      <div className="p-4">
        {listing.headline && (
          <p className="text-sm font-bold text-green-800 leading-snug mb-1.5">{listing.headline}</p>
        )}
        <p className="text-base font-black text-gray-900">{listing.cropName}{listing.variety ? ` — ${listing.variety}` : ''}</p>

        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
          <FiMapPin size={12} />
          <span>{[listing.location?.district, listing.location?.state].filter(Boolean).join(', ')}</span>
        </div>

        {listing.dailyRate && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <FiTruck size={12} />
            <span>{listing.dailyRate} {listing.dailyRateUnit} ready to dispatch</span>
          </div>
        )}

        {harvestText && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <FiCalendar size={12} />
            <span>{harvestText}</span>
          </div>
        )}

        <p className="text-sm font-bold text-gray-800 mt-2">{listing.priceText}</p>

        <button
          onClick={callFarmer}
          disabled={revealing}
          className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
        >
          {isLoggedIn
            ? <><FiPhoneCall size={15} /> {revealing ? 'Connecting…' : `Call now — grab this harvest`}</>
            : <><FiLock size={14} /> Login to call the farmer</>}
        </button>
      </div>
    </div>
  );
}

export default function KoyambeduBulkHarvestPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    api.get('/koyambedu/bulk-harvest', { params: stateFilter ? { state: stateFilter } : {} })
      .then(({ data }) => setListings(data.listings || []))
      .catch(() => toast.error('Failed to load bulk harvest listings'))
      .finally(() => setLoading(false));
  }, [stateFilter]);

  const states = [...new Set(listings.map(l => l.location?.state).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          🌾 Bulk harvest, direct from farmers
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tonnage-scale availability across India — call the farmer directly, no middlemen.
        </p>
      </div>

      {states.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setStateFilter('')} className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${!stateFilter ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>All states</button>
          {states.map(s => (
            <button key={s} onClick={() => setStateFilter(s)} className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${stateFilter === s ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading listings…</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No bulk harvest listings right now — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => <ListingCard key={l._id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
