import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import Loader from './components/common/Loader';
import CompareBar from './components/product/CompareBar';

// ── Customer pages ───────────────────────────
const Home        = lazy(() => import('./pages/Home'));
const Shop        = lazy(() => import('./pages/Shop'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart        = lazy(() => import('./pages/Cart'));
const Checkout    = lazy(() => import('./pages/Checkout'));
const Orders      = lazy(() => import('./pages/Orders'));
const Login       = lazy(() => import('./pages/Login'));
const Profile     = lazy(() => import('./pages/Profile'));
const Wishlist    = lazy(() => import('./pages/Wishlist'));
const Compare     = lazy(() => import('./pages/Compare'));
const Contact     = lazy(() => import('./pages/Contact'));
const InvoiceView = lazy(() => import('./pages/invoice/InvoiceView'));

// ── Admin pages ──────────────────────────────
const AdminLayout       = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard    = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts     = lazy(() => import('./pages/admin/Products'));
const AdminOrders       = lazy(() => import('./pages/admin/Orders'));
const AdminUsers        = lazy(() => import('./pages/admin/Users'));
const AdminAnalytics    = lazy(() => import('./pages/admin/Analytics'));
const AdminCategories   = lazy(() => import('./pages/admin/Categories'));
const AdminBulkImport   = lazy(() => import('./pages/admin/BulkImport'));
const AdminNotifications= lazy(() => import('./pages/admin/Notifications'));
const AdminApprovals    = lazy(() => import('./pages/admin/Approvals'));
const AdminSellers      = lazy(() => import('./pages/admin/Sellers'));
const AdminExpenses     = lazy(() => import('./pages/admin/Expenses'));
const AdminSettings     = lazy(() => import('./pages/admin/Settings'));

// ── Seller pages ─────────────────────────────
const SellerLayout  = lazy(() => import('./pages/seller/SellerLayout'));
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));
const SellerProducts  = lazy(() => import('./pages/seller/Products'));
const SellerProductForm = lazy(() => import('./pages/seller/ProductForm'));
const SellerOrders  = lazy(() => import('./pages/seller/Orders'));

// ── Route guards ─────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <Loader />;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  return isAdmin ? children : <Navigate to="/" replace />;
};

const SellerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'seller' && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<Home />} />
          <Route path="/shop"          element={<Shop />} />
          <Route path="/shop/:category"element={<Shop />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart"          element={<Cart />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/compare"       element={<Compare />} />
          <Route path="/contact"       element={<Contact />} />

          {/* Protected customer */}
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders"   element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/invoice/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />

          {/* Seller portal */}
          <Route path="/seller" element={<SellerRoute><SellerLayout /></SellerRoute>}>
            <Route index element={<Navigate to="/seller/dashboard" replace />} />
            <Route path="dashboard"        element={<SellerDashboard />} />
            <Route path="products"         element={<SellerProducts />} />
            <Route path="products/add"     element={<SellerProductForm />} />
            <Route path="products/:id"     element={<SellerProductForm />} />
            <Route path="orders"           element={<SellerOrders />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index                   element={<AdminDashboard />} />
            <Route path="products"         element={<AdminProducts />} />
            <Route path="approvals"        element={<AdminApprovals />} />
            <Route path="sellers"          element={<AdminSellers />} />
            <Route path="orders"           element={<AdminOrders />} />
            <Route path="users"            element={<AdminUsers />} />
            <Route path="analytics"        element={<AdminAnalytics />} />
            <Route path="categories"       element={<AdminCategories />} />
            <Route path="expenses"         element={<AdminExpenses />} />
            <Route path="bulk-import"      element={<AdminBulkImport />} />
            <Route path="notifications"    element={<AdminNotifications />} />
            <Route path="settings"         element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <CompareBar />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <AppRoutes />
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
