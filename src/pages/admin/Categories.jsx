// ============================================
// ADMIN — CATEGORY MANAGEMENT
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '', sortOrder: 0, parentCategory: null });
  const [imageFile, setImageFile] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories?all=true');
      setCategories(data.categories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditCat(null);
    setForm({ name: '', description: '', icon: '', sortOrder: 0, requiresFSSAI: false, parentCategory: null });
    setImageFile(null);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '', sortOrder: cat.sortOrder || 0, requiresFSSAI: cat.requiresFSSAI || false, parentCategory: cat.parentCategory || null });
    setImageFile(null);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);

      if (editCat) {
        await api.put(`/categories/${editCat._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Category updated!');
      } else {
        await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Category created!');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const EMOJI_SUGGESTIONS = ['🛍️', '👗', '📱', '🏠', '🍎', '💄', '⚽', '📚', '🚗', '💊', '🎮', '🌿', '💍', '👟', '🔧'];

  return (
    <>
      <Helmet><title>Categories — Eptomart Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Categories</h1>
          <button onClick={openAdd} className="btn-primary btn-sm flex items-center gap-2">
            <FiPlus /> Add Category
          </button>
        </div>

        {loading ? <Loader fullPage={false} /> : (
          <div className="space-y-2">
            {categories.map(cat => {
              const isSubcategory = cat.parentCategory;
              const parentName = isSubcategory ? categories.find(c => c._id === cat.parentCategory)?.name : null;
              return (
                <div key={cat._id} className={`card p-4 flex items-start justify-between group relative ${isSubcategory ? 'ml-8 border-l-4 border-orange-200' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {cat.image?.url ? (
                        <img src={cat.image.url} alt={cat.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                          {cat.icon || '🛍️'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-400 line-clamp-1">{cat.description}</p>}
                        {isSubcategory && (
                          <p className="text-xs text-orange-600 font-medium mt-0.5">Sub of: {parentName}</p>
                        )}
                        {cat.requiresFSSAI && (
                          <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">🍽 FSSAI req.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3 flex-shrink-0">
                    <button onClick={() => openEdit(cat)} className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600">
                      <FiEdit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(cat._id, cat.name)} className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{editCat ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field" required placeholder="e.g. Electronics" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field" placeholder="Brief category description" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Parent Category</label>
                <select value={form.parentCategory || ''} onChange={e => setForm(f => ({ ...f, parentCategory: e.target.value || null }))}
                  className="input-field">
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => !c.parentCategory && (!editCat || c._id !== editCat._id)).map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Select a parent to make this a sub-category</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Emoji Icon</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {EMOJI_SUGGESTIONS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                      className={`text-xl p-1.5 rounded-lg border ${form.icon === emoji ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="input-field" placeholder="Or type emoji/text" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category Image (optional)</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  className="input-field" min="0" />
              </div>

              {/* FSSAI toggle */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Requires FSSAI License</p>
                  <p className="text-xs text-gray-500">Enable for food, beverage, dairy, bakery, etc.</p>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, requiresFSSAI: !f.requiresFSSAI }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                    ${form.requiresFSSAI ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                    ${form.requiresFSSAI ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editCat ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
