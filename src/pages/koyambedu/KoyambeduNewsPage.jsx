// ============================================
// KOYAMBEDU NEWS — Public page
// Admin-posted news about vegetables/fruits, each citing a source and
// optionally admin-verified. Public, no login gate.
// ============================================
import { useState, useEffect } from 'react';
import { FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function KoyambeduNewsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/koyambedu/news')
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => toast.error('Failed to load news'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">📰 Market news</h2>
        <p className="text-sm text-gray-500 mt-1">Updates on vegetables and fruits, sourced and cited.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No news posts yet.</p>
      ) : (
        <div className="grid gap-4">
          {posts.map(p => (
            <div key={p._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {p.image?.url && <img src={p.image.url} alt={p.title} className="w-full h-44 object-cover" />}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <h3 className="font-bold text-gray-900 text-base">{p.title}</h3>
                  {p.verified && <FiCheckCircle size={14} className="text-green-600 flex-shrink-0" title="Verified source" />}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{p.summary}</p>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  Source: {p.sourceName}
                  {p.sourceUrl && (
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 flex items-center gap-0.5 hover:underline">
                      <FiExternalLink size={11} /> View
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
