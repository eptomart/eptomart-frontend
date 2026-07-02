import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

// Redirect legacy per-vertical order detail URLs → unified module
function RedirectOrderDetail({ vertical }) {
  const { orderId } = useParams();
  return <Navigate to={`/orders/${vertical}/${orderId}`} replace />;
}
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { KoyambeduCartProvider } from './context/KoyambeduCartContext';
import { EptoFreshCartProvider } from './context/EptoFreshCartContext';
import Loader from './components/common/Loader';
import CompareBar from './components/product/CompareBar';
import AIAssistant from './components/AIAssistant';
import WhatsAppFloat from './components/WhatsAppFloat';
import BottomNav from './components/common/BottomNav';

// ── Customer pages ───────────────────────────
const Home           = lazy(() => import('./pages/Home'));
const Categories     = lazy(() => import('./pages/Categories'));
const Shop           = lazy(() => import('./pages/Shop'));
const ProductPage    = lazy(() => import('./pages/ProductPage'));
const SellerStore    = lazy(() => import('./pages/SellerStore'));
const Cart           = lazy(() => import('./pages/Cart'));
const Checkout       = lazy(() => import('./pages/Checkout'));
const Orders             = lazy(() => import('./pages/orders/UnifiedOrders'));        // Unified My Orders (all verticals)
const UnifiedOrderDetail = lazy(() => import('./pages/orders/UnifiedOrderDetail'));   // Unified Order Details
const Login          = lazy(() => import('./pages/Login'));
const Profile        = lazy(() => import('./pages/Profile'));
const Wishlist       = lazy(() => import('./pages/Wishlist'));
const Compare        = lazy(() => import('./pages/Compare'));
const Contact        = lazy(() => import('./pages/Contact'));
const About          = lazy(() => import('./pages/About'));
const FAQ            = lazy(() => import('./pages/FAQ'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const ReturnPolicy   = lazy(() => import('./pages/ReturnPolicy'));
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DeleteAccount  = lazy(() => import('./pages/DeleteAccount'));
const ProductPreview = lazy(() => import('./pages/ProductPreview'));
const InvoiceView    = lazy(() => import('./pages/invoice/InvoiceView'));

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
const AdminAdmins       = lazy(() => import('./pages/admin/Admins'));
const AdminSettlements  = lazy(() => import('./pages/admin/Settlements'));
const AdminEnquiries    = lazy(() => import('./pages/admin/Enquiries'));
const AdminSettings     = lazy(() => import('./pages/admin/Settings'));
const AdminActivityLog  = lazy(() => import('./pages/admin/ActivityLog'));
const AdminSellerOrders = lazy(() => import('./pages/admin/SellerOrders'));
const AdminVisitors     = lazy(() => import('./pages/admin/Visitors'));
const AdminMessages     = lazy(() => import('./pages/admin/Messages'));
const AdminUzhavar      = lazy(() => import('./pages/admin/UzhavarAdmin'));
const AdminKoyambedu    = lazy(() => import('./pages/admin/KoyambeduAdmin'));
const AdminCoupons      = lazy(() => import('./pages/admin/Coupons'));

// ── Koyambedu Daily pages ─────────────────────
const KoyambeduHome         = lazy(() => import('./pages/koyambedu/KoyambeduHome'));
const KoyambeduShop         = lazy(() => import('./pages/koyambedu/KoyambeduShop'));
const KoyambeduProductDetail= lazy(() => import('./pages/koyambedu/KoyambeduProductDetail'));
const KoyambeduCart             = lazy(() => import('./pages/koyambedu/KoyambeduCart'));
const KoyambeduCheckout         = lazy(() => import('./pages/koyambedu/KoyambeduCheckout'));
// KoyambeduOrders / KoyambeduOrderDetail retired — unified Orders module handles these
const KoyambeduWallet           = lazy(() => import('./pages/koyambedu/KoyambeduWallet'));
const KoyambeduLocationPicker   = lazy(() => import('./pages/koyambedu/KoyambeduLocationPicker'));
const KoyambeduSellerRegister      = lazy(() => import('./pages/koyambedu/seller/KoyambeduSellerRegister'));
const KoyambeduSellerDashboard     = lazy(() => import('./pages/koyambedu/seller/KoyambeduSellerDashboard'));
const KoyambeduSellerProducts      = lazy(() => import('./pages/koyambedu/seller/KoyambeduSellerProducts'));
const KoyambeduSellerAdminDashboard= lazy(() => import('./pages/koyambedu/seller-admin/KoyambeduSellerAdminDashboard'));
const KoyambeduSellerAdminOrders   = lazy(() => import('./pages/koyambedu/seller-admin/KoyambeduSellerAdminOrders'));
const KoyambeduDailyPrice          = lazy(() => import('./pages/koyambedu/seller-admin/KoyambeduDailyPrice'));
const KoyambeduReports             = lazy(() => import('./pages/koyambedu/seller-admin/KoyambeduReports'));
const KoyambeduSpecialRequests     = lazy(() => import('./pages/koyambedu/seller-admin/KoyambeduSpecialRequests'));

// ── Farmer Fresh pages ───────────────────────
const UzhavarHome       = lazy(() => import('./pages/uzhavar/UzhavarHome'));
const FarmerDetail      = lazy(() => import('./pages/uzhavar/FarmerDetail'));
const FarmerDashboard   = lazy(() => import('./pages/uzhavar/FarmerDashboard'));
const FarmerRegister    = lazy(() => import('./pages/uzhavar/FarmerRegister'));
// MyUzhavarOrders retired — unified Orders module handles these
const UzhavarSubscribe  = lazy(() => import('./pages/uzhavar/UzhavarSubscribe'));

// ── EptoFresh Proteins pages ──────────────────
const EptoFreshHome            = lazy(() => import('./pages/eptofresh/EptoFreshHome'));
const EptoFreshShop            = lazy(() => import('./pages/eptofresh/EptoFreshShop'));
const EptoFreshCart            = lazy(() => import('./pages/eptofresh/EptoFreshCart'));
const EptoFreshCheckout        = lazy(() => import('./pages/eptofresh/EptoFreshCheckout'));
// EptoFreshOrders / EptoFreshOrderDetail retired — unified Orders module handles these
const EptoFreshTracking        = lazy(() => import('./pages/eptofresh/EptoFreshTracking'));
const EptoFreshSellerRegister  = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerRegister'));
const EptoFreshSellerDashboard = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerDashboard'));
const EptoFreshSellerProducts  = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerProducts'));
const EptoFreshSellerOrders    = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerOrders'));
const EptoFreshSellerOrderDetail = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerOrders').then(m => ({ default: m.EptoFreshSellerOrderDetail })));
const EptoFreshSellerPayouts   = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerPayouts'));
const EptoFreshAdmin                  = lazy(() => import('./pages/eptofresh/admin/EptoFreshAdmin'));
const EptoFreshLocationPicker         = lazy(() => import('./pages/eptofresh/EptoFreshLocationPicker').then(m => ({ default: m.EptoFreshLocationPicker })));
const EptoFreshSellerLocationPicker   = lazy(() => import('./pages/eptofresh/seller/EptoFreshSellerLocationPicker'));

// ── Seller pages ─────────────────────────────
const SellerLayout  = lazy(() => import('./pages/seller/SellerLayout'));
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));
const SellerProducts  = lazy(() => import('./pages/seller/Products'));
const SellerProductForm = lazy(() => import('./pages/seller/ProductForm'));
const SellerOrders    = lazy(() => import('./pages/seller/Orders'));
const SellerProfile   = lazy(() => import('./pages/seller/Profile'));
const SellerMessages  = lazy(() => import('./pages/seller/Messages'));
const SellerSuppliers = lazy(() => import('./pages/seller/Suppliers'));

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
  if (!['seller', 'admin', 'superAdmin'].includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// Redirect to home on fresh app open so the app never lands on login
// sessionStorage is wiped when the app/tab is closed — perfect for detecting fresh opens
function FreshStartRedirect() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (sessionStorage.getItem('_app_active')) return; // already navigating this session
    sessionStorage.setItem('_app_active', '1');

    // If the stored URL is a protected page, send user home instead
    const protectedPrefixes = [
      '/orders', '/profile', '/checkout', '/wishlist',
      '/eptofresh/orders', '/eptofresh/checkout',
      '/koyambedu/orders', '/koyambedu/checkout',
      '/uzhavar/my-orders',
      '/seller', '/admin',
    ];
    const isProtected = protectedPrefixes.some(p => pathname.startsWith(p));
    if (isProtected) navigate('/', { replace: true });
  }, []);

  return null;
}

