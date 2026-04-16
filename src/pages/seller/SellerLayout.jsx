import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { FiGrid, FiPackage, FiPlus, FiShoppingBag, FiUser, FiMenu, FiX, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import EptomartLogo from '../../components/common/EptomartLogo';

const NAV = [
  { path: '/seller/dashboard', label: 'Dashboard',   icon: FiGrid },
  { path: '/seller/products',  label: 'My Products',  icon: FiPackage },
  { path: '/seller/products/add', label: 'Add Product', icon: FiPlus },
  { path: '/seller/orders',    label: 'My Orders',    icon: FiShoppingBag },
  { path: '/seller/profile',   label: 'My Profile',   icon: FiUser },
];

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);
  const navigate         = useNavigate();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="flex items-center gap-2.5 mb-2">
              <EptomartLogo size="xs" />
              <span className="text-xs font-semibold text-gray-400 border-l border-gray-700 pl-2">Seller</span>
            </div>
            <p className="text-xs text-gray-300 font-medium truncate">{user?.name || 'Seller'}</p>
            <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium mt-1">
              ✅ Active
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {NAV.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-orange-50 hover:text-primary-600'}`
                }>
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 space-y-1">
            <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-all">
              <FiArrowLeft size={17} /> Back to Store
            </Link>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
              <FiLogOut size={17} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <FiMenu size={20} />
          </button>
          <h1 className="font-semibold text-gray-800">Seller Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
