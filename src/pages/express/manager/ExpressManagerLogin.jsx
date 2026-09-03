// ============================================
// EPTOMART EXPRESS — Store Manager Login
// Standalone login screen, not part of the main app's /login flow.
// ============================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import expressManagerApi, { setManagerToken } from '../../../utils/expressManagerApi';

export default function ExpressManagerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!phone || !password) return toast.error('Enter phone and password');
    setLoading(true);
    try {
      const { data } = await expressManagerApi.post('/login', { phone, password });
      setManagerToken(data.token);
      toast.success(`Welcome, ${data.manager.name}`);
      navigate('/express/manager');
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
        <p className="text-xs text-gray-500 text-center mb-6">Store Manager Login</p>

        <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4" />

        <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-6" />

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <FiLock size={14} /> {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
