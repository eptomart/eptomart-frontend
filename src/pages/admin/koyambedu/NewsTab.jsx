// ============================================
// KOYAMBEDU ADMIN — NEWS TAB
// ============================================
// New, standalone tab, self-contained like PrinterTab.jsx / BulkHarvestTab.jsx
// — fetches from its own endpoints (/koyambedu/news/admin/*), completely
// separate from every other tab's data/state.
import { useState, useEffect } from 'react';
import { FiToggleLeft, FiToggleRight, FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const emptyForm = { title: '', summary: '', sourceName: '', sourceUrl: '' };

function PostForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial?.form || emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.summary || !form.sourceName) {
      return toast.error('Title, summary and source are required');
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (file) fd.append('image', file);

      if (initial?.post) {
        const { data } = await api.put(`/koyambedu/news/admin/${initial.post._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Post updated');
        onSaved(data.post);
      } else {
        const { data } = await api.post('/koyambedu/news/admin', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Post published');
        onSaved(data.post);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-green-200 rounded-xl p-4 mb-4 grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm">{initial?.post ? 'Edit news post' : 'New news post'}</h3>
        <button onClick={onCancel}><FiX size={16} className="text-gray-400" /></button>
      </div>

      <input placeholder="Title" value={form.title} onChange={e => set('title', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      <textarea placeholder="Summary" value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} className="border rounded-lg px-3 py-2 text-sm" />

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Source (e.g. TN Agri Marketing Board)" value={form.sourceName} onChange={e => set('sourceName', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Source URL (optional)" value={form.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Photo</p>
        <div className="flex gap-2">
          {(file || initial?.post?.image?.url) && (
            <img src={file ? URL.createObjectURL(file) : initial.post.image.url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
          )}
          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 hover:border-green-400">
            <FiPlus size={18} />
            <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0])} />
          </label>
        </div>
      </div>

      <button onClick={submit} disabled={saving} className="bg-green-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
        {saving ? 'Saving…' : initial?.post ? 'Update post' : 'Publish post'}
      </button>
    </div>
  );
}

export default function NewsTab() {
  const [settings, setSettings] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, postsRes] = await Promise.all([
        api.get('/koyambedu/home-tabs/admin/settings'),
        api.get('/koyambedu/news/admin/all'),
      ]);
      setSettings(settingsRes.data.settings);
      setPosts(postsRes.data.posts || []);
    } catch {
      toast.error('Failed to load News data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleTab = async () => {
    try {
      const { data } = await api.patch('/koyambedu/home-tabs/admin/settings/news', { enabled: !settings.newsEnabled });
      setSettings(data.settings);
      toast.success(data.settings.newsEnabled ? 'News tab is now live for customers' : 'News tab hidden from customers');
    } catch {
      toast.error('Failed to update');
    }
  };

  const toggleVerified = async (post) => {
    try {
      const { data } = await api.patch(`/koyambedu/news/admin/${post._id}/verify`, { verified: !post.verified });
      setPosts(prev => prev.map(p => p._id === post._id ? data.post : p));
    } catch {
      toast.error('Failed to update verification');
    }
  };

  const toggleStatus = async (post) => {
    try {
      const { data } = await api.patch(`/koyambedu/news/admin/${post._id}/status`, { status: post.status === 'active' ? 'inactive' : 'active' });
      setPosts(prev => prev.map(p => p._id === post._id ? data.post : p));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/koyambedu/news/admin/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-700 text-sm">News tab</p>
          <p className="text-xs text-gray-400">
            {settings?.newsEnabled ? 'Visible to customers on the /koyambedu tab switcher' : 'Hidden — customers only see Koyambedu Daily'}
          </p>
        </div>
        <button onClick={toggleTab} className="flex items-center gap-1.5">
          {settings?.newsEnabled
            ? <FiToggleRight size={32} className="text-green-600" />
            : <FiToggleLeft size={32} className="text-gray-300" />}
        </button>
      </div>

      {!showForm && (
        <button onClick={() => { setEditPost(null); setShowForm(true); }} className="mb-4 flex items-center gap-1.5 text-sm font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <FiPlus size={14} /> Add news post
        </button>
      )}

      {showForm && (
        <PostForm
          initial={editPost ? { post: editPost, form: { title: editPost.title, summary: editPost.summary, sourceName: editPost.sourceName, sourceUrl: editPost.sourceUrl } } : null}
          onCancel={() => setShowForm(false)}
          onSaved={(post) => {
            setPosts(prev => editPost ? prev.map(p => p._id === post._id ? post : p) : [post, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      <div className="grid gap-3">
        {posts.map(p => (
          <div key={p._id} className="bg-white border rounded-xl p-3 flex gap-3">
            <img src={p.image?.url || 'https://placehold.co/64x64/dcfce7/166534?text=%F0%9F%93%B0'} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800 text-sm">{p.title}</p>
                {p.verified && <FiCheckCircle size={13} className="text-green-600" />}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{p.summary}</p>
              <p className="text-xs text-gray-400">Source: {p.sourceName}</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={() => { setEditPost(p); setShowForm(true); }} className="text-gray-400 hover:text-green-600"><FiEdit2 size={14} /></button>
              <button onClick={() => toggleVerified(p)} className={`text-[10px] font-bold underline ${p.verified ? 'text-green-600' : 'text-gray-500'}`}>
                {p.verified ? 'Verified' : 'Mark verified'}
              </button>
              <button onClick={() => toggleStatus(p)} className="text-[10px] font-bold text-gray-500 underline">
                {p.status === 'active' ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => remove(p._id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={14} /></button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No news posts yet.</p>}
      </div>
    </div>
  );
}
