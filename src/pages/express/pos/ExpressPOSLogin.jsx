// ============================================
// EPTOMART EXPRESS — POS Login
// Username + PIN, counter-friendly. Standalone from the main app's login.
// ============================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import expressPOSApi, { setPOSToken } from '../../../utils/expressPOSApi';

export default function ExpressPOSLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !pin) return toast.error('Enter username and PIN');
    setLoading(true);
    try {
      const { data } = await expressPOSApi.post('/login', { username, pin });
      setPOSToken(data.token);
      toast.success(`Welcome, ${data.posUser.name}`);
      navigate('/express/pos');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1 justify-center">
          <FiZap className="text-amber-500" size={24} />
          <h1 className="text-lg font-black text-indigo-900">Eptomart Express</h1>
        </div>
        <p className="text-xs text-gray-500 text-center mb-6">POS Login</p>

        <label className="block text-xs font-semibold text-gray-500 mb-1">Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4" />

        <label className="block text-xs font-semibold text-gray-500 mb-1">PIN</label>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN" inputMode="numeric"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-6" />

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <FiLock size={14} /> {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
