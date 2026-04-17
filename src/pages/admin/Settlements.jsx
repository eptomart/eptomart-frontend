// ============================================
// PAYMENT SETTLEMENTS — SuperAdmin only
// Track and manage seller payment settlements
// ============================================
import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  settled:   { label: 'Settled',   cls: 'bg-green-100 text-green-700',   icon: FiCheckCircle },
  on_hold:   { label: 'On Hold',   cls: 'bg-red-100 text-red-600',       icon: FiAlertCircle },
};

export default function AdminSettlements() {
  const [sellers,  setSellers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [notes,    setNotes]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sellers');
      setSellers(data.sellers || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markSettled = async (seller) => {
    if (!confirm(`Mark settlement as paid for ${seller.businessName}?`)) return;
    setSaving(true);
    try {
      await api.patch(`/sellers/${seller._id}`, {
        settlement: {
          status:         'settled',
          lastSettledAt:  new Date().toISOString(),
          pendingAmount:  0,
          notes,
        },
      });
      toast.success('Settlement marked as paid');
      setSelected(null);
      setNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settlement');
    } finally { setSaving(false); }
  };

  const totalPending = sellers.reduce((sum, s) => sum + (s.settlement?.pendingAmount || 0), 0);
  const settledCount = sellers.filter(s => s.settlement?.status === 'settled').length;
  const pendingCount = sellers.filter(s => (s.settlement?.pendingAmount || 0) > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Payment Settlements</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track seller payouts after order delivery. Eptomart receives payment first, then releases to sellers.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-800">{formatINR(totalPending)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Pending Payouts</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sellers Awaiting Settlement</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">{settledCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Settled This Cycle</p>
        </div>
      </div>

      {/* Seller settlement table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-4">Seller</th>
                <th className="text-right p-4">Pending Amount</th>
                <th className="text-right p-4 hidden md:table-cell">Held Amount</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4 hidden lg:table-cell">Last Settled</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sellers.map(s => {
                const st     = s.settlement || {};
                const status = st.status || 'pending';
                const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                const Icon   = cfg.icon;
                const pending = st.pendingAmount || 0;

                return (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{s.businessName}</p>
                      <p className="text-xs text-gray-400">{s.contact?.email || s.contact?.phone || '—'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className={`font-semibold ${pending > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {formatINR(pending)}
                      </p>
                    </td>
                    <td className="p-4 text-right hidden md:table-cell text-gray-500">
                      {formatINR(st.heldAmount || 0)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell text-gray-400 text-xs">
                      {st.lastSettledAt ? new Date(st.lastSettledAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-4 text-right">
                      {pending > 0 && (
                        <button
                          onClick={() => setSelected(s)}
                          className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Mark Settled
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sellers.length === 0 && (
            <div className="p-12 text-center text-gray-400">No sellers found</div>
          )}
        </div>
      )}

      {/* Settlement confirmation modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiDollarSign size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Confirm Settlement</h3>
                <p className="text-sm text-gray-500">{selected.businessName}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Pending Amount</span>
                <span className="font-bold text-orange-600">{formatINR(selected.settlement?.pendingAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Seller Account</span>
                <span className="text-gray-700">{selected.contact?.email || selected.contact?.phone || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="input-field resize-none text-sm"
                placeholder="Transaction ID, bank reference, etc."
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setSelected(null); setNotes(''); }} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={() => markSettled(selected)}
                disabled={saving}
                className="btn-primary flex-1 bg-green-500 hover:bg-green-600"
              >
                {saving ? 'Saving...' : '✅ Mark as Settled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
