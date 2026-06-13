// ============================================
// ADMIN — Coupons / Promo Code Management
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiTag, FiPlus, FiCheck, FiX, FiToggleLeft, FiToggleRight,
  FiTrash2, FiRefreshCw, FiFilter, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { value: 'all',       label: '🌐 All Platforms' },
  { value: 'main',      label: '🛒 Eptomart Main' },
  { value: 'koyambedu', label: '🥬 Koyambedu Daily' },
  { value: 'uzhavar',   label: '🌾 Farmer Fresh' },
  { value: 'eptofresh', label: '🥩 EptoFresh Proteins' },
];

const STATUS_FILTERS = [
  { value: '',              label: 'All' },
  { value: 'pending',       label: 'Pending' },
  { value: 'admin_created', label: 'Admin Created' },
  { value: 'approved',      label: 'Approved' },
  { value: 'rejected',      label: 'Rejected' },
];

const STATUS_BADGE = {
  admin_created: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Admin' },
  pending:       { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  approved:      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Approved' },
  rejected:      { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' },
};

const PLATFORM_LABEL = {
  all:       '🌐 All',
  main:      '🛒 Main',
  koyambedu: '🥬 Koyambedu',
  uzhavar:   '🌾 Uzhavar',
  eptofresh: '🥩 EptoFresh',
};

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const emptyForm = {
  code: '', discountType: 'percent', discountValue: '',
  maxDiscount: '', minOrderValue: '', maxUsage: '100',
  validFrom: today(), validTo: inDays(30),
  description: '', platformRestriction: 'all',
  assignedSellerName: '', assignedSellerId: '',
  allowMultipleUsePerBuyer: false,
};

export default function AdminCoupons() {
  const [coupons,       setCoupons]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [creating,      setCreating]      = useState(false);
  const [rejectId,      setRejectId]      = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [busy,          setBusy]          = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/coupon/admin/all${params}`);
      setCoupons(data.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const setBusyId = (id, val) => setBusy(b => ({ ...b, [id]: val }));

  const handleToggle = async (c) => {
    setBusyId(c._id, 'toggle');
    try {
      const { data } = await api.patch(`/coupon/admin/${c._id}/toggle`);
      setCoupons(prev => prev.map(x => x._id === c._id ? data.coupon : x));
      toast.success(data.coupon.isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch {
      toast.error('Failed to toggle coupon');
    } finally {
      setBusyId(c._id, null);
    }
  };

  const handleApprove = async (id) => {
    setBusyId(id, 'approve');
    try {
      const { data } = await api.patch(`/coupon/admin/${id}/approve`);
      setCoupons(prev => prev.map(x => x._id === id ? data.coupon : x));
      toast.success('Coupon approved & activated');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setBusyId(id, null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id, 'reject');
    try {
      const { data } = await api.patch(`/coupon/admin/${id}/reject`, { reason: rejectReason });
      setCoupons(prev => prev.map(x => x._id === id ? data.coupon : x));
      setRejectId(null);
      setRejectReason('');
      toast.success('Coupon rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setBusyId(id, null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon permanently?')) return;
    setBusyId(id, 'delete');
    try {
      await api.delete(`/coupon/admin/${id}`);
      setCoupons(prev => prev.filter(x => x._id !== id));
      toast.success('Coupon deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setBusyId(id, null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = { ...form };
      if (!payload.maxDiscount) delete payload.maxDiscount;
      if (!payload.assignedSellerId) delete payload.assignedSellerId;
      if (!payload.assignedSellerName) delete payload.assignedSellerName;
      const { data } = await api.post('/coupon/admin/create', payload);
      setCoupons(prev => [data.coupon, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`Coupon ${data.coupon.code} created`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const pending = coupons.filter(c => c.requestStatus === 'pending');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiTag className="text-indigo-500" /> Promo Codes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage coupons across all platforms</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            {showForm ? <FiChevronUp size={14} /> : <FiPlus size={14} />}
            {showForm ? 'Cancel' : 'New Coupon'}
          </button>
        </div>
      </div>

      {/* Pending requests banner */}
      {pending.length > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          ⏳ <strong>{pending.length}</strong> seller promo request{pending.length > 1 ? 's' : ''} waiting for approval — scroll down to review.
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Create New Coupon</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest"
                placeholder="SAVE20"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Discount Type *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={form.discountType}
                onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
              >
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {form.discountType === 'percent' ? 'Discount %' : 'Discount ₹'} *
              </label>
              <input
                required type="number" min="1" max={form.discountType === 'percent' ? 100 : undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder={form.discountType === 'percent' ? '20' : '50'}
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
              />
            </div>

            {form.discountType === 'percent' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Discount Cap ₹ (optional)</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="200"
                  value={form.maxDiscount}
                  onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Order ₹</label>
              <input
                type="number" min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="0"
                value={form.minOrderValue}
                onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Usage</label>
              <input
                type="number" min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="100"
                value={form.maxUsage}
                onChange={e => setForm(f => ({ ...f, maxUsage: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid From *</label>
              <input
                required type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={form.validFrom}
                onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid To *</label>
              <input
                required type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={form.validTo}
                onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Platform</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={form.platformRestriction}
                onChange={e => setForm(f => ({ ...f, platformRestriction: e.target.value }))}
              >
                {PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Description (shown to customers)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Get 20% off on your order"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Multi-use checkbox */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.allowMultipleUsePerBuyer}
                    onChange={e => setForm(f => ({ ...f, allowMultipleUsePerBuyer: e.target.checked }))}
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${form.allowMultipleUsePerBuyer ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white group-hover:border-indigo-400'}`}>
                    {form.allowMultipleUsePerBuyer && <FiCheck size={12} className="text-white" />}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Allow same buyer to use multiple times</p>
                  <p className="text-xs text-gray-400 mt-0.5">If unchecked, each customer can only redeem this coupon once. Check this for loyalty or birthday coupons.</p>
                </div>
              </label>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                {creating ? 'Creating…' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <FiFilter size={14} className="text-gray-400" />
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full border cursor-pointer transition-colors ${
              statusFilter === f.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            {f.label}
            {f.value === 'pending' && pending.length > 0 && (
              <span className="ml-1 bg-yellow-400 text-yellow-900 rounded-full px-1.5 text-xs font-bold">
                {pending.length}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiTag size={32} className="mx-auto mb-2 opacity-30" />
          No coupons found
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const sb = STATUS_BADGE[c.requestStatus] || STATUS_BADGE.admin_created;
            const expired = new Date(c.validTo) < new Date();
            return (
              <div
                key={c._id}
                className={`bg-white rounded-2xl border shadow-sm p-4 ${
                  !c.isActive || expired ? 'opacity-60' : ''
                } ${c.requestStatus === 'pending' ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  {/* Code + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-base text-gray-800 tracking-widest">{c.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sb.bg} ${sb.text}`}>
                        {sb.label}
                      </span>
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>
                      )}
                      {!c.isActive && !expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        {PLATFORM_LABEL[c.platformRestriction] || c.platformRestriction}
                      </span>
                      {c.allowMultipleUsePerBuyer && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Multi-use</span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {c.discountType === 'percent'
                        ? `${c.discountValue}% off${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}`
                        : `₹${c.discountValue} off`}
                      {c.minOrderValue > 0 && ` · min ₹${c.minOrderValue}`}
                      {' · '}
                      {c.usedCount}/{c.maxUsage} used
                    </p>

                    {c.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.validFrom).toLocaleDateString('en-IN')} →{' '}
                      {new Date(c.validTo).toLocaleDateString('en-IN')}
                      {c.assignedSellerName && ` · Seller: ${c.assignedSellerName}`}
                    </p>

                    {c.requestReason && (
                      <p className="text-xs text-gray-500 mt-1 italic">Request reason: {c.requestReason}</p>
                    )}
                    {c.rejectReason && (
                      <p className="text-xs text-red-500 mt-1">Reject reason: {c.rejectReason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Approve / Reject for pending */}
                    {c.requestStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(c._id)}
                          disabled={!!busy[c._id]}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 cursor-pointer"
                        >
                          <FiCheck size={12} /> Approve
                        </button>
                        {rejectId === c._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="border border-red-300 rounded-lg px-2 py-1 text-xs w-36"
                              placeholder="Reason (optional)"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                            />
                            <button
                              onClick={() => handleReject(c._id)}
                              disabled={!!busy[c._id]}
                              className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectReason(''); }}
                              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <FiX size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectId(c._id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <FiX size={12} /> Reject
                          </button>
                        )}
                      </>
                    )}

                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={!!busy[c._id]}
                      title={c.isActive ? 'Deactivate' : 'Activate'}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border cursor-pointer disabled:opacity-60 ${
                        c.isActive
                          ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {c.isActive
                        ? <><FiToggleRight size={14} /> Active</>
                        : <><FiToggleLeft size={14} /> Inactive</>}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(c._id)}
                      disabled={!!busy[c._id]}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 cursor-pointer disabled:opacity-60"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
