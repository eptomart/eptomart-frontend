// ============================================
// ADMIN — USER MANAGEMENT
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiSearch, FiEye, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/currency';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?page=${page}&role=user${search ? `&search=${search}` : ''}`);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const viewLoginHistory = async (user) => {
    setSelectedUser(user);
    try {
      const { data } = await api.get(`/admin/users/${user._id}/login-history`);
      setLoginHistory(data.loginHistory || []);
    } catch (err) {
      toast.error('Failed to load login history');
    }
  };

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`);
      toast.success(`User ${currentStatus ? 'suspended' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  return (
    <>
      <Helmet><title>Users — Eptomart Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
        </div>

        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {loading ? <Loader fullPage={false} /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-bold text-xs">{user.name?.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-gray-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{user.email || '—'}</p>
                        <p className="text-xs text-gray-400">{user.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500">{user.lastLogin ? formatDate(user.lastLogin) : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => viewLoginHistory(user)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                            title="View Login History"
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            onClick={() => toggleStatus(user._id, user.isActive)}
                            className={`p-1.5 rounded-lg ${user.isActive ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}
                            title={user.isActive ? 'Suspend User' : 'Activate User'}
                          >
                            {user.isActive ? <FiToggleRight size={15} /> : <FiToggleLeft size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Login History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-800">Login History</h2>
                <p className="text-sm text-gray-500">{selectedUser.name}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 text-2xl">×</button>
            </div>

            <div className="p-5">
              {loginHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No login history found</p>
              ) : (
                <div className="space-y-3">
                  {loginHistory.slice().reverse().map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">
                            {log.browser} on {log.os} ({log.device})
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">IP: {log.ip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