function GlobalBottomNav() {
  const { pathname } = useLocation();
  // Hide on admin, seller portal, koyambedu seller/admin, and eptofresh seller pages
  const hidden = pathname.startsWith('/admin') ||
                 pathname.startsWith('/seller') ||
                 pathname.startsWith('/koyambedu/seller') ||
                 pathname.startsWith('/koyambedu/seller-admin') ||
                 pathname.startsWith('/eptofresh/seller') ||
                 pathname === '/eptofresh/location' ||
                 // Focused purchase flows: the page's own CTA bar must
                 // never compete with the bottom nav for the same space
                 pathname === '/koyambedu/cart' ||
                 pathname === '/koyambedu/checkout' ||
                 pathname === '/eptofresh/checkout' ||
                 pathname === '/checkout';
  if (hidden) return null;
  return <BottomNav />;
}

function AppRoutes() {
  return (
    <>
      <FreshStartRedirect />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<Home />} />
          <Route path="/categories"    element={<Categories />} />
          <Route path="/shop"          element={<Shop />} />
          <Route path="/shop/:category"element={<Shop />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/store/:sellerId" element={<SellerStore />} />
          <Route path="/cart"          element={<Cart />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/compare"       element={<Compare />} />
          <Route path="/contact"         element={<Contact />} />
          <Route path="/about"           element={<About />} />
          <Route path="/faq"             element={<FAQ />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/return-policy"   element={<ReturnPolicy />} />
          <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
          <Route path="/terms-of-service"element={<TermsOfService />} />
          <Route path="/delete-account"  element={<DeleteAccount />} />
          {/* Product preview — requires seller/admin login */}
          <Route path="/preview/:id"   element={<ProtectedRoute><ProductPreview /></ProtectedRoute>} />

          {/* Protected customer */}
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders"                element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:vertical/:id"  element={<ProtectedRoute><UnifiedOrderDetail /></ProtectedRoute>} />
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
            <Route path="messages"         element={<SellerMessages />} />
            <Route path="suppliers"        element={<SellerSuppliers />} />
            <Route path="profile"          element={<SellerProfile />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index                   element={<AdminDashboard />} />
            <Route path="products"         element={<AdminProducts />} />
            <Route path="approvals"        element={<AdminApprovals />} />
            <Route path="sellers"          element={<AdminSellers />} />
            <Route path="sellers/:sellerId/orders" element={<AdminSellerOrders />} />
            <Route path="orders"           element={<AdminOrders />} />
            <Route path="users"            element={<AdminUsers />} />
            <Route path="analytics"        element={<AdminAnalytics />} />
            <Route path="categories"       element={<AdminCategories />} />
            <Route path="expenses"         element={<AdminExpenses />} />
            <Route path="settlements"      element={<AdminSettlements />} />
            <Route path="enquiries"        element={<AdminEnquiries />} />
            <Route path="admins"           element={<AdminAdmins />} />
            <Route path="bulk-import"      element={<AdminBulkImport />} />
            <Route path="notifications"    element={<AdminNotifications />} />
            <Route path="activity-log"     element={<AdminActivityLog />} />
            <Route path="visitors"         element={<AdminVisitors />} />
            <Route path="settings"         element={<AdminSettings />} />
            <Route path="messages"         element={<AdminMessages />} />
            <Route path="uzhavar"          element={<AdminUzhavar />} />
            <Route path="koyambedu"        element={<AdminKoyambedu />} />
            <Route path="coupons"          element={<AdminCoupons />} />
          </Route>

          {/* ── Koyambedu Daily ─────────────────── */}
          <Route path="/koyambedu"                           element={<KoyambeduHome />} />
          <Route path="/koyambedu/location"                  element={<KoyambeduLocationPicker />} />
          <Route path="/koyambedu/shop"                      element={<KoyambeduShop />} />
          <Route path="/koyambedu/product/:productId"        element={<KoyambeduProductDetail />} />
          <Route path="/koyambedu/cart"                      element={<KoyambeduCart />} />
          <Route path="/koyambedu/checkout"                  element={<KoyambeduCheckout />} />
          {/* Legacy → unified Orders module */}
          <Route path="/koyambedu/orders"                    element={<Navigate to="/orders?tab=koyambedu" replace />} />
          <Route path="/koyambedu/orders/:orderId"           element={<RedirectOrderDetail vertical="koyambedu" />} />
          <Route path="/koyambedu/wallet"                    element={<ProtectedRoute><KoyambeduWallet /></ProtectedRoute>} />
          <Route path="/koyambedu/seller"                    element={<ProtectedRoute><KoyambeduSellerDashboard /></ProtectedRoute>} />
          <Route path="/koyambedu/seller/register"           element={<ProtectedRoute><KoyambeduSellerRegister /></ProtectedRoute>} />
          <Route path="/koyambedu/seller/products"           element={<ProtectedRoute><KoyambeduSellerProducts /></ProtectedRoute>} />
          <Route path="/koyambedu/seller-admin"                    element={<ProtectedRoute><KoyambeduSellerAdminDashboard /></ProtectedRoute>} />
          <Route path="/koyambedu/seller-admin/orders"           element={<ProtectedRoute><KoyambeduSellerAdminOrders /></ProtectedRoute>} />
          <Route path="/koyambedu/seller-admin/daily-price"        element={<ProtectedRoute><KoyambeduDailyPrice /></ProtectedRoute>} />
          <Route path="/koyambedu/seller-admin/reports"            element={<ProtectedRoute><KoyambeduReports /></ProtectedRoute>} />
          <Route path="/koyambedu/seller-admin/special-requests"   element={<ProtectedRoute><KoyambeduSpecialRequests /></ProtectedRoute>} />

          {/* ── Farmer Fresh ───────────────────── */}
          <Route path="/uzhavar"                    element={<UzhavarHome />} />
          <Route path="/uzhavar/farmer/register"    element={<ProtectedRoute><FarmerRegister /></ProtectedRoute>} />
          <Route path="/uzhavar/farmer/:farmerId"   element={<FarmerDetail />} />
          <Route path="/uzhavar/farmer"             element={<ProtectedRoute><FarmerDashboard /></ProtectedRoute>} />
          {/* Legacy → unified Orders module (also fixes previously broken /uzhavar/orders link) */}
          <Route path="/uzhavar/my-orders"          element={<Navigate to="/orders?tab=uzhavar" replace />} />
          <Route path="/uzhavar/orders"             element={<Navigate to="/orders?tab=uzhavar" replace />} />
          <Route path="/uzhavar/subscribe"          element={<UzhavarSubscribe />} />

          {/* ── EptoFresh Proteins ──────────────── */}
          <Route path="/eptofresh"                              element={<EptoFreshHome />} />
          <Route path="/eptofresh/location"                     element={<EptoFreshLocationPicker />} />
          <Route path="/eptofresh/shop/:sellerId"               element={<EptoFreshShop />} />
          <Route path="/eptofresh/cart"                         element={<ProtectedRoute><EptoFreshCart /></ProtectedRoute>} />
          <Route path="/eptofresh/checkout"                     element={<ProtectedRoute><EptoFreshCheckout /></ProtectedRoute>} />
          {/* Legacy → unified Orders module (live tracking page retained) */}
          <Route path="/eptofresh/orders"                       element={<Navigate to="/orders?tab=eptofresh" replace />} />
          <Route path="/eptofresh/orders/:orderId"              element={<RedirectOrderDetail vertical="eptofresh" />} />
          <Route path="/eptofresh/orders/:orderId/tracking"     element={<ProtectedRoute><EptoFreshTracking /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/register"              element={<ProtectedRoute><EptoFreshSellerRegister /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/location"              element={<ProtectedRoute><EptoFreshSellerLocationPicker /></ProtectedRoute>} />
          <Route path="/eptofresh/seller"                       element={<ProtectedRoute><EptoFreshSellerDashboard /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/products"              element={<ProtectedRoute><EptoFreshSellerProducts /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/orders"                element={<ProtectedRoute><EptoFreshSellerOrders /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/orders/:orderId"       element={<ProtectedRoute><EptoFreshSellerOrderDetail /></ProtectedRoute>} />
          <Route path="/eptofresh/seller/payouts"               element={<ProtectedRoute><EptoFreshSellerPayouts /></ProtectedRoute>} />
          <Route path="/admin/eptofresh"                        element={<AdminRoute><EptoFreshAdmin /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <GlobalBottomNav />
      <CompareBar />
      <AIAssistant />
      <WhatsAppFloat />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <KoyambeduCartProvider>
              <EptoFreshCartProvider>
                <AppRoutes />
              </EptoFreshCartProvider>
            </KoyambeduCartProvider>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
