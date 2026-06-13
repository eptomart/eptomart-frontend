// ============================================
// SUPPLIER / MANUFACTURER REPOSITORY
// Track manufacturers and suppliers for sourcing
// ============================================
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiEdit2, FiTrash2, FiExternalLink,
  FiInstagram, FiYoutube, FiPhone, FiMail, FiMapPin,
  FiSearch, FiStar, FiZap, FiRefreshCw, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';

const STATUS_OPTIONS = [
  { value: 'interested',    label: '✅ Interested',    color: 'bg-green-100 text-green-700'  },
  { value: 'not_interested',label: '❌ Not Interested', color: 'bg-red-100 text-red-700'     },
  { value: 'follow_up',     label: '🔁 Follow Up',      color: 'bg-yellow-100 text-yellow-700'},
  { value: 'onboarded',     label: '🚀 Onboarded',      color: 'bg-blue-100 text-blue-700'   },
  { value: 'rejected',      label: '🚫 Rejected',       color: 'bg-gray-100 text-gray-600'   },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    color: 'text-gray-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high',   label: 'High',   color: 'text-red-600' },
];

const BLANK_FORM = {
  name: '', company: '', contactName: '', phone: '', email: '', location: '',
  instagramUrl: '', youtubeUrl: '', websiteUrl: '', otherRefUrl: '',
  productCategories: '',
  productsDescription: '',
  status: 'follow_up', followUpDate: '', comments: '', internalNotes: '',
  tags: '', priority: 'medium',
};

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status);
  return s
    ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
    : null;
}

