// ============================================
// ADMIN MANAGEMENT — SuperAdmin only
// Create / revoke admin accounts
// ============================================
import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiShield, FiUser, FiCopy, FiCheck, FiEdit2 } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ALL_PERMISSIONS = [
  { key: 'orders',      label: 'Orders' },
  { key: 'products',    label: 'Products' },
  { key: 'approvals',   label: 'Approvals' },
  { key: 'sellers',     label: 'Sellers' },
  { key: 'users',       label: 'Users' },
  { key: 'analytics',   label: 'Analytics' },
  { key: 'categories',  label: 'Categories' },
  { key: 'expenses',    label: 'Expenses' },
  { key: 'settlements', label: 'Settlements' },
];

const BLANK = { name: '', email: '', phone: '', permissions: ['orders'] };

const ROLE_BADGE = {
  superAdmin: 'bg-yellow-100 text-yellow-800',
  admin:      'bg-blue-100 text-blue-700',
};

export default function AdminAdmins() {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);  // 'create' | { admin } for edit perms
  const [form,    setForm]    = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const [newCreds, setNewCreds] = useState(null);
  const [copied,  setCopied]  = useState(false);
  const [editPerms, setEditPerms] = useState(null); // { admin, permissions }

  const togglePerm = (key) => setForm(f => ({
    ...f,
    permissions: f.permissions.includes(key)
      ? f.permissions.filter(p => p !== key)
      : [...f.permissions, key],
  }));

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/admins');
      setAdmins(data.admins || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || (!form.email && !form.phone)) {
      return toast.error('Name and email or phone required');
    }
    setSaving(true);
    try {
      const { data } = await api.post('/admin/admins', form);
      toast.success('Admin account created!');
      setNewCreds({
        name:         data.admin.name,
        contact:      data.admin.email || data.admin.phone,
        tempPassword: data.tempPassword,
      });
      setModal(false);
      setForm(BLANK);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally { setSaving(false); }
  };

  const savePermissions = async () => {
    if (!editPerms) return;
    try {
      await api.patch(`/admin/admins/${editPerms.admin._id}/permissions`, { permissions: editPerms.permissions });
      toast.success('Permissions updated');
      setEditPerms(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const revoke = async (admin) => {
    if (admin.role === 'superAdmin') return toast.error('Cannot revoke Super Admin access');
    if (!confirm(`Revoke admin access for ${admin.name}?`)) return;
    try {
      await api.delete(`/admin/admins/${admin._id}`);
      toast.success('Admin access revoked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Admin Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage admin access and module permissions.</p>
        </div>
        <button onClick={() => { setModal(true); setForm(BLANK); }} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus size={15} /> Add Admin
        </button>
      </div>

      {/* Credentials display after creation */}
      {newCreds && (
        <div className="card p-5 mb-6 border-2 border-green-200 bg-green-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-green-800 mb-1">✅ Admin account created for {newCreds.name}</p>
              <p className="text-sm text-gray-700">Login: <strong>{newCreds.contact}</strong></p>
              <p className="text-sm text-gray-700">Temporary Password: <strong className="font-mono">{newCreds.tempPassword}</strong></p>
              <p className="text-xs text-gray-500 mt-1">Share these credentials securely. The admin should change their password on first login.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(`Login: ${newCreds.contact}\nPassword: ${newCreds.tempPassword}`)}
                className="p-2 rounded-lg hover:bg-green-100 text-green-700"
                title="Copy credentials"
              >
                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
              </button>
              <button onClick={() => setNewCreds(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-4">Admin</th>
                <th className="text-left p-4 hidden sm:table-cell">Contact</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4 hidden lg:table-cell">Modules</th>
                <th className="text-left p-4 hidden md:table-cell">Last Login</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map(a => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {a.role === 'superAdmin'
                          ? <FiShield size={16} className="text-yellow-600" />
                          : <FiUser size={16} className="text-primary-600" />
                        }
                      </div>
                      <p className="font-medium text-gray-800">{a.name}</p>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-gray-500 text-xs">
                    {a.email || a.phone || '—'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[a.role] || 'bg-gray-100 text-gray-600'}`}>
                      {a.role === 'superAdmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    {a.role === 'superAdmin'
                      ? <span className="text-xs text-yellow-600 font-medium">All modules</span>
                      : <div className="flex flex-wrap gap-1">
                          {(a.permissions || ['orders']).map(p => (
                            <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                        </div>
                    }
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-400 text-xs">
                    {a.lastLogin ? new Date(a.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.role !== 'superAdmin' && (
                        <button
                          onClick={() => setEditPerms({ admin: a, permissions: [...(a.permissions || ['orders'])] })}
                          className="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50"
                          title="Edit permissions"
                        ><FiEdit2 size={14} /></button>
                      )}
                      {a.role !== 'superAdmin' && (
                        <button
                          onClick={() => revoke(a)}
                          className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                          title="Revoke admin access"
                        ><FiTrash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Admin Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-1">Create Admin Account</h3>
            <p className="text-sm text-gray-500 mb-4">Set what modules this admin can access.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field" placeholder="Admin's full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field" placeholder="10-digit mobile number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Module Access</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.permissions.includes(p.key)}
                        onChange={() => togglePerm(p.key)} className="rounded" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400">A temporary password will be generated and shown to you.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModal(false); setForm(BLANK); }} className="btn-outline flex-1">Cancel</button>
              <button onClick={create} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editPerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-1">Edit Permissions</h3>
            <p className="text-sm text-gray-500 mb-4">{editPerms.admin.name}</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox"
                    checked={editPerms.permissions.includes(p.key)}
                    onChange={() => setEditPerms(e => ({
                      ...e,
                      permissions: e.permissions.includes(p.key)
                        ? e.permissions.filter(x => x !== p.key)
                        : [...e.permissions, p.key],
                    }))}
                    className="rounded"
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditPerms(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={savePermissions} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
