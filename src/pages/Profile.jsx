// ============================================
// PROFILE PAGE
// ============================================
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiUser, FiMail, FiPhone, FiSave } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>My Profile — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">👤 My Profile</h1>

        <div className="card p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
              <span className="text-primary-600 font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email || user?.phone}</p>
              <span className={`badge mt-1 ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            {user?.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={user.email} disabled className="input-field bg-gray-50" />
              </div>
            )}

            {user?.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="text" value={user.phone} disabled className="input-field bg-gray-50" />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
