// ============================================
// ADMIN — CATEGORY MANAGEMENT
// ============================================
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiChevronDown, FiTag } from 'react-icons/fi';
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
  const [expandedCats, setExpandedCats] = useState(new Set());

  // Build tree structure
  const { parents, childrenMap } = useMemo(() => {
    const parents = categories.filter(c => !c.parentCategory);
    const childrenMap = {};
    categories.forEach(c => {
      if (c.parentCategory) {
        const pid = typeof c.parentCategory === 'object' ? c.parentCategory._id : c.parentCategory;
        if (!childrenMap[pid]) childrenMap[pid] = [];
        childrenMap[pid].push(c);
      }
    });
    return { parents, childrenMap };
  }, [categories]);

  const toggleExpand = (id) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Categories</h1>
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">
                {parents.length} top-level · {categories.length - parents.length} sub-categories
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && parents.some(p => (childrenMap[p._id] || []).length > 0) && (
              <button
                onClick={() => {
                  const parentIds = parents.filter(p => (childrenMap[p._id] || []).length > 0).map(p => p._id);
                  const allExpanded = parentIds.every(id => expandedCats.has(id));
                  setExpandedCats(allExpanded ? new Set() : new Set(parentIds));
                }}
                className="text-xs text-gray-500 hover:text-orange-600 border border-gray-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                {parents.filter(p => (childrenMap[p._id] || []).length > 0).every(p => expandedCats.has(p._id))
                  ? <><FiChevronDown size={12} /> Collapse All</>
                  : <><FiChevronRight size={12} /> Expand All</>
                }
              </button>
            )}
            <button onClick={openAdd} className="btn-primary btn-sm flex items-center gap-2">
              <FiPlus /> Add Category
            </button>
          </div>
        </div>

        {loading ? <Loader fullPage={false} /> : (
          <div className="space-y-2">
            {parents.map(cat => {
              const subs = childrenMap[cat._id] || [];
              const isExpanded = expandedCats.has(cat._id);
              const hasChildren = subs.length > 0;

              return (
                <div key={cat._id} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {/* Parent row */}
                  <div className="bg-white p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Expand toggle */}
                      {hasChildren ? (
                        <button
                          onClick={() => toggleExpand(cat._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 flex-shrink-0 transition-colors"
                        >
                          {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                        </button>
                      ) : (
                        <div className="w-7 h-7 flex-shrink-0" />
                      )}

                      {/* Icon */}
                      {cat.image?.url ? (
                        <img src={cat.image.url} alt={cat.name} className="w-11 h-11 object-cover rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                          {cat.icon || '🛍️'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                          {hasChildren && (
                            <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                              <FiTag size={10} /> {subs.length} sub
                            </span>
                          )}
                          {cat.requiresFSSAI && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">🍽 FSSAI</span>
                          )}
                        </div>
                        {cat.description && <p className="text-xs text-gray-400 line-clamp-1">{cat.description}</p>}
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

                  {/* Children — shown when expanded */}
                  {isExpanded && hasChildren && (
                    <div className="border-t border-gray-100 bg-orange-50/40">
                      {subs.map((sub, idx) => (
                        <div
                          key={sub._id}
                          className={`flex items-center justify-between px-4 py-3 group/sub
                            ${idx < subs.length - 1 ? 'border-b border-orange-100' : ''}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Indent connector */}
                            <div className="w-7 flex-shrink-0 flex items-center justify-center">
                              <div className="w-px h-4 bg-orange-200 mr-1" />
                              <div className="w-2 h-px bg-orange-200" />
                            </div>

                            {sub.image?.url ? (
                              <img src={sub.image.url} alt={sub.name} className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-white border border-orange-200 rounded-lg flex items-center justify-center flex-shrink-0 text-base">
                                {sub.icon || '📁'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-700">{sub.name}</p>
                                {sub.requiresFSSAI && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">🍽 FSSAI</span>
                                )}
                              </div>
                              {sub.description && <p className="text-xs text-gray-400 line-clamp-1">{sub.description}</p>}
                            </div>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity ml-3 flex-shrink-0">
                            <button onClick={() => openEdit(sub)} className="w-6 h-6 bg-blue-500 text-white rounded-md flex items-center justify-center hover:bg-blue-600">
                              <FiEdit2 size={11} />
                            </button>
                            <button onClick={() => handleDelete(sub._id, sub.name)} className="w-6 h-6 bg-red-500 text-white rounded-md flex items-center justify-center hover:bg-red-600">
                              <FiTrash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add sub-category shortcut */}
                      <div className="px-4 py-2.5 flex items-center gap-2">
                        <div className="w-7 flex-shrink-0" />
                        <button
                          onClick={() => {
                            setEditCat(null);
                            setForm({ name: '', description: '', icon: '', sortOrder: 0, requiresFSSAI: false, parentCategory: cat._id });
                            setImageFile(null);
                            setShowModal(true);
                          }}
                          className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <FiPlus size={12} /> Add sub-category
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Orphan subcategories (parent was deleted) */}
            {categories.filter(c => {
              if (!c.parentCategory) return false;
              const pid = typeof c.parentCategory === 'object' ? c.parentCategory._id : c.parentCategory;
              return !parents.find(p => p._id === pid);
            }).length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 px-1">Unlinked Sub-categories</p>
                {categories.filter(c => {
                  if (!c.parentCategory) return false;
                  const pid = typeof c.parentCategory === 'object' ? c.parentCategory._id : c.parentCategory;
                  return !parents.find(p => p._id === pid);
                }).map(cat => (
                  <div key={cat._id} className="card p-3 flex items-center justify-between group mb-2 border-l-4 border-orange-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-base">{cat.icon || '📁'}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{cat.name}</p>
                        <p className="text-xs text-orange-500">Parent missing</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(cat)} className="w-6 h-6 bg-blue-500 text-white rounded-md flex items-center justify-center hover:bg-blue-600"><FiEdit2 size={11} /></button>
                      <button onClick={() => handleDelete(cat._id, cat.name)} className="w-6 h-6 bg-red-500 text-white rounded-md flex items-center justify-center hover:bg-red-600"><FiTrash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