// ── Supplier Form Modal ────────────────────────────────────
function SupplierModal({ supplier, onClose, onSaved }) {
  const [form,    setForm]    = useState(supplier ? {
    ...BLANK_FORM, ...supplier,
    productCategories: (supplier.productCategories || []).join(', '),
    tags: (supplier.tags || []).join(', '),
    followUpDate: supplier.followUpDate ? supplier.followUpDate.split('T')[0] : '',
  } : BLANK_FORM);
  const [saving,  setSaving]  = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        productCategories: form.productCategories.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        followUpDate: form.followUpDate || null,
      };
      let result;
      if (supplier?._id) {
        result = await api.put(`/suppliers/${supplier._id}`, payload);
      } else {
        result = await api.post('/suppliers', payload);
      }
      toast.success(supplier ? 'Supplier updated!' : 'Supplier added!');
      onSaved(result.data.supplier);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">
            {supplier ? 'Edit Supplier' : 'Add New Supplier / Manufacturer'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name / Brand *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Ram Farms" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company / Entity</label>
              <input value={form.company} onChange={e => set('company', e.target.value)}
                placeholder="Legal company name" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
                placeholder="Owner / rep name" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiPhone size={13} /> Phone Number
              </label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+91 99XX XXXXXX" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiMail size={13} /> Email
              </label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="contact@supplier.com" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <FiMapPin size={13} /> Location
              </label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="Chennai, Tamil Nadu" className="input-field" />
            </div>
          </div>

          {/* Social / Reference links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              Reference Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <FiInstagram size={16} className="text-pink-500 flex-shrink-0" />
                <input value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)}
                  placeholder="Instagram URL" className="input-field flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <FiYoutube size={16} className="text-red-500 flex-shrink-0" />
                <input value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)}
                  placeholder="YouTube URL / Channel" className="input-field flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <FiExternalLink size={16} className="text-blue-500 flex-shrink-0" />
                <input value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)}
                  placeholder="Website / Catalogue URL" className="input-field flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <FiExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                <input value={form.otherRefUrl} onChange={e => set('otherRefUrl', e.target.value)}
                  placeholder="Other reference link" className="input-field flex-1" />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Categories</label>
              <input value={form.productCategories} onChange={e => set('productCategories', e.target.value)}
                placeholder="Vegetables, Fruits, Spices (comma-separated)" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)}
                placeholder="organic, bulk, local (comma-separated)" className="input-field" />
            </div>
          </div>

          {/* Description (AI-fillable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description & Benefits</label>
            <textarea value={form.productsDescription} onChange={e => set('productsDescription', e.target.value)}
              rows={3} placeholder="What they supply, why they're a good fit..."
              className="input-field resize-none" />
          </div>

          {/* CRM status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input-field">
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
              <input type="date" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)}
                className="input-field" />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Notes</label>
            <textarea value={form.comments} onChange={e => set('comments', e.target.value)}
              rows={3} placeholder="Any notes about this supplier — pricing, minimum order, quality..."
              className="input-field resize-none" />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-60">
            {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : 'Save Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Card ──────────────────────────────────────────
function SupplierCard({ supplier, onEdit, onDelete, onAIDescribe }) {
  const [expanded,    setExpanded]    = useState(false);
  const [aiLoading,   setAILoading]   = useState(false);

  const handleAI = async () => {
    setAILoading(true);
    try {
      const { data } = await api.post(`/suppliers/${supplier._id}/ai-describe`);
      toast.success('AI description generated!');
      onAIDescribe(supplier._id, data);
    } catch (err) {
      toast.error('AI description failed');
    } finally {
      setAILoading(false);
    }
  };

  const priority = PRIORITY_OPTIONS.find(p => p.value === supplier.priority);

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-gray-900">{supplier.name}</span>
              {supplier.company && <span className="text-xs text-gray-400">· {supplier.company}</span>}
              <StatusBadge status={supplier.status} />
              {priority && (
                <span className={`text-xs font-semibold ${priority.color}`}>{priority.label} priority</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {supplier.contactName && <span>👤 {supplier.contactName}</span>}
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-orange-500">
                  <FiPhone size={11} /> {supplier.phone}
                </a>
              )}
              {supplier.location && <span><FiMapPin size={11} className="inline mr-0.5" />{supplier.location}</span>}
            </div>

            {/* Reference links */}
            <div className="flex flex-wrap gap-2 mt-2">
              {supplier.instagramUrl && (
                <a href={supplier.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full">
                  <FiInstagram size={11} /> Instagram
                </a>
              )}
              {supplier.youtubeUrl && (
                <a href={supplier.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  <FiYoutube size={11} /> YouTube
                </a>
              )}
              {supplier.websiteUrl && (
                <a href={supplier.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  <FiExternalLink size={11} /> Website
                </a>
              )}
              {supplier.otherRefUrl && (
                <a href={supplier.otherRefUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                  <FiExternalLink size={11} /> Ref
                </a>
              )}
            </div>

            {/* Categories / tags */}
            {(supplier.productCategories?.length > 0 || supplier.tags?.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {supplier.productCategories?.map(c => (
                  <span key={c} className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{c}</span>
                ))}
                {supplier.tags?.map(t => (
                  <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleAI} disabled={aiLoading} title="Generate AI description"
              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50">
              {aiLoading ? <span className="w-4 h-4 border-2 border-purple-400/40 border-t-purple-500 rounded-full animate-spin block" /> : <FiZap size={15} />}
            </button>
            <button onClick={() => onEdit(supplier)} title="Edit"
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              <FiEdit2 size={15} />
            </button>
            <button onClick={() => onDelete(supplier._id)} title="Delete"
              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              <FiTrash2 size={15} />
            </button>
            <button onClick={() => setExpanded(e => !e)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              {expanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3 text-sm">
          {supplier.email && (
            <p className="text-gray-600">
              <span className="font-medium">Email:</span>{' '}
              <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">{supplier.email}</a>
            </p>
          )}
          {supplier.followUpDate && (
            <p className="text-gray-600">
              <span className="font-medium">Follow-up by:</span>{' '}
              {new Date(supplier.followUpDate).toLocaleDateString('en-IN')}
            </p>
          )}
          {supplier.productsDescription && (
            <div>
              <p className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <FiStar size={12} className="text-orange-400" /> Description & Benefits
              </p>
              <p className="text-gray-600 text-xs whitespace-pre-line leading-relaxed bg-white rounded-lg p-3 border border-gray-200">
                {supplier.productsDescription}
              </p>
            </div>
          )}
          {supplier.comments && (
            <div>
              <p className="font-medium text-gray-700 mb-1">Comments</p>
              <p className="text-gray-600 text-xs whitespace-pre-line">{supplier.comments}</p>
            </div>
          )}
          <p className="text-[11px] text-gray-400">
            Added {new Date(supplier.createdAt).toLocaleDateString('en-IN')}
            {supplier.addedBy?.name ? ` by ${supplier.addedBy.name}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function Suppliers() {
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchSuppliers = () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (search)       params.search = search;
    api.get('/suppliers', { params })
      .then(r => setSuppliers(r.data.suppliers || []))
      .catch(() => toast.error('Failed to load suppliers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, [filterStatus]);

  const handleSaved = (saved) => {
    setSuppliers(prev => {
      const exists = prev.find(s => s._id === saved._id);
      return exists
        ? prev.map(s => s._id === saved._id ? saved : s)
        : [saved, ...prev];
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier entry?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s._id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleAIDescribe = (id, data) => {
    setSuppliers(prev => prev.map(s =>
      s._id === id
        ? { ...s, productsDescription: `${data.description}\n\nBenefits:\n${(data.benefits || []).map(b => `• ${b}`).join('\n')}` }
        : s
    ));
  };

  const openAdd  = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (s) => { setEditTarget(s);   setModalOpen(true); };

  const counts = {
    all:          suppliers.length,
    interested:   suppliers.filter(s => s.status === 'interested').length,
    follow_up:    suppliers.filter(s => s.status === 'follow_up').length,
    not_interested: suppliers.filter(s => s.status === 'not_interested').length,
    onboarded:    suppliers.filter(s => s.status === 'onboarded').length,
  };

  return (
    <div>
      {modalOpen && (
        <SupplierModal
          supplier={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Supplier Repository</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track manufacturers and suppliers — contact, interest status, and AI insights</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
          <FiPlus size={16} /> Add Supplier
        </button>
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: `All (${counts.all})`,                 value: '' },
          { label: `✅ Interested (${counts.interested})`, value: 'interested' },
          { label: `🔁 Follow Up (${counts.follow_up})`,  value: 'follow_up' },
          { label: `🚀 Onboarded (${counts.onboarded})`,  value: 'onboarded' },
          { label: `❌ Not Interested (${counts.not_interested})`, value: 'not_interested' },
        ].map(opt => (
          <button key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
              filterStatus === opt.value
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchSuppliers()}
            placeholder="Search by name, company, description…"
            className="input-field pl-9"
          />
        </div>
        <button onClick={fetchSuppliers}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50">
          <FiRefreshCw size={14} /> Search
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🏭</p>
          <p className="font-medium">No suppliers yet</p>
          <p className="text-sm mt-1">Click "Add Supplier" to start building your repository.</p>
          <button onClick={openAdd} className="mt-4 text-sm text-primary-500 font-semibold hover:underline">
            + Add first supplier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map(s => (
            <SupplierCard
              key={s._id}
              supplier={s}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAIDescribe={handleAIDescribe}
            />
          ))}
        </div>
      )}
    </div>
  );
}
