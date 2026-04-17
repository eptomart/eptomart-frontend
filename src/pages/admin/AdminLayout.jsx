// ============================================
// ADMIN LAYOUT — Sidebar + Outlet
// Role-aware: superAdmin sees everything; admin sees orders only
// ============================================
import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers,
  FiBarChart2, FiTag, FiMenu, FiX, FiLogOut, FiHome,
  FiUploadCloud, FiBell, FiCheckSquare, FiUserCheck, FiDollarSign, FiSettings,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import EptomartLogo from '../../components/common/EptomartLogo';

// superAdmin: full access | admin: orders only
const ALL_NAV = [
  { path: '/admin',              label: 'Dashboard',     icon: FiGrid,        end: true, superAdminOnly: true },
  { path: '/admin/products',     label: 'Products',      icon: FiPackage,               superAdminOnly: true },
  { path: '/admin/categories',   label: 'Categories',    icon: FiTag,                   superAdminOnly: true },
  { path: '/admin/orders',       label: 'Orders',        icon: FiShoppingBag },         // all admins
  { path: '/admin/users',        label: 'Users',         icon: FiUsers,                 superAdminOnly: true },
  { path: '/admin/analytics',    label: 'Analytics',     icon: FiBarChart2,             superAdminOnly: true },
  { path: '/admin/approvals',    label: 'Approvals',     icon: FiCheckSquare,           superAdminOnly: true },
  { path: '/admin/sellers',      label: 'Sellers',       icon: FiUserCheck,             superAdminOnly: true },
  { path: '/admin/expenses',     label: 'Expenses',      icon: FiDollarSign,            superAdminOnly: true },
  { path: '/admin/bulk-import',  label: 'Bulk Import',   icon: FiUploadCloud,           superAdminOnly: true },
  { path: '/admin/notifications',label: 'Notifications', icon: FiBell,                  superAdminOnly: true },
  { path: '/admin/settings',     label: 'Settings',      icon: FiSettings,              superAdminOnly: true },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Regular admin trying to access restricted page → redirect to orders
  if (!isSuperAdmin && location.pathname !== '/admin/orders' && !location.pathname.startsWith('/admin/orders')) {
    return <Navigate to="/admin/orders" replace />;
  }

  const NAV_ITEMS = ALL_NAV.filter(n => isSuperAdmin || !n.superAdminOnly);

  const isActive = (path, end) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const currentLabel = NAV_ITEMS.find(n => isActive(n.path, n.end))?.label || 'Admin';
  const roleLabel    = isSuperAdmin ? 'Super Admin' : 'Admin (Orders)';
  const roleBadgeClass = isSuperAdmin
    ? 'text-yellow-400'
    : 'text-blue-400';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <EptomartLogo height={32} />
            <div className="border-l border-gray-700 pl-2.5">
              <p className="text-xs font-bold text-white leading-tight">Admin Panel</p>
              <p className="text-[10px] text-gray-500">eptomart.in</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        {/* Admin Info */}
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className={`text-xs flex items-center gap-1 ${roleBadgeClass}`}>
                <FiShield size={10} /> {roleLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon, end }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors
                ${isActive(path, end)
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer Links */}
        <div className="p-3 border-t border-gray-800">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <FiHome size={18} /> Back to Store
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <FiLogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
            <FiMenu size={22} />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-gray-800 capitalize">{currentLabel}</h1>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
