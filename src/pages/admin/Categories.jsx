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
  const [form, setForm] = useState({ name: '', description: '', icon: '', sortOrder: 0 });
  const [imageFile, setImageFile] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories?parent=null');
      setCategories(data.categories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditCat(null);
    setForm({ name: '', description: '', icon: '', sortOrder: 0 });
    setImageFile(null);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '', sortOrder: cat.sortOrder || 0 });
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map(cat => (
              <div key={cat._id} className="card p-4 text-center group relative">
                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                    <FiEdit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(cat._id, cat.name)} className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center">
                    <FiTrash2 size={12} />
                  </button>
                </div>

                {cat.image?.url ? (
                  <img src={cat.image.url} alt={cat.name} className="w-16 h-16 object-cover rounded-xl mx-auto mb-2" />
                ) : (
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2 text-3xl">
                    {cat.icon || '🛍️'}
                  </div>
                )}
                <p className="font-semibold text-gray-800 text-sm">{cat.name}</p>
                {cat.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>}
              </div>
            ))}
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
