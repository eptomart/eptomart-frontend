// ============================================
// ADMIN LAYOUT — Grouped collapsible sidebar
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import NotificationBell from '../../components/common/NotificationBell';
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers,
  FiBarChart2, FiTag, FiMenu, FiX, FiLogOut, FiHome,
  FiUploadCloud, FiBell, FiCheckSquare, FiUserCheck, FiDollarSign, FiSettings,
  FiShield, FiCreditCard, FiMessageSquare, FiActivity, FiChevronDown, FiChevronRight,
  FiGlobe,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import EptomartLogo from '../../components/common/EptomartLogo';
import api from '../../utils/api';

// ── Navigation groups ──────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    group: 'Overview',
    icon: FiGrid,
    items: [
      { path: '/admin', label: 'Dashboard', icon: FiGrid, end: true, permission: null },
    ],
  },
  {
    group: 'Catalogue',
    icon: FiPackage,
    items: [
      { path: '/admin/products',   label: 'Products',   icon: FiPackage,     permission: 'products'   },
      { path: '/admin/categories', label: 'Categories', icon: FiTag,         permission: 'categories' },
      { path: '/admin/approvals',  label: 'Approvals',  icon: FiCheckSquare, permission: 'approvals'  },
      { path: '/admin/bulk-import',label: 'Bulk Import',icon: FiUploadCloud, permission: null         },
    ],
  },
  {
    group: 'Commerce',
    icon: FiShoppingBag,
    items: [
      { path: '/admin/orders',      label: 'Orders',      icon: FiShoppingBag,  permission: 'orders'      },
      { path: '/admin/settlements', label: 'Settlements', icon: FiCreditCard,   permission: 'settlements' },
      { path: '/admin/expenses',    label: 'Expenses',    icon: FiDollarSign,   permission: 'expenses'    },
      { path: '/admin/enquiries',   label: 'Enquiries',   icon: FiMessageSquare,permission: 'orders'      },
      { path: '/admin/messages',    label: 'Messages',    icon: FiMessageSquare,permission: 'orders'      },
    ],
  },
  {
    group: 'People',
    icon: FiUsers,
    items: [
      { path: '/admin/sellers', label: 'Sellers', icon: FiUserCheck, permission: 'sellers' },
      { path: '/admin/users',   label: 'Users',   icon: FiUsers,     permission: 'users'   },
    ],
  },
  {
    group: 'System',
    icon: FiBarChart2,
    items: [
      { path: '/admin/analytics',    label: 'Analytics',     icon: FiBarChart2, permission: 'analytics' },
      { path: '/admin/visitors',     label: 'Visitors',      icon: FiGlobe,     permission: 'analytics' },
      { path: '/admin/uzhavar',      label: 'Farmer Fresh',     icon: FiPackage,   permission: 'uzhavar'   },
      { path: '/admin/koyambedu',   label: 'Koyambedu Daily',  icon: FiShoppingBag, permission: 'koyambedu' },
      { path: '/admin/notifications',label: 'Notifications', icon: FiBell,      permission: null        },
      { path: '/admin/activity-log', label: 'Activity Log',  icon: FiActivity,  permission: null        },
      { path: '/admin/admins',       label: 'Admin Accounts',icon: FiShield,    permission: 'admins'    },
      { path: '/admin/settings',     label: 'Settings',      icon: FiSettings,  permission: null        },
    ],
  },
];

