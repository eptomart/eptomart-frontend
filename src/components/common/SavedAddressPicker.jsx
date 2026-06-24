/**
 * SavedAddressPicker
 * Shows the user's saved profile addresses as selectable cards.
 * Used in every checkout's Step 0 so they can pick instead of re-typing.
 *
 * Props:
 *   addresses    — user?.addresses array
 *   selectedId   — _id of the currently chosen address (string | null)
 *   onSelect(a)  — called with the full address object when a card is tapped
 *   onNewAddress — called when user taps "+ New Address" to clear selection
 */
import { FiMapPin, FiCheck, FiPlus } from 'react-icons/fi';

export default function SavedAddressPicker({ addresses = [], selectedId, onSelect, onNewAddress }) {
  if (!addresses.length) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Saved Addresses</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {addresses.map(addr => {
          const isSelected = selectedId === String(addr._id);
          return (
            <button
              key={addr._id}
              type="button"
              onClick={() => onSelect(addr)}
              className={`shrink-0 w-52 text-left rounded-2xl p-3 border-2 transition ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 bg-white hover:border-green-200'
              }`}
              style={{ boxShadow: isSelected ? '0 0 0 2px rgba(22,163,74,0.15)' : '0 1px 6px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {addr.label || 'Home'}
                </span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <FiCheck size={10} className="text-white" />
                  </span>
                )}
              </div>
              <p className={`text-xs font-semibold truncate ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                {addr.fullName}
              </p>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
                {[addr.addressLine1, addr.addressLine2, addr.city].filter(Boolean).join(', ')}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{addr.pincode}</p>
            </button>
          );
        })}

        {/* New address card */}
        <button
          type="button"
          onClick={onNewAddress}
          className={`shrink-0 w-36 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed transition p-3 ${
            selectedId === null
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-400 hover:border-green-300 hover:text-green-600'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            selectedId === null ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <FiPlus size={16} />
          </div>
          <span className="text-[11px] font-bold text-center leading-tight">
            {selectedId === null ? 'Filling new address' : '+ New Address'}
          </span>
        </button>
      </div>
    </div>
  );
}
