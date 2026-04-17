import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiDownload, FiFilter } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

const BLANK = { category: '', title: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '', receiptFile: null };

export default function AdminExpenses() {
  const [expenses,    setExpenses]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [filters,     setFilters]     = useState({ from: '', to: '', category: '' });
  const [exporting,   setExporting]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      const [eRes, sRes] = await Promise.all([
        api.get(`/expenses?${q}`),
        api.get(`/expenses/summary?${q}`),
      ]);
      setExpenses(eRes.data.expenses || []);
      setSummary(sRes.data.summary);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/expenses/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filters]);

  const save = async () => {
    if (!form.category || !form.title || !form.amount) return toast.error('Category, title and amount required');
    setSaving(true);
    try {
      if (editItem) await api.put(`/expenses/${editItem._id}`, form);
      else          await api.post('/expenses', form);
      toast.success(editItem ? 'Expense updated' : 'Expense added');
      setModal(false); setEditItem(null); setForm(BLANK);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    setExpenses(e => e.filter(x => x._id !== id));
    toast.success('Deleted');
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      const res = await api.get(`/expenses/export?${q}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `eptomart-expenses-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      toast.success('Excel downloaded!');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const openEdit = (exp) => {
    setEditItem(exp);
    setForm({
      category: exp.category?._id || exp.category,
      title:    exp.title,
      description: exp.description || '',
      amount:   exp.amount,
      date:     exp.date?.split('T')[0] || '',
      notes:    exp.notes || '',
    });
    setModal(true);
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Expense Management</h1>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={exporting} className="btn-outline flex items-center gap-2 text-sm">
            <FiDownload size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={() => { setModal(true); setEditItem(null); setForm(BLANK); }} className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-2xl font-bold text-gray-800">{formatINR(summary.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Expenses</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-gray-800">{summary.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">Transactions</p>
          </div>
          {summary.byCategory?.[0] && (
            <div className="card p-4">
              <p className="text-lg font-bold text-gray-800">{summary.byCategory[0].category || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Top Category · {formatINR(summary.byCategory[0].total)}</p>
            </div>
          )}
          <div className="card p-4">
            <p className="text-sm font-medium text-gray-600">Category breakdown</p>
            {summary.byCategory?.slice(0,2).map(c => (
              <p key={c.category} className="text-xs text-gray-500">{c.icon} {c.category}: {formatINR(c.total)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field w-auto text-sm" />
        <input type="date" value={filters.to}   onChange={e => setFilters(f => ({ ...f, to:   e.target.value }))} className="input-field w-auto text-sm" />
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="input-field w-auto text-sm">
          <option value="">All categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
        {(filters.from || filters.to || filters.category) && (
          <button onClick={() => setFilters({ from:'', to:'', category:'' })} className="text-sm text-gray-500 hover:text-red-500 px-2">Clear filters</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="card overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No expenses found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map(e => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                    <td className="p-4">
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                        {e.category?.icon} {e.category?.name || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{e.title}</p>
                      {e.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{e.description}</p>}
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-900">{formatINR(e.amount)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(e)} className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-orange-50">
                          <FiEdit2 size={14} />
                        </button>
                        <button onClick={() => del(e._id)} className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={form.category} onChange={e => setF('category', e.target.value)} className="input-field">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Brief title" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} className="input-field resize-none" placeholder="Optional details..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt / Proof <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-3 cursor-pointer transition-colors">
                  <span className="text-gray-400 text-xl">📎</span>
                  <span className="text-sm text-gray-500">
                    {form.receiptFile ? form.receiptFile.name : 'Click to attach receipt (JPG, PNG, PDF)'}
                  </span>
                  <input type="file" accept="image/*,.pdf" onChange={e => setF('receiptFile', e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModal(false); setEditItem(null); setForm(BLANK); }} className="btn-outline flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editItem ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