// Flat list (for redirect logic + breadcrumb)
const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [collapsed, setCollapsed]       = useState(new Set());
  const [badges, setBadges]             = useState({ unreadMessages: 0, pendingApprovals: 0 });
  const [newOrderBadge, setNewOrderBadge] = useState(0);
  const { logout, user, isSuperAdmin }  = useAuth();
  const location                        = useLocation();
  const badgeTimer   = useRef(null);
  const orderTimer   = useRef(null);
  const lastSeenRef  = useRef(localStorage.getItem('admin_last_order_seen') || new Date().toISOString());

  // ── Existing badge polling (messages + approvals) ──────────
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const { data } = await api.get('/conversations/admin/badge-counts');
        if (data.success) setBadges({ unreadMessages: data.unreadMessages, pendingApprovals: data.pendingApprovals });
      } catch { /* silent */ }
    };
    fetchBadges();
    badgeTimer.current = setInterval(fetchBadges, 30000);
    return () => clearInterval(badgeTimer.current);
  }, []);

  // ── New order polling — every 20s ──────────────────────────
  const playOrderSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext blocked — silent fallback */ }
  }, []);

  useEffect(() => {
    const pollNewOrders = async () => {
      try {
        const { data } = await api.get(`/admin/orders/new-count?since=${lastSeenRef.current}`);
        if (data.success && data.count > 0) {
          setNewOrderBadge(prev => prev + data.count);
          playOrderSound();
          const o = data.latest;
          const buyerName = o?.user?.name || 'Customer';
          const total = o?.pricing?.total ? `₹${Number(o.pricing.total).toLocaleString('en-IN')}` : '';
          const items = o?.items?.length || 0;
          toast(`🛒 New Order #${o?.orderId || ''}\n${buyerName} · ${items} item(s) · ${total}`, {
            duration: 6000,
            style: { background: '#1d4ed8', color: '#fff', fontWeight: '600', borderRadius: '12px' },
            icon: '📦',
          });
          lastSeenRef.current = new Date().toISOString();
          localStorage.setItem('admin_last_order_seen', lastSeenRef.current);
        }
      } catch { /* silent */ }
    };
    orderTimer.current = setInterval(pollNewOrders, 20000);
    return () => clearInterval(orderTimer.current);
  }, [playOrderSound]);

  const userPerms = user?.permissions || [];
  const canAccess = (item) => {
    if (isSuperAdmin) return true;
    if (item.permission === null) return false;
    return userPerms.includes(item.permission);
  };

  const NAV_ITEMS = ALL_NAV.filter(canAccess);

  // Redirect to first allowed page if on a forbidden route
  const currentAllowedPaths = NAV_ITEMS.map(n => n.path);
  const isOnAllowedPath = currentAllowedPaths.some(p =>
    p === location.pathname || location.pathname.startsWith(p + '/')
  );
  if (!isSuperAdmin && !isOnAllowedPath && NAV_ITEMS.length > 0) {
    return <Navigate to={NAV_ITEMS[0].path} replace />;
  }

  // Clear new-order badge when admin visits the Orders page
  useEffect(() => {
    if (location.pathname.startsWith('/admin/orders')) {
      setNewOrderBadge(0);
      const now = new Date().toISOString();
      lastSeenRef.current = now;
      localStorage.setItem('admin_last_order_seen', now);
    }
  }, [location.pathname]);

  const isActive = (path, end) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const toggleGroup = (name) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  const currentLabel = NAV_ITEMS.find(n => isActive(n.path, n.end))?.label || 'Admin';
  const roleLabel    = isSuperAdmin ? 'Super Admin' : `Admin`;
  const roleBadgeClass = isSuperAdmin ? 'text-yellow-400' : 'text-blue-400';

  // Visible groups — filter out groups with no accessible items
  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(canAccess),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 text-white flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <EptomartLogo height={28} />
            <div className="border-l border-gray-700 pl-2.5">
              <p className="text-xs font-bold text-white leading-tight">Admin</p>
              <p className="text-[10px] text-gray-500">eptomart.in</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        {/* Back to Store */}
        <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
          <Link to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors">
            <FiHome size={13} /> Back to Store
          </Link>
        </div>

        {/* User badge */}
        <div className="px-4 py-2.5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name}</p>
              <p className={`text-[10px] flex items-center gap-1 ${roleBadgeClass}`}>
                <FiShield size={9} /> {roleLabel}
              </p>
            </div>
          </div>
        </div>

        {/* ── Grouped Navigation ────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {visibleGroups.map(({ group, icon: GroupIcon, items }) => {
            const isCollapsed = collapsed.has(group);
            const groupActive = items.some(i => isActive(i.path, i.end));

            return (
              <div key={group}>
                {/* Group header (clickable to collapse) */}
                <button
                  onClick={() => toggleGroup(group)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                    ${groupActive ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon size={13} />
                    {group}
                  </span>
                  {isCollapsed
                    ? <FiChevronRight size={12} />
                    : <FiChevronDown size={12} />}
                </button>

                {/* Group items */}
                {!isCollapsed && (
                  <div className="ml-1 mt-0.5 space-y-0.5">
                    {items.map(({ path, label, icon: Icon, end }) => {
                      const badgeCount =
                        path === '/admin/messages'  ? badges.unreadMessages  :
                        path === '/admin/approvals' ? badges.pendingApprovals :
                        path === '/admin/orders'    ? newOrderBadge : 0;
                      return (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${isActive(path, end)
                              ? 'bg-primary-500 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                          <Icon size={15} />
                          <span className="flex-1">{label}</span>
                          {badgeCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            <FiLogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
            <FiMenu size={20} />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-base font-bold text-gray-800">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
