import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import KoyambeduImageUploader from '../../components/koyambedu/KoyambeduImageUploader';
import KoyambeduVariantProductForm, { EMPTY_VARIANT_PRODUCT, getVariantOverlapError } from '../../components/koyambedu/KoyambeduVariantProductForm';
import toast from 'react-hot-toast';

const TAB_LIST = ['dashboard', 'orders', 'pending-approval', 'alerts', 'cancelled-orders', 'sellers', 'seller-admins', 'categories', 'products', 'daily-price', 'refund-requests', 'reports'];

const DELIVERY_SLOTS = [
  '06:00 AM – 08:59 AM',
  '09:00 AM – 11:59 AM',
  '12:00 PM – 02:59 PM',
  '03:00 PM – 05:59 PM',
];

// ── PDF generation helper ────────────────────────────────────────
function generateReportHtml(title, subtitle, content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 20px; }
    h1 { font-size: 18px; color: #14532d; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #374151; margin: 16px 0 6px; }
    h3 { font-size: 12px; color: #6b7280; margin: 12px 0 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #f0fdf4; color: #14532d; font-weight: bold; padding: 6px 8px; text-align: left; border: 1px solid #d1fae5; }
    td { padding: 5px 8px; border: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .summary-box { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 6px; padding: 10px; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .label { color: #6b7280; }
    .value { font-weight: bold; color: #14532d; }
    .sa-header { background: #ecfdf5; padding: 6px 10px; margin: 14px 0 6px; border-left: 3px solid #16a34a; font-weight: bold; font-size: 13px; }
    .page-break { page-break-before: always; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  ${content}
  <script>window.onload=()=>window.print();</script>
</body>
</html>`;
}

// ── Danger Zone component ─────────────────────
function DangerZone() {
  const [confirm, setConfirm] = useState('');
  const [wiping,  setWiping]  = useState(false);
  const [result,  setResult]  = useState(null);

  const handleWipe = async () => {
    if (confirm !== 'DELETE ALL') {
      toast.error('Type DELETE ALL exactly to confirm'); return;
    }
    setWiping(true);
    try {
      const { data } = await api.delete('/koyambedu/admin/wipe-all');
      setResult(data.deleted);
      setConfirm('');
      toast.success('All Koyambedu data wiped');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Wipe failed');
    } finally { setWiping(false); }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
        <h2 className="font-black text-red-700 text-base mb-1">⚠️ Danger Zone</h2>
        <p className="text-red-600 text-sm mb-4 leading-relaxed">
          This will permanently delete <strong>all</strong> Koyambedu data:
          products, sellers, seller-admins, orders, carts, and categories.
          <br />Main user accounts are <strong>not</strong> affected.
          <br /><span className="font-bold">This cannot be undone.</span>
        </p>

        {result && (
          <div className="bg-white border border-red-200 rounded-xl p-3 mb-4 text-xs text-gray-700 space-y-1">
            <p className="font-bold text-red-700 mb-1">✓ Wiped successfully:</p>
            {Object.entries(result).map(([k, v]) => (
              <p key={k}>{k}: <strong>{v}</strong> deleted</p>
            ))}
          </div>
        )}

        <label className="block text-sm font-bold text-red-700 mb-1">
          Type <code className="bg-red-100 px-1 rounded">DELETE ALL</code> to confirm
        </label>
        <input
          type="text"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="DELETE ALL"
          className="w-full border-2 border-red-300 rounded-xl px-3 py-2.5 text-sm font-mono mb-3 focus:outline-none focus:border-red-500"
        />
        <button
          onClick={handleWipe}
          disabled={wiping || confirm !== 'DELETE ALL'}
          className="w-full bg-red-600 text-white font-black py-3 rounded-xl disabled:opacity-40 transition active:scale-95">
          {wiping ? 'Wiping…' : '🗑️ Wipe All Koyambedu Data'}
        </button>
      </div>
    </div>
  );
}


const STATUS_OPTIONS = [
  'placed','pending_confirmation','price_revision_pending','confirmed',
  'packing','dispatched','delivered','reported','cancelled','closed',
];
const STATUS_COLOR = {
  placed:'bg-gray-100 text-gray-700', pending_confirmation:'bg-yellow-100 text-yellow-700',
  price_revision_pending:'bg-orange-100 text-orange-700', confirmed:'bg-green-100 text-green-700',
  packing:'bg-purple-100 text-purple-700', dispatched:'bg-blue-100 text-blue-700',
  delivered:'bg-green-200 text-green-800', reported:'bg-rose-100 text-rose-700', cancelled:'bg-red-100 text-red-700',
};
const SELLER_STATUS_COLOR = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-700',
  suspended:      'bg-orange-100 text-orange-700',
};

export default function KoyambeduAdmin() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [tab,     setTab]     = useState('dashboard');
  const [stats,   setStats]   = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [sellers, setSellers] = useState([]);
  const [sellerAdmins, setSellerAdmins] = useState([]);
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchOrder,  setSearchOrder]  = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [saFilter,     setSaFilter]     = useState('');
  const [catFilter,    setCatFilter]    = useState('');

  // Category create/edit modal
  const [showCatForm,  setShowCatForm]  = useState(false);
  const [catFormEdit,  setCatFormEdit]  = useState(null); // null = create, object = edit
  const [catForm,      setCatForm]      = useState({ name:'', nameTamil:'', icon:'🌿', image:'', description:'', sortOrder:'0' });
  const [catImgUploading, setCatImgUploading] = useState(false);
  const [catSaving,    setCatSaving]    = useState(false);

  // Order update modal
  const [updateModal, setUpdateModal] = useState(null);
  const [newStatus,    setNewStatus]  = useState('');
  const [delivPartner, setDelivPartner] = useState('');
  const [adminNotes,   setAdminNotes]  = useState('');
  const [updating,     setUpdating]    = useState(false);

  // SellerAdmin create modal
  const [showSaCreate, setShowSaCreate] = useState(false);
  const [saForm, setSaForm] = useState({ userId:'', name:'', businessName:'', contactPhone:'', contactEmail:'' });
  const [saCreating, setSaCreating] = useState(false);
  const [userQuery,   setUserQuery]   = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearching, setUserSearching] = useState(false);

  // Reject reason modal
  const [rejectModal, setRejectModal] = useState(null); // { id, type: 'seller'|'sa' }
  const [rejectReason, setRejectReason] = useState('');

  // Edit Seller modal (SuperAdmin only)
  const [editSeller,    setEditSeller]    = useState(null); // seller object
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);

  // Review SA edit modal (SuperAdmin only)
  const [reviewEditSeller, setReviewEditSeller] = useState(null); // seller with pendingEdit
  const [reviewEditSaving, setReviewEditSaving] = useState(false);

  // Create Seller modal (SuperAdmin only)
  const [showCreateSeller, setShowCreateSeller] = useState(false);
  const [createSellerForm, setCreateSellerForm] = useState({
    ownerName: '', businessName: '', stallNumber: '', marketSection: '',
    contactPhone: '', contactEmail: '', commissionRate: '10', description: '',
    assignedSellerAdminId: '',
  });
  const [approvedSaList, setApprovedSaList] = useState([]);
  const [createSellerSaving, setCreateSellerSaving] = useState(false);

  // Add Product modal (admin adds product for any seller)
  const [showAddProduct,   setShowAddProduct]   = useState(false);
  const [addProdSeller,    setAddProdSeller]     = useState(null); // full seller object
  const [kbdCategories,    setKbdCategories]     = useState([]);
  const [kbdProdForm,      setKbdProdForm]       = useState(EMPTY_VARIANT_PRODUCT);
  const [addProdSaving,    setAddProdSaving]      = useState(false);

  // Products tab
  const [products,       setProducts]       = useState([]);
  const [prodSearch,     setProdSearch]     = useState('');
  const [prodAvail,      setProdAvail]      = useState('');
  const [editProduct,    setEditProduct]    = useState(null); // product being edited
  const [editProdForm,   setEditProdForm]   = useState({});
  const [editProdSaving, setEditProdSaving] = useState(false);

  // Daily price tab (admin)
  const [dpProducts,   setDpProducts]   = useState([]);
  const [dpSaFilter,   setDpSaFilter]   = useState('');
  const [dpEdits,      setDpEdits]      = useState({});
  const [dpSaving,     setDpSaving]     = useState({});
  const [dpBulkSaving, setDpBulkSaving] = useState(false);

  // Extended order filters
  const [orderDeliveryDate,  setOrderDeliveryDate]  = useState('');
  const [orderDeliverySlot,  setOrderDeliverySlot]  = useState('');
  const [orderSaFilter,      setOrderSaFilter]      = useState('');
  const [saAdminList,        setSaAdminList]        = useState([]);

  // Item-level actions
  const [expandedOrderId,  setExpandedOrderId]   = useState(null);
  const [editQtyModal,     setEditQtyModal]       = useState(null); // {order, itemIdx, currentQty}
  const [newQty,           setNewQty]             = useState('');
  const [qtyUpdating,      setQtyUpdating]        = useState(false);
  const [decliningItem,    setDecliningItem]       = useState(null); // {orderId, itemIdx, itemName}

  // Pending approval tab (sa_review_submitted orders)
  const [pendingApprovalOrders, setPendingApprovalOrders] = useState([]);
  const [approveModal,   setApproveModal]   = useState(null); // order object
  const [approveAction,  setApproveAction]  = useState('approve'); // 'approve' | 'reject'
  const [approveNotes,   setApproveNotes]   = useState('');
  const [approving,      setApproving]      = useState(false);
  const [cancelOrderModal, setCancelOrderModal] = useState(null); // order object
  const [cancelReason,   setCancelReason]   = useState('');
  const [cancelling,     setCancelling]     = useState(false);

  // Cancelled orders tab
  const [cancelledOrders,  setCancelledOrders]  = useState([]);
  const [deliveryAlerts,   setDeliveryAlerts]   = useState([]);
  const [cancelledExpanded, setCancelledExpanded] = useState({});

  // Refund requests tab
  const [refundRequests,   setRefundRequests]   = useState([]);
  const [refundStatusFilter, setRefundStatusFilter] = useState('pending');
  const [refundUpdating,   setRefundUpdating]   = useState(null);

  // Admin costs (per order — internal only)
  const [costsModal,    setCostsModal]    = useState(null); // order object
  const [costsForm,     setCostsForm]     = useState({ actualDeliveryCost: '', miscExpenses: '', costNote: '' });
  const [costsSaving,   setCostsSaving]   = useState(false);

  // Partial refund modal
  const [refundModal,   setRefundModal]   = useState(null); // order object
  const [refundAmt,     setRefundAmt]     = useState('');
  const [refundReason,  setRefundReason]  = useState('');
  const [refunding,     setRefunding]     = useState(false);

  // Reports tab
  const [rptType,       setRptType]       = useState('order-report');   // 'order-report' | 'product-consolidation' | 'cashflow'
  const [rptDate,       setRptDate]       = useState('');
  const [rptSlot,       setRptSlot]       = useState('');
  const [rptSa,         setRptSa]         = useState('');
  const [rptData,       setRptData]       = useState(null);
  const [rptLoading,    setRptLoading]    = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  // Load seller admin list for order filter on first visit
  useEffect(() => {
    api.get('/koyambedu/admin/seller-admins').then(r => setSaAdminList(r.data.sellerAdmins || [])).catch(() => {});
  }, []);

  const loadTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'dashboard') {
        const { data } = await api.get('/koyambedu/admin/dashboard');
        setStats(data.stats);
      } else if (t === 'orders') {
        const params = new URLSearchParams();
        if (statusFilter)        params.set('status', statusFilter);
        if (searchOrder)         params.set('search', searchOrder);
        if (orderDeliveryDate)   params.set('deliveryDate', orderDeliveryDate);
        if (orderDeliverySlot)   params.set('deliverySlot', orderDeliverySlot);
        if (orderSaFilter)       params.set('sellerAdmin', orderSaFilter);
        const { data } = await api.get(`/koyambedu/admin/orders?${params}&limit=100`);
        setOrders(data.orders || []);
      } else if (t === 'pending-approval') {
        const { data } = await api.get('/koyambedu/admin/orders/pending-approval');
        setPendingApprovalOrders(data.orders || []);
      } else if (t === 'alerts') {
        const { data } = await api.get('/koyambedu/admin/alerts');
        setDeliveryAlerts(data.alerts || []);
      } else if (t === 'cancelled-orders') {
        const { data } = await api.get('/koyambedu/admin/orders?status=cancelled&limit=200');
        const partial  = await api.get('/koyambedu/admin/orders?itemStatus=declined&limit=200');
        const combined = [...(data.orders || []), ...(partial.data?.orders || [])];
        // Deduplicate by _id
        const seen = new Set();
        setCancelledOrders(combined.filter(o => { if (seen.has(o._id)) return false; seen.add(o._id); return true; }));
      } else if (t === 'refund-requests') {
        const { data } = await api.get(`/koyambedu/admin/refund-requests?status=${refundStatusFilter}`);
        setRefundRequests(data.requests || []);
      } else if (t === 'sellers') {
        const params = sellerFilter ? `?status=${sellerFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/sellers${params}`);
        setSellers(data.sellers || []);
      } else if (t === 'seller-admins') {
        const params = saFilter ? `?status=${saFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/seller-admins${params}`);
        setSellerAdmins(data.sellerAdmins || []);
      } else if (t === 'categories') {
        const params = catFilter ? `?status=${catFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/categories${params}`);
        setCats(data.categories || []);
      } else if (t === 'products') {
        const params = new URLSearchParams();
        if (prodSearch) params.set('search', prodSearch);
        if (prodAvail)  params.set('available', prodAvail);
        const { data } = await api.get(`/koyambedu/admin/products?${params}`);
        setProducts(data.products || []);
      } else if (t === 'daily-price') {
        const params = dpSaFilter ? `?sellerAdmin=${dpSaFilter}` : '';
        const { data } = await api.get(`/koyambedu/admin/daily-price${params}`);
        setDpProducts(data.products || []);
        setDpEdits({});
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const updateOrderStatus = async () => {
    if (!newStatus) { toast.error('Select a status'); return; }
    setUpdating(true);
    try {
      await api.patch(`/koyambedu/admin/orders/${updateModal._id}/status`, {
        status: newStatus, deliveryPartner: delivPartner, adminNotes,
      });
      toast.success('Order updated');
      setUpdateModal(null);
      loadTab('orders');
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  const handleEditQty = async () => {
    if (!newQty || Number(newQty) < 1) { toast.error('Enter valid quantity'); return; }
    setQtyUpdating(true);
    try {
      const { data } = await api.patch(
        `/koyambedu/admin/orders/${editQtyModal.orderId}/items/${editQtyModal.itemIdx}/qty`,
        { newQty: Number(newQty) }
      );
      toast.success('Quantity updated');
      setEditQtyModal(null);
      setOrders(prev => prev.map(o => o._id === data.order._id ? data.order : o));
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setQtyUpdating(false); }
  };

  const handleDeclineItem = async () => {
    if (!decliningItem) return;
    setDecliningItem(prev => ({ ...prev, loading: true }));
    try {
      const { data } = await api.patch(
        `/koyambedu/admin/orders/${decliningItem.orderId}/items/${decliningItem.itemIdx}/decline`
      );
      toast.success(data.message);
      setOrders(prev => prev.map(o => o._id === data.order._id ? data.order : o));
      setDecliningItem(null);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); setDecliningItem(null); }
  };

  // ── Approve / reject SA review ──────────────────────────────────
  const handleApproveReview = async () => {
    if (!approveModal) return;
    setApproving(true);
    try {
      const { data } = await api.patch(`/koyambedu/admin/orders/${approveModal._id}/approve-review`, {
        action: approveAction,
        notes:  approveNotes,
      });
      toast.success(data.message);
      setApproveModal(null);
      setApproveNotes('');
      // Remove from pending list
      setPendingApprovalOrders(prev => prev.filter(o => o._id !== approveModal._id));
      // Refresh orders tab if visible
      if (tab === 'orders') loadTab('orders');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally { setApproving(false); }
  };

  // ── Cancel order (Super Admin only) ─────────────────────────────
  const resolveAlert = async (a) => {
    const resolution = window.prompt(`Resolve alert for order ${a.orderId}?\n\nEnter resolution note (required):`);
    if (resolution == null) return;
    if (!resolution.trim()) { toast.error('Resolution note is required'); return; }
    try {
      const { data } = await api.patch(`/koyambedu/admin/orders/${a._id}/alerts/resolve`, { resolution: resolution.trim() });
      toast.success(data.message || 'Alert resolved');
      setDeliveryAlerts(prev => prev.filter(x => x._id !== a._id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not resolve alert');
    }
  };

  const closeOrder = async (order) => {
    const comments = window.prompt(
      `Close order ${order.orderId}?\n\nEnter closing comments (required — e.g. compensated customer with offer for missing items):`
    );
    if (comments == null) return;
    if (!comments.trim() || comments.trim().length < 5) { toast.error('Closing comments are required (min 5 characters)'); return; }
    try {
      const { data } = await api.patch(`/koyambedu/admin/orders/${order._id}/close`, { comments: comments.trim() });
      toast.success(data.message || 'Order closed');
      loadTab('orders');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not close order');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderModal) return;
    if (!cancelReason.trim()) { toast.error('Cancel reason is required'); return; }
    setCancelling(true);
    try {
      const { data } = await api.patch(`/koyambedu/admin/orders/${cancelOrderModal._id}/cancel`, {
        reason: cancelReason,
      });
      toast.success(data.message);
      setCancelOrderModal(null);
      setCancelReason('');
      loadTab(tab);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cancel failed');
    } finally { setCancelling(false); }
  };

  const handleRefundAction = async (walletId, requestId, action) => {
    setRefundUpdating(requestId);
    try {
      await api.patch(`/koyambedu/admin/refund-requests/${walletId}/${requestId}`, { action });
      toast.success('Updated');
      loadTab('refund-requests');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setRefundUpdating(null); }
  };

  // Daily price helpers
  const dpCalc = (base, pf = 10, lf = 10, sm = 15) => {
    const p = Math.round(base * pf / 100 * 100) / 100;
    const l = Math.round(base * lf / 100 * 100) / 100;
    const s = Math.round(base * sm / 100 * 100) / 100;
    return { finalPrice: Math.round((base + p + l + s) * 100) / 100 };
  };
  const getDpEdit = (p) => dpEdits[p._id] || {
    basePrice: p.basePrice || p.currentPrice || 0,
    sellerMarginPercent: p.sellerMarginPercent || 15,
    platformFeePercent: p.platformFeePercent || 10,
    logisticsPercent: p.logisticsPercent || 10,
  };
  const setDpEdit = (id, field, val) => {
    const prod = dpProducts.find(p => p._id === id) || {};
    setDpEdits(prev => ({ ...prev, [id]: { ...getDpEdit(prod), [field]: Number(val) } }));
  };
  const saveDpOne = async (p) => {
    setDpSaving(prev => ({ ...prev, [p._id]: true }));
    try {
      const e = getDpEdit(p);
      await api.patch(`/koyambedu/admin/daily-price/${p._id}`, e);
      toast.success(`${p.name} updated`);
      loadTab('daily-price');
    } catch { toast.error('Failed'); }
    finally { setDpSaving(prev => ({ ...prev, [p._id]: false })); }
  };
  const saveDpBulk = async () => {
    const updates = Object.entries(dpEdits).map(([productId, e]) => ({ productId, ...e }));
    if (!updates.length) { toast('No changes to save'); return; }
    setDpBulkSaving(true);
    try {
      await api.post('/koyambedu/admin/daily-price/bulk', { updates });
      toast.success(`${updates.length} products updated`);
      loadTab('daily-price');
    } catch { toast.error('Bulk save failed'); }
    finally { setDpBulkSaving(false); }
  };
  const exportDpCsv = () => {
    const rows = [['Name','Seller','Base Price','Final Price','Last Updated']];
    dpProducts.forEach(p => {
      const e = getDpEdit(p);
      const { finalPrice } = dpCalc(e.basePrice, e.platformFeePercent, e.logisticsPercent, e.sellerMarginPercent);
      rows.push([p.name, p.seller?.businessName || p.seller?.name || '-', e.basePrice, finalPrice, p.priceUpdatedAt ? new Date(p.priceUpdatedAt).toLocaleDateString('en-IN') : '-']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `price-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const sellerAction = async (sellerId, action, reason = '') => {
    try {
      await api.patch(`/koyambedu/admin/sellers/${sellerId}/approve`, { action, reason });
      toast.success(`Seller ${action}d`);
      loadTab('sellers');
    } catch { toast.error('Failed'); }
  };

  const toggleSeller = async (sellerId) => {
    try {
      const { data } = await api.patch(`/koyambedu/admin/sellers/${sellerId}/toggle`);
      toast.success(data.isActive ? 'Seller activated' : 'Seller deactivated');
      loadTab('sellers');
    } catch { toast.error('Failed'); }
  };

  const saAction = async (saId, action, reason = '') => {
    try {
      await api.patch(`/koyambedu/admin/seller-admins/${saId}/approve`, { action, reason });
      toast.success(`SellerAdmin ${action}d`);
      loadTab('seller-admins');
    } catch { toast.error('Failed'); }
  };

  const searchUsers = async (q) => {
    setUserQuery(q);
    setSelectedUser(null);
    setSaForm(f => ({ ...f, userId: '' }));
    if (q.trim().length < 3) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      const { data } = await api.get(`/koyambedu/admin/user-search?q=${encodeURIComponent(q.trim())}`);
      setUserResults(data.users || []);
    } catch { setUserResults([]); }
    finally { setUserSearching(false); }
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery(u.email || u.phone || '');
    setSaForm(f => ({ ...f, userId: u._id, name: f.name || u.name || '', contactPhone: f.contactPhone || u.phone || '', contactEmail: f.contactEmail || u.email || '' }));
  };

  const createSellerAdmin = async () => {
    if (!saForm.userId || !saForm.name) { toast.error('Select a user and enter a name'); return; }
    setSaCreating(true);
    try {
      await api.post('/koyambedu/admin/seller-admins', saForm);
      toast.success('SellerAdmin created. Pending review.');
      setShowSaCreate(false);
      setSaForm({ userId:'', name:'', businessName:'', contactPhone:'', contactEmail:'' });
      setSelectedUser(null); setUserQuery(''); setUserResults([]);
      loadTab('seller-admins');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaCreating(false); }
  };

  const reviewSellerEdit = async (approve, rejectReason = '') => {
    if (!reviewEditSeller) return;
    setReviewEditSaving(true);
    try {
      const { data } = await api.post(
        `/koyambedu/admin/sellers/${reviewEditSeller._id}/review-edit`,
        { approve, rejectReason }
      );
      toast.success(approve ? 'Edit approved and applied!' : 'Edit rejected');
      setReviewEditSeller(null);
      setSellers(prev => prev.map(s => s._id === reviewEditSeller._id ? data.seller : s));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setReviewEditSaving(false); }
  };

  const approveCategory = async (catId, approve) => {
    try {
      await api.patch(`/koyambedu/admin/categories/${catId}/approve`, { approve });
      toast.success(approve ? 'Category approved' : 'Category rejected');
      loadTab('categories');
    } catch { toast.error('Failed'); }
  };

  const openEditSeller = (s) => {
    setEditSeller(s);
    setEditForm({
      ownerName:     s.ownerName     || '',
      businessName:  s.businessName  || '',
      stallNumber:   s.stallNumber   || '',
      marketSection: s.marketSection || '',
      description:   s.description   || '',
      contactPhone:  s.contact?.phone || '',
      contactEmail:  s.contact?.email || '',
      syncToAccount: false,
    });
  };

  const saveEditSeller = async () => {
    setEditSaving(true);
    try {
      const { data } = await api.patch(`/koyambedu/admin/sellers/${editSeller._id}/contact`, editForm);
      toast.success('Seller updated');
      setEditSeller(null);
      // Update the local list immediately
      setSellers(prev => prev.map(s => s._id === editSeller._id ? data.seller : s));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update'); }
    finally { setEditSaving(false); }
  };

  const openAddProduct = async (seller) => {
    setAddProdSeller(seller);
    setKbdProdForm(EMPTY_VARIANT_PRODUCT);
    if (!kbdCategories.length) {
      try {
        const { data } = await api.get('/koyambedu/categories');
        setKbdCategories(data.categories || []);
      } catch {}
    }
    setShowAddProduct(true);
  };

  const submitAddProduct = async () => {
    if (!kbdProdForm.categoryId || !kbdProdForm.name) {
      toast.error('Category and name are required'); return;
    }
    const validVariants = (kbdProdForm.variants || []).filter((v, i, arr) => v.basePrice && v.fromQty && (v.toQty || i === arr.length - 1));
    if (validVariants.length === 0) {
      toast.error('At least one complete variant (base price + qty range) is required'); return;
    }
    const overlapErr = getVariantOverlapError(validVariants);
    if (overlapErr) { toast.error(overlapErr); return; }
    setAddProdSaving(true);
    try {
      await api.post(`/koyambedu/admin/sellers/${addProdSeller._id}/products`, {
        ...kbdProdForm,
        variants: validVariants,
      });
      toast.success('Product added!');
      setShowAddProduct(false);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setAddProdSaving(false); }
  };

  const openCatCreate = () => {
    setCatFormEdit(null);
    setCatForm({ name:'', nameTamil:'', icon:'🌿', image:'', description:'', sortOrder:'0' });
    setShowCatForm(true);
  };

  const openCatEdit = (cat) => {
    setCatFormEdit(cat);
    setCatForm({ name: cat.name, nameTamil: cat.nameTamil || '', icon: cat.icon || '🌿', image: cat.image || '', description: cat.description || '', sortOrder: String(cat.sortOrder || 0) });
    setShowCatForm(true);
  };

  const uploadCatImage = async (file) => {
    if (!file) return;
    setCatImgUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/koyambedu/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCatForm(f => ({ ...f, image: data.url }));
      toast.success('Image uploaded');
    } catch { toast.error('Image upload failed'); }
    finally { setCatImgUploading(false); }
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setCatSaving(true);
    try {
      if (catFormEdit) {
        await api.put(`/koyambedu/admin/categories/${catFormEdit._id}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post('/koyambedu/admin/categories', catForm);
        toast.success('Category created');
      }
      setShowCatForm(false);
      loadTab('categories');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setCatSaving(false); }
  };

  const toggleCatActive = async (cat) => {
    try {
      await api.put(`/koyambedu/admin/categories/${cat._id}`, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
      loadTab('categories');
    } catch { toast.error('Failed'); }
  };

  const openEditProduct = (p) => {
    setEditProduct(p);
    setEditProdForm({
      categoryId:               p.category?._id || p.categoryId || '',
      name:                     p.name,
      nameTamil:                p.nameTamil || '',
      unit:                     p.unit || 'kg',
      description:              p.description || '',
      isAvailable:              p.isAvailable,
      isSameDay:                p.isSameDay,
      isNextDay:                p.isNextDay,
      badges:                   p.badges || [],
      images:                   p.images || [],
      procurementChargePercent: p.procurementChargePercent || 15,
      platformChargePercent:    p.platformChargePercent    || 10,
      logisticsChargePercent:   p.logisticsChargePercent   || 10,
      variants: p.variants?.length
        ? p.variants.map(v => ({ basePrice: v.basePrice, fromQty: v.fromQty, toQty: v.toQty, finalPrice: String(v.finalPrice) }))
        : [{ basePrice: p.currentPrice || '', fromQty: p.minQty || 1, toQty: p.maxQty || 50, finalPrice: String(p.currentPrice || '') }],
    });
  };

  const saveEditProduct = async () => {
    const validVariants = (editProdForm.variants || []).filter((v, i, arr) => v.basePrice && v.fromQty && (v.toQty || i === arr.length - 1));
    const overlapErr = getVariantOverlapError(validVariants);
    if (overlapErr) { toast.error(overlapErr); return; }
    setEditProdSaving(true);
    try {
      await api.put(`/koyambedu/admin/products/${editProduct._id}`, {
        ...editProdForm,
        variants: validVariants.length > 0 ? validVariants : undefined,
      });
      toast.success('Product updated');
      setEditProduct(null);
      loadTab('products');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setEditProdSaving(false); }
  };

  const toggleProduct = async (productId) => {
    try {
      const { data } = await api.patch(`/koyambedu/admin/products/${productId}/toggle`);
      toast.success(data.isAvailable ? 'Product enabled' : 'Product disabled');
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, isAvailable: data.isAvailable } : p));
    } catch { toast.error('Failed'); }
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/koyambedu/admin/products/${p._id}`);
      toast.success('Product deleted');
      setProducts(prev => prev.filter(x => x._id !== p._id));
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  const openCreateSeller = async () => {
    setCreateSellerForm({ ownerName:'', businessName:'', stallNumber:'', marketSection:'', contactPhone:'', contactEmail:'', commissionRate:'10', description:'', assignedSellerAdminId:'' });
    // Load approved seller admins for the dropdown
    try {
      const { data } = await api.get('/koyambedu/admin/seller-admins?status=approved');
      setApprovedSaList(data.sellerAdmins || []);
    } catch { setApprovedSaList([]); }
    setShowCreateSeller(true);
  };

  const submitCreateSeller = async () => {
    const { ownerName, businessName, contactPhone } = createSellerForm;
    if (!ownerName || !businessName || !contactPhone) {
      toast.error('Owner name, business name and phone are required'); return;
    }
    setCreateSellerSaving(true);
    try {
      await api.post('/koyambedu/admin/sellers', createSellerForm);
      toast.success('Seller created and approved!');
      setShowCreateSeller(false);
      loadTab('sellers');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create seller'); }
    finally { setCreateSellerSaving(false); }
  };

  // ── Admin costs save ──────────────────────────────────────────
  const saveCosts = async () => {
    if (!costsModal) return;
    setCostsSaving(true);
    try {
      await api.patch(`/koyambedu/admin/orders/${costsModal._id}/costs`, {
        actualDeliveryCost: Number(costsForm.actualDeliveryCost) || 0,
        miscExpenses:       Number(costsForm.miscExpenses) || 0,
        costNote:           costsForm.costNote,
      });
      toast.success('Costs saved');
      setOrders(prev => prev.map(o => o._id === costsModal._id
        ? { ...o, adminCosts: { actualDeliveryCost: Number(costsForm.actualDeliveryCost)||0, miscExpenses: Number(costsForm.miscExpenses)||0, costNote: costsForm.costNote } }
        : o
      ));
      setCostsModal(null);
    } catch { toast.error('Failed to save costs'); }
    finally { setCostsSaving(false); }
  };

  // ── Partial refund ───────────────────────────────────────────
  const submitPartialRefund = async () => {
    const amount = Number(refundAmt);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!refundReason.trim()) { toast.error('Reason is required before initiating a refund'); return; }
    if (!window.confirm(`Initiate ₹${amount} refund to source for order ${refundModal.orderId}?`)) return;
    setRefunding(true);
    try {
      const { data } = await api.patch(`/koyambedu/admin/orders/${refundModal._id}/partial-refund`, {
        amount, reason: refundReason,
      });
      toast.success(data.message);
      // Update local order with new partialRefunds list
      setOrders(prev => prev.map(o => o._id === refundModal._id
        ? { ...o, partialRefunds: data.partialRefunds }
        : o
      ));
      setRefundModal(null);
      setRefundAmt('');
      setRefundReason('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  // ── Report fetch ─────────────────────────────────────────────
  const fetchReport = async () => {
    if (!rptDate) { toast.error('Select a delivery date'); return; }
    if (rptType === 'product-consolidation' && !rptSlot) { toast.error('Select a slot for product consolidation'); return; }
    setRptLoading(true);
    setRptData(null);
    try {
      const params = new URLSearchParams({ deliveryDate: rptDate });
      if (rptSlot) params.set('slot', rptSlot);
      if (rptSa)   params.set('sellerAdmin', rptSa);
      const { data } = await api.get(`/koyambedu/admin/reports/${rptType}?${params}`);
      setRptData(data);
    } catch (err) { toast.error(err?.response?.data?.message || 'Report failed'); }
    finally { setRptLoading(false); }
  };

  // ── Print/Share report ────────────────────────────────────────
  const shareReport = async () => {
    if (!rptData) return;
    let content = '';
    const dateLabel = `${rptDate}${rptSlot ? ' · ' + rptSlot : ''}`;

    if (rptType === 'order-report') {
      rptData.report?.forEach(group => {
        const saName = group.sa?.businessName || group.sa?.name || 'Unknown SA';
        content += `<div class="sa-header">📦 ${saName}</div>`;
        content += `<table><thead><tr><th>Order ID</th><th>Items</th><th>Total</th><th>Delivery Date</th><th>Slot</th><th>Address</th></tr></thead><tbody>`;
        group.orders?.forEach(o => {
          const itemRows = o.items.map(it => `${it.name} × ${it.quantity}${it.unit || ''} @ ₹${it.orderedPrice} = ₹${it.lineTotal?.toFixed(0)}`).join('<br/>');
          const addr = o.shippingAddress;
          content += `<tr><td>${o.orderId}</td><td>${itemRows}</td><td>₹${o.saSubtotal?.toFixed(0)}</td><td>${o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN') : '-'}</td><td>${o.deliverySlot || '-'}</td><td>${addr?.addressLine1 || ''}, ${addr?.city || ''} - ${addr?.pincode || ''}</td></tr>`;
        });
        content += `</tbody></table>`;
      });
    } else if (rptType === 'product-consolidation') {
      const saLabel = typeof rptData.sellerAdmin === 'string' ? rptData.sellerAdmin : (rptData.sellerAdmin?.businessName || rptData.sellerAdmin?.name || 'All SA');
      content += `<div class="summary-box"><div class="summary-row"><span class="label">Seller Admin</span><span class="value">${saLabel}</span></div><div class="summary-row"><span class="label">Orders</span><span class="value">${rptData.orderCount}</span></div></div>`;
      content += `<table><thead><tr><th>Product</th><th>Total Qty</th><th>Unit</th><th>Total Value</th><th>Orders</th></tr></thead><tbody>`;
      rptData.products?.forEach(p => {
        content += `<tr><td>${p.name}</td><td><strong>${p.totalQty.toFixed(2)}</strong></td><td>${p.unit}</td><td>₹${p.totalValue?.toFixed(0)}</td><td>${p.orderCount}</td></tr>`;
      });
      content += `</tbody></table>`;
    } else if (rptType === 'cashflow') {
      const s = rptData.summary || {};
      content += `<div class="summary-box">
        <div class="summary-row"><span class="label">Total Orders</span><span class="value">${s.orderCount}</span></div>
        <div class="summary-row"><span class="label">Amount Received</span><span class="value">₹${s.totalReceived?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Procurement Cost (to SA)</span><span class="value">₹${s.totalProcurement?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">SA Commission</span><span class="value">₹${s.totalSaCommission?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Eptomart Commission</span><span class="value">₹${s.totalEptomartCommission?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Delivery Collected</span><span class="value">₹${s.totalDeliveryCollected?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Actual Delivery Cost</span><span class="value">₹${s.totalActualDelivery?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Misc Expenses</span><span class="value">₹${s.totalMiscExpenses?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label">Net Delivery Profit</span><span class="value">₹${s.netDeliveryProfit?.toFixed(0)}</span></div>
        <div class="summary-row"><span class="label" style="font-weight:bold">Eptomart Net Profit</span><span class="value" style="font-size:14px">₹${s.eptomartNetProfit?.toFixed(0)}</span></div>
      </div>`;
      content += `<h2>Per Seller Admin Breakdown</h2><table><thead><tr><th>Seller Admin</th><th>Orders</th><th>Procurement</th><th>SA Commission</th><th>Total to SA</th><th>Eptomart Commission</th></tr></thead><tbody>`;
      rptData.saSummary?.forEach(sa => {
        content += `<tr><td>${sa.sa?.businessName || sa.sa?.name}</td><td>${sa.orderCount}</td><td>₹${sa.procurementCost?.toFixed(0)}</td><td>₹${sa.saCommission?.toFixed(0)}</td><td>₹${sa.totalToSA?.toFixed(0)}</td><td>₹${sa.eptomartCommission?.toFixed(0)}</td></tr>`;
      });
      content += `</tbody></table>`;
      content += `<h2>Delivery Expense per Order</h2><table><thead><tr><th>Order ID</th><th>Slot</th><th>Delivery Charged</th><th>Actual Cost</th><th>Misc</th><th>Net</th></tr></thead><tbody>`;
      rptData.deliveryExpenses?.forEach(d => {
        content += `<tr><td>${d.orderId}</td><td>${d.deliverySlot || '-'}</td><td>₹${d.deliveryCharge?.toFixed(0)}</td><td>₹${d.actualDeliveryCost?.toFixed(0)}</td><td>₹${d.miscExpenses?.toFixed(0)}</td><td>₹${d.netDeliveryProfit?.toFixed(0)}</td></tr>`;
      });
      content += `</tbody></table>`;
    }

    const rptTitle = rptType === 'order-report' ? 'Order Report' : rptType === 'product-consolidation' ? 'Product Consolidation Report' : 'Cash Flow Report';
    const html = generateReportHtml(`Koyambedu Daily — ${rptTitle}`, `Delivery Date: ${dateLabel} · Generated: ${new Date().toLocaleString('en-IN')}`, content);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], `koyambedu-report-${rptType}-${rptDate}.html`, { type: 'text/html' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: rptTitle });
          return;
        }
      } catch {}
    }
    // Fallback: open for print
    const win = window.open(url, '_blank');
    if (win) win.focus();
    else { const a = document.createElement('a'); a.href = url; a.download = `report-${rptDate}.html`; a.click(); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-lg">Koyambedu Daily — Admin</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {TAB_LIST.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${tab === t ? 'bg-white text-green-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {t === 'seller-admins' ? 'Seller Admins' : t === 'pending-approval' ? `⏳ Approvals${pendingApprovalOrders.length ? ` (${pendingApprovalOrders.length})` : ''}` : t === 'alerts' ? `🚨 Alerts${deliveryAlerts.length ? ` (${deliveryAlerts.length})` : ''}` : t === 'cancelled-orders' ? '❌ Cancelled' : t === 'refund-requests' ? '💸 Refunds' : t === 'daily-price' ? '🏷️ Daily Price' : t === 'reports' ? '📊 Reports' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading && <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && !loading && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3">Today's Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                ['Today Orders',       stats.todayOrders,       'bg-blue-50 border-blue-200'],
                ['Pending Dispatch',   stats.pendingDispatch,   'bg-yellow-50 border-yellow-200'],
                ['Delivered Today',    stats.delivered,         'bg-green-50 border-green-200'],
                ['Today Revenue',     `₹${(stats.todayRevenue||0).toLocaleString('en-IN')}`, 'bg-purple-50 border-purple-200'],
                ['Price Revisions',    stats.pendingRevisions,  'bg-orange-50 border-orange-200'],
                ['Active Sellers',     stats.activeSellers,     'bg-gray-50 border-gray-200'],
                ['Pending Categories', stats.pendingCategories, 'bg-red-50 border-red-200'],
              ].map(([label, val, cls]) => (
                <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
                  <p className="text-2xl font-black text-gray-800">{val}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab('orders')} className="bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 transition">View Orders →</button>
              <button onClick={() => setTab('sellers')} className="border-2 border-green-600 text-green-700 font-bold py-3 rounded-xl text-sm hover:bg-green-50 transition">Manage Sellers →</button>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && !loading && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-3 mb-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <input value={searchOrder} onChange={e => setSearchOrder(e.target.value)} placeholder="Search Order ID..."
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-green-400" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={orderSaFilter} onChange={e => setOrderSaFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none">
                  <option value="">All Seller Admins</option>
                  {saAdminList.map(sa => <option key={sa._id} value={sa._id}>{sa.businessName || sa.name}</option>)}
                </select>
                <input type="date" value={orderDeliveryDate} onChange={e => setOrderDeliveryDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" title="Delivery Date" />
                <select value={orderDeliverySlot} onChange={e => setOrderDeliverySlot(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="">All Slots</option>
                  {['Morning (6AM-9AM)','Afternoon (12PM-3PM)','Evening (4PM-7PM)'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={() => loadTab('orders')} className="w-full bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Search / Apply Filters</button>
            </div>

            <div className="space-y-3">
              {orders.map(order => {
                const isExp = expandedOrderId === order._id;
                return (
                  <div key={order._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                          <p className="text-xs text-gray-500">{order.buyer?.name} · {order.buyer?.phone}</p>
                          {order.deliveryDate && (
                            <p className="text-xs text-blue-600">📅 {new Date(order.deliveryDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {order.deliverySlot}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {order.orderStatus?.replace(/_/g,' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-xs text-gray-500">
                            {order.calculatedPricing?.finalPayableAmount != null
                              ? `₹${order.calculatedPricing.finalPayableAmount.toFixed(2)}`
                              : `₹${order.pricing?.total?.toFixed(2)}`
                            } · {order.items?.length} items
                          </p>
                          {(order.calculatedPricing?.declinedRefundAmount || 0) > 0 && (
                            <p className="text-[10px] text-red-500">Refund: ₹{order.calculatedPricing.declinedRefundAmount.toFixed(2)}</p>
                          )}
                          {order.reviewSummary?.declinedItems?.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {order.reviewSummary.declinedItems.map((di, i) => (
                                <p key={i} className="text-[10px] text-red-600">
                                  ⛔ {di.name}: {di.declinedQty} {di.unit || ''} declined
                                  {di.reason ? ` (${di.reason})` : ''} · ₹{(di.refundAmount || 0).toFixed(0)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button onClick={() => setExpandedOrderId(isExp ? null : order._id)}
                            className="text-xs text-green-700 font-bold border border-green-200 px-2 py-1 rounded-lg">
                            {isExp ? 'Hide' : 'Items ▾'}
                          </button>
                          <button onClick={() => { setCostsModal(order); setCostsForm({ actualDeliveryCost: order.adminCosts?.actualDeliveryCost || '', miscExpenses: order.adminCosts?.miscExpenses || '', costNote: order.adminCosts?.costNote || '' }); }}
                            className="text-xs text-orange-700 font-bold border border-orange-200 px-2 py-1 rounded-lg">
                            💰 Costs
                          </button>
                          {isSuperAdmin && order.paymentMethod === 'razorpay' && order.paymentStatus === 'paid' && (
                            <button onClick={() => { setRefundModal(order); setRefundAmt(''); setRefundReason(''); }}
                              className="text-xs text-purple-700 font-bold border border-purple-200 px-2 py-1 rounded-lg">
                              💳 Refund
                            </button>
                          )}
                          {isSuperAdmin && !['cancelled','delivered'].includes(order.orderStatus) && (
                            <button onClick={() => { setCancelOrderModal(order); setCancelReason(''); }}
                              className="text-xs text-red-600 font-bold border border-red-200 px-2 py-1 rounded-lg">
                              ✕ Cancel
                            </button>
                          )}
                          <button onClick={() => { setUpdateModal(order); setNewStatus(order.orderStatus); setDelivPartner(order.deliveryPartner || ''); setAdminNotes(order.adminNotes || ''); }}
                            className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700">
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExp && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {/* Partial refund history */}
                        {order.partialRefunds?.length > 0 && (
                          <div className="px-4 py-2 bg-purple-50">
                            <p className="text-[10px] font-bold text-purple-700 uppercase mb-1">Partial Refunds</p>
                            {order.partialRefunds.map((r, ri) => (
                              <div key={ri} className="flex justify-between text-xs text-purple-700 py-0.5">
                                <span>₹{r.amount} {r.reason ? `— ${r.reason}` : ''}</span>
                                <span className="text-purple-400">{new Date(r.initiatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {r.razorpayRefundId ? r.razorpayRefundId.slice(-8) : r.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {order.items?.map((item, idx) => {
                          const price = item.finalPrice || item.orderedPrice || 0;
                          return (
                            <div key={idx} className={`px-4 py-2.5 flex items-center gap-2 ${item.status === 'declined' ? 'opacity-50' : ''}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                                <p className="text-xs text-gray-400">{item.quantity}{item.unit} × ₹{price}</p>
                                {item.status === 'declined' && <span className="text-[10px] text-red-500 font-bold">Declined</span>}
                              </div>
                              <p className="text-sm font-bold text-green-700 shrink-0">₹{(price * item.quantity).toFixed(0)}</p>
                              {item.status !== 'declined' && (
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => { setEditQtyModal({ orderId: order._id, itemIdx: idx, currentQty: item.quantity, itemName: item.name, unit: item.unit }); setNewQty(item.quantity); }}
                                    className="text-[10px] font-bold text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">
                                    Edit Qty
                                  </button>
                                  <button onClick={() => setDecliningItem({ orderId: order._id, itemIdx: idx, itemName: item.name, amount: price * item.quantity })}
                                    className="text-[10px] font-bold text-red-600 border border-red-200 px-2 py-1 rounded-lg">
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {orders.length === 0 && <p className="text-center text-gray-500 py-8">No orders found</p>}
            </div>
          </div>
        )}

        {/* ── PENDING APPROVAL (sa_review_submitted) ── */}
        {tab === 'pending-approval' && !loading && (
          <div>
            <p className="text-sm font-bold text-gray-600 mb-3">
              {pendingApprovalOrders.length} order{pendingApprovalOrders.length !== 1 ? 's' : ''} awaiting Super Admin approval
            </p>
            {pendingApprovalOrders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-3">✅</p>
                <p className="font-bold">All clear — no pending reviews</p>
              </div>
            )}
            <div className="space-y-3">
              {pendingApprovalOrders.map(order => {
                const calc = order.calculatedPricing || {};
                const saReview = order.saReview || {};
                const itemsDeclined = (order.items || []).filter(it => it.itemStatus === 'declined' || it.itemStatus === 'partial');
                return (
                  <div key={order._id} className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                          <p className="text-xs text-gray-500">{order.buyer?.name}</p>
                          {order.deliveryDate && (
                            <p className="text-xs text-blue-600">📅 {new Date(order.deliveryDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · {order.deliverySlot}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Awaiting Approval
                        </span>
                      </div>

                      {/* Declined items summary */}
                      {itemsDeclined.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Declined / Reduced Items</p>
                          {itemsDeclined.map((it, i) => {
                            const decQty = it.declinedQty || (it.orderedQty || it.quantity || 0);
                            const price  = it.orderedPrice || it.finalPrice || 0;
                            return (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-red-600">
                                  {it.name} — {it.itemStatus === 'partial' ? `reduced to ${it.confirmedQty}${it.unit}` : `${decQty}${it.unit} declined`}
                                </span>
                                <span className="text-red-600 font-semibold">−₹{(price * decQty).toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Pricing summary */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                        {calc.originalOrderValue > 0 && (
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Original Order Value</span><span>₹{calc.originalOrderValue?.toFixed(2)}</span></div>
                        )}
                        {calc.declinedRefundAmount > 0 && (
                          <div className="flex justify-between text-xs"><span className="text-red-500">Declined Refund (−)</span><span className="text-red-600 font-semibold">₹{calc.declinedRefundAmount?.toFixed(2)}</span></div>
                        )}
                        {calc.deliveryCharge > 0 && (
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Delivery Charge</span><span>₹{calc.deliveryCharge?.toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                          <span className="font-bold text-gray-700">Final Payable</span>
                          <span className="font-bold text-green-700">₹{calc.finalPayableAmount?.toFixed(2)}</span>
                        </div>
                        {saReview.refundMethod && saReview.refundMethod !== 'none' && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Refund Method</span>
                            <span className="font-semibold uppercase text-purple-700">{saReview.refundMethod}</span>
                          </div>
                        )}
                      </div>

                      {saReview.notes && (
                        <p className="text-xs text-gray-500 mb-3 italic">SA Note: {saReview.notes}</p>
                      )}

                      {/* Action buttons — Super Admin only */}
                      {isSuperAdmin ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setApproveModal(order); setApproveAction('approve'); setApproveNotes(''); }}
                            className="flex-1 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition">
                            ✅ Approve Review
                          </button>
                          <button
                            onClick={() => { setApproveModal(order); setApproveAction('reject'); setApproveNotes(''); }}
                            className="flex-1 border-2 border-orange-400 text-orange-600 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition">
                            🔄 Send Back
                          </button>
                          <button
                            onClick={() => { setCancelOrderModal(order); setCancelReason(''); }}
                            className="px-3 border-2 border-red-300 text-red-600 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition">
                            ✕ Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-2">Super Admin approval required</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CANCELLED ORDERS ── */}
        {tab === 'cancelled-orders' && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-600 mb-3">{cancelledOrders.length} cancelled / partially declined orders</p>
            {cancelledOrders.map(order => {
              const declinedItems = order.items?.filter(it => it.status === 'declined') || [];
              const allCancelled  = order.orderStatus === 'cancelled';
              return (
                <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                      <p className="text-xs text-gray-500">{order.buyer?.name}</p>
                      <p className="text-xs text-gray-400">₹{order.pricing?.total?.toFixed(2)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allCancelled ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      {allCancelled ? 'Fully Cancelled' : `${declinedItems.length} Item(s) Declined`}
                    </span>
                  </div>
                  {/* Show declined items or all items if full cancel */}
                  <div className="space-y-1 text-xs text-gray-600">
                    {allCancelled
                      ? order.items?.map((it, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{it.name} × {it.quantity}{it.unit}</span>
                            <span>₹{((it.finalPrice || it.orderedPrice || 0) * it.quantity).toFixed(0)}</span>
                          </div>
                        ))
                      : declinedItems.map((it, i) => (
                          <div key={i} className="flex justify-between text-red-600">
                            <span>✕ {it.name} × {it.quantity}{it.unit}</span>
                            <span>₹{((it.finalPrice || it.orderedPrice || 0) * it.quantity).toFixed(0)} (refunded)</span>
                          </div>
                        ))
                    }
                  </div>
                  {order.cancelReason && <p className="text-xs text-gray-400 mt-2">Reason: {order.cancelReason}</p>}
                </div>
              );
            })}
            {cancelledOrders.length === 0 && <p className="text-center text-gray-500 py-8">No cancelled orders</p>}
          </div>
        )}

        {/* ── DAILY PRICE (Admin) ── */}
        {tab === 'daily-price' && !loading && (
          <div>
            <div className="bg-white rounded-2xl p-3 mb-4 space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <select value={dpSaFilter} onChange={e => setDpSaFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none">
                  <option value="">All Seller Admins</option>
                  {saAdminList.map(sa => <option key={sa._id} value={sa._id}>{sa.businessName || sa.name}</option>)}
                </select>
                <button onClick={() => loadTab('daily-price')} className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Load</button>
              </div>
              <div className="flex gap-2">
                <button onClick={saveDpBulk} disabled={dpBulkSaving || !Object.keys(dpEdits).length}
                  className="flex-1 bg-green-600 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-40">
                  {dpBulkSaving ? 'Saving…' : `Save All (${Object.keys(dpEdits).length})`}
                </button>
                <button onClick={exportDpCsv}
                  className="flex-1 border border-green-600 text-green-700 font-bold py-2 rounded-xl text-sm">
                  📥 Export CSV
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {dpProducts.map(p => {
                const e = getDpEdit(p);
                const { finalPrice } = dpCalc(e.basePrice, e.platformFeePercent, e.logisticsPercent, e.sellerMarginPercent);
                const isDirty = !!dpEdits[p._id];
                return (
                  <div key={p._id} className={`bg-white rounded-2xl border p-4 ${isDirty ? 'border-green-400' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.seller?.businessName || p.seller?.name}</p>
                      </div>
                      <p className="text-xs font-bold text-green-700">Final: ₹{finalPrice}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] text-gray-500">Base Price (₹)</label>
                        <input type="number" min="0" step="0.5" value={e.basePrice}
                          onChange={ev => setDpEdit(p._id, 'basePrice', ev.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 mt-0.5" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500">Seller Margin %</label>
                        <input type="number" min="0" max="100" value={e.sellerMarginPercent}
                          onChange={ev => setDpEdit(p._id, 'sellerMarginPercent', ev.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 mt-0.5" />
                      </div>
                    </div>
                    {isDirty && (
                      <button onClick={() => saveDpOne(p)} disabled={dpSaving[p._id]}
                        className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded-xl disabled:opacity-50">
                        {dpSaving[p._id] ? 'Saving…' : 'Save this product'}
                      </button>
                    )}
                  </div>
                );
              })}
              {dpProducts.length === 0 && <p className="text-center text-gray-500 py-8">Select a seller admin and click Load</p>}
            </div>
          </div>
        )}

        {/* ── REFUND REQUESTS ── */}
        {tab === 'refund-requests' && !loading && (
          <div>
            <div className="flex gap-2 mb-4">
              {['pending','confirmed','refunded','cancelled'].map(s => (
                <button key={s} onClick={() => { setRefundStatusFilter(s); setTimeout(() => loadTab('refund-requests'), 0); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition capitalize ${refundStatusFilter === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {refundRequests.map((rr, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">₹{rr.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500">{rr.userId?.name} · {rr.userId?.email}</p>
                      <p className="text-xs text-gray-400">Requested {new Date(rr.requestedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      rr.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      rr.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      rr.status === 'refunded' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>{rr.status}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-3 space-y-0.5">
                    <p>Account: {rr.bankAccountName} — {rr.bankAccountNumber}</p>
                    <p>IFSC: {rr.bankIfsc}{rr.bankName ? ` · ${rr.bankName}` : ''}</p>
                  </div>
                  {rr.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleRefundAction(rr.walletId, rr._id, 'confirm')}
                        disabled={refundUpdating === rr._id}
                        className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl disabled:opacity-50">
                        Confirm
                      </button>
                      <button onClick={() => handleRefundAction(rr.walletId, rr._id, 'cancel')}
                        disabled={refundUpdating === rr._id}
                        className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-xl disabled:opacity-50">
                        Cancel
                      </button>
                    </div>
                  )}
                  {rr.status === 'confirmed' && (
                    <button onClick={() => handleRefundAction(rr.walletId, rr._id, 'mark_refunded')}
                      disabled={refundUpdating === rr._id}
                      className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded-xl disabled:opacity-50">
                      Mark as Refunded
                    </button>
                  )}
                </div>
              ))}
              {refundRequests.length === 0 && <p className="text-center text-gray-500 py-8">No {refundStatusFilter} refund requests</p>}
            </div>
          </div>
        )}

        {/* ── SELLERS ── */}
        {tab === 'sellers' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['pending_review','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended']].map(([v,label]) => (
                  <button key={v} onClick={() => { setSellerFilter(v); setTimeout(() => loadTab('sellers'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${sellerFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {isSuperAdmin && (
                <button onClick={openCreateSeller}
                  className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                  + Create Seller
                </button>
              )}
            </div>
            <div className="space-y-3">
              {sellers.map(s => (
                <div key={s._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{s.businessName}</p>
                      <p className="text-xs text-gray-500">{s.ownerName} · {s.contact?.phone}</p>
                      <p className="text-xs text-gray-400">Stall {s.stallNumber} · {s.marketSection}</p>
                      {s.user && <p className="text-xs text-gray-400">{s.user.email}</p>}
                      {s.createdBySellerAdmin && (
                        <p className="text-xs text-blue-500">Created by SA: {s.createdBySellerAdmin.name}</p>
                      )}
                      {s.pendingEdit?.submittedAt && (
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">📝 Edit Pending Review</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SELLER_STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {(s.status || 'unknown').replace(/_/g,' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {s.status === 'pending_review' && (
                      <>
                        <button onClick={() => sellerAction(s._id, 'approve')} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                        <button onClick={() => { setRejectModal({ id: s._id, type: 'seller' }); setRejectReason(''); }}
                          className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕ Reject</button>
                      </>
                    )}
                    {s.status === 'approved' && (
                      <>
                        <button onClick={() => sellerAction(s._id, 'suspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50">Suspend</button>
                        <button onClick={() => openAddProduct(s)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700">+ Add Product</button>
                      </>
                    )}
                    {s.status === 'suspended' && (
                      <button onClick={() => sellerAction(s._id, 'unsuspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Unsuspend</button>
                    )}
                    {s.status === 'rejected' && (
                      <button onClick={() => sellerAction(s._id, 'approve')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Re-approve</button>
                    )}
                    <button onClick={() => toggleSeller(s._id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${s.isActive ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => openEditSeller(s)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-300 text-blue-600 hover:bg-blue-50">
                          ✏️ Edit
                        </button>
                        {s.pendingEdit?.submittedAt && (
                          <button onClick={() => setReviewEditSeller(s)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600">
                            📝 Review Edit
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {sellers.length === 0 && <p className="text-center text-gray-500 py-8">No sellers found</p>}
            </div>
          </div>
        )}

        {/* ── SELLER ADMINS ── */}
        {tab === 'seller-admins' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['pending_review','Pending'],['approved','Approved'],['rejected','Rejected'],['suspended','Suspended']].map(([v,label]) => (
                  <button key={v} onClick={() => { setSaFilter(v); setTimeout(() => loadTab('seller-admins'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${saFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSaCreate(true)}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                + Create SA
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-blue-700 leading-relaxed">
              🔒 SellerAdmins can create sellers and update product prices/stock. They cannot approve sellers and cannot see buyer info.
              {!isSuperAdmin && <span className="block mt-1 text-orange-600 font-semibold">⚠️ Approving SellerAdmins requires SuperAdmin access.</span>}
            </div>

            <div className="space-y-3">
              {sellerAdmins.map(sa => (
                <div key={sa._id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800">{sa.name}</p>
                      {sa.businessName && <p className="text-xs text-gray-500">{sa.businessName}</p>}
                      <p className="text-xs text-gray-400">{sa.user?.email} · {sa.contactPhone}</p>
                      {sa.createdBy && <p className="text-xs text-gray-400">Created by: {sa.createdBy.name}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SELLER_STATUS_COLOR[sa.status] || 'bg-gray-100 text-gray-600'}`}>
                      {(sa.status || 'unknown').replace(/_/g,' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {isSuperAdmin ? (
                      <>
                        {sa.status === 'pending_review' && (
                          <>
                            <button onClick={() => saAction(sa._id, 'approve')} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✓ Approve</button>
                            <button onClick={() => { setRejectModal({ id: sa._id, type: 'sa' }); setRejectReason(''); }}
                              className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl">✕ Reject</button>
                          </>
                        )}
                        {sa.status === 'approved' && (
                          <button onClick={() => saAction(sa._id, 'suspend')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50">Suspend</button>
                        )}
                        {(sa.status === 'suspended' || sa.status === 'rejected') && (
                          <button onClick={() => saAction(sa._id, 'approve')} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-green-300 text-green-600 hover:bg-green-50">Re-approve</button>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Approval requires SuperAdmin</span>
                    )}
                  </div>
                </div>
              ))}
              {sellerAdmins.length === 0 && <p className="text-center text-gray-500 py-8">No SellerAdmins found</p>}
            </div>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === 'categories' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2 flex-wrap">
                {[['','All'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']].map(([v,label]) => (
                  <button key={v} onClick={() => { setCatFilter(v); setTimeout(() => loadTab('categories'), 0); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${catFilter === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={openCatCreate}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-green-700 flex-shrink-0">
                + Add Category
              </button>
            </div>
            <div className="space-y-2">
              {cats.map(cat => (
                <div key={cat._id} className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${!cat.isActive ? 'opacity-50' : 'border-gray-200'}`}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    : <span className="text-2xl w-9 text-center flex-shrink-0">{cat.icon || '🌿'}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        cat.status === 'approved' ? 'bg-green-100 text-green-700'
                        : cat.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'}`}>
                        {cat.status}
                      </span>
                      {!cat.isActive && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">hidden</span>}
                    </div>
                    {cat.nameTamil && <p className="text-[10px] text-gray-400">{cat.nameTamil}</p>}
                    {cat.sortOrder > 0 && <p className="text-[10px] text-gray-400">Order: {cat.sortOrder}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {cat.status === 'pending' && (
                      <>
                        <button onClick={() => approveCategory(cat._id, true)} className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">✓</button>
                        <button onClick={() => approveCategory(cat._id, false)} className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">✕</button>
                      </>
                    )}
                    <button onClick={() => openCatEdit(cat)}
                      className="border border-blue-200 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-blue-50">
                      Edit
                    </button>
                    <button onClick={() => toggleCatActive(cat)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${cat.isActive ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {cat.isActive ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
              {cats.length === 0 && <p className="text-center text-gray-500 py-8">No categories found</p>}
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && !loading && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                placeholder="Search product name…"
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-green-400" />
              <select value={prodAvail} onChange={e => setProdAvail(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <button onClick={() => loadTab('products')}
                className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
                Search
              </button>
            </div>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p._id} className={`bg-white rounded-2xl border p-3 ${!p.isAvailable ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    {p.images?.[0]?.url && (
                      <img src={p.images[0].url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm leading-tight">{p.name}</p>
                          {p.nameTamil && <p className="text-[11px] text-gray-400">{p.nameTamil}</p>}
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {p.category?.icon} {p.category?.name} · {p.seller?.businessName}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.isAvailable ? 'Available' : 'Off'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                        <span className="font-black text-gray-800">₹{p.currentPrice}</span>
                        <span>/{p.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <button onClick={() => openEditProduct(p)}
                      className="flex-1 border border-blue-200 text-blue-600 text-xs font-bold py-1.5 rounded-xl hover:bg-blue-50">
                      ✏️ Edit
                    </button>
                    <button onClick={() => toggleProduct(p._id)}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-xl border ${p.isAvailable ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {p.isAvailable ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteProduct(p)}
                      className="border border-red-200 text-red-500 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-red-50">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-center text-gray-500 py-8">No products found</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Product modal ── */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Edit Product</h3>
                  <p className="text-xs text-gray-500">{editProduct.seller?.businessName}</p>
                </div>
                <button onClick={() => setEditProduct(null)} className="text-gray-400 text-xl font-bold">✕</button>
              </div>

              <KoyambeduVariantProductForm
                form={editProdForm}
                onChange={setEditProdForm}
                categories={kbdCategories.length ? kbdCategories : [editProduct.category].filter(Boolean)}
              />

              <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                <button onClick={() => setEditProduct(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={saveEditProduct} disabled={editProdSaving}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {editProdSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Order update modal ── */}
      {/* Edit Qty Modal */}
      {editQtyModal && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-800">Edit Quantity — {editQtyModal.itemName}</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">New Quantity ({editQtyModal.unit})</label>
              <input type="number" min="1" value={newQty} onChange={e => setNewQty(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditQtyModal(null)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleEditQty} disabled={qtyUpdating}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {qtyUpdating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Item Confirm Modal */}
      {decliningItem && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-800">Decline Item?</h3>
            <p className="text-sm text-gray-600">
              Declining <strong>{decliningItem.itemName}</strong> will credit <strong>₹{decliningItem.amount?.toFixed(0)}</strong> to the customer's wallet.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDecliningItem(null)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDeclineItem} disabled={decliningItem.loading}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {decliningItem.loading ? 'Processing…' : 'Decline & Credit Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {updateModal && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Update Order {updateModal.orderId}</h3>
            <div>
              <label className="text-xs text-gray-500 font-medium">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Delivery Partner</label>
              <input value={delivPartner} onChange={e => setDelivPartner(e.target.value)} placeholder="e.g. Swiggy Genie, own delivery"
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Admin Notes</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUpdateModal(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={updateOrderStatus} disabled={updating}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {updating ? 'Saving...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Create/Edit modal ── */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{catFormEdit ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            {[
              ['name',        'Category Name *', 'text',   'e.g. Vegetables'],
              ['nameTamil',   'Tamil Name',      'text',   'தமிழ் பெயர்'],
              ['icon',        'Emoji Icon',      'text',   '🥦'],
              ['description', 'Description',     'text',   'Short description'],
              ['sortOrder',   'Sort Order',      'number', '0 = first'],
            ].map(([field, label, type, ph]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                <input type={type} value={catForm[field]}
                  onChange={e => setCatForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            {/* Category image upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category Image</label>
              {catForm.image ? (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200">
                  <img src={catForm.image} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCatForm(f => ({ ...f, image: '' }))}
                    className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border-2 border-dashed border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold hover:bg-green-50 cursor-pointer w-full justify-center">
                  {catImgUploading
                    ? <><span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Uploading…</>
                    : <><span className="text-lg">🖼️</span> Upload Image</>}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => uploadCatImage(e.target.files?.[0])} disabled={catImgUploading} />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCatForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={saveCat} disabled={catSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {catSaving ? 'Saving…' : catFormEdit ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Seller modal (SuperAdmin only) ── */}
      {showCreateSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Create Seller (Pre-Approved)</h3>
              <button onClick={() => setShowCreateSeller(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700">
              ✅ Seller will be created with <strong>Approved</strong> status — no review needed.
            </div>
            {[
              ['ownerName',     'Owner Name *',       'text', 'e.g. Rajan Kumar'],
              ['businessName',  'Business Name *',    'text', 'e.g. Rajan Vegetables'],
              ['contactPhone',  'Contact Phone *',    'tel',  '10-digit mobile'],
              ['stallNumber',   'Stall Number',       'text', 'e.g. A-12'],
              ['marketSection', 'Market Section',     'text', 'e.g. Vegetables, Flowers'],
              ['contactEmail',  'Email (optional)',   'email',''],
              ['commissionRate','Commission Rate (%)', 'number','e.g. 10'],
              ['description',   'Description',        'text', 'Short note about seller'],
            ].map(([field, label, type, ph]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={createSellerForm[field]}
                  onChange={e => setCreateSellerForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assign to Seller Admin (optional)</label>
              <select
                value={createSellerForm.assignedSellerAdminId}
                onChange={e => setCreateSellerForm(f => ({ ...f, assignedSellerAdminId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">— None —</option>
                {approvedSaList.map(sa => (
                  <option key={sa._id} value={sa._id}>{sa.name} ({sa.businessName || sa.user?.email || 'SA'})</option>
                ))}
              </select>
              {approvedSaList.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No approved seller admins found.</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreateSeller(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitCreateSeller} disabled={createSellerSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-green-700 disabled:opacity-50">
                {createSellerSaving ? 'Creating…' : '✓ Create Seller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create SellerAdmin modal ── */}
      {showSaCreate && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800">Create Seller Admin</h3>
            <p className="text-xs text-gray-500">Seller Admins can create and manage sellers but cannot approve them.</p>

            {/* User search */}
            <div>
              <label className="text-xs text-gray-500 font-medium">Search Eptomart User * (email, phone or name)</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={userQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="Type email, phone or name..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                {userSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {/* Dropdown results */}
              {userResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {userResults.map(u => (
                    <button key={u._id} onClick={() => selectUser(u)}
                      className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-100 last:border-0 transition">
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email || '—'} · {u.phone || '—'}</p>
                    </button>
                  ))}
                </div>
              )}
              {/* Selected user badge */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-green-500 text-lg">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800 truncate">{selectedUser.name}</p>
                    <p className="text-xs text-green-600 truncate">{selectedUser.email || selectedUser.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setUserQuery(''); setSaForm(f => ({ ...f, userId: '' })); }}
                    className="text-gray-400 hover:text-red-500 text-sm font-bold flex-shrink-0">✕</button>
                </div>
              )}
            </div>

            {/* Rest of form fields */}
            {[
              ['name',         'Full Name *',     'text'],
              ['businessName', 'Business Name',   'text'],
              ['contactPhone', 'Phone',           'tel'],
              ['contactEmail', 'Email',           'email'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={saForm[k]} onChange={e => setSaForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowSaCreate(false); setUserQuery(''); setUserResults([]); setSelectedUser(null); }}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={createSellerAdmin} disabled={saCreating || !saForm.userId || !saForm.name}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {saCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Seller modal (SuperAdmin only) ── */}
      {editSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Edit Seller</h3>
                <p className="text-xs text-gray-500">{editSeller.businessName}</p>
              </div>
              <button onClick={() => setEditSeller(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            {[
              ['ownerName',    'Owner Name',     'text'],
              ['businessName', 'Business Name',  'text'],
              ['stallNumber',  'Stall Number',   'text'],
              ['marketSection','Market Section', 'text'],
              ['description',  'Description',    'text'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={editForm[k]}
                  onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}

            {/* Contact fields — highlighted */}
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 space-y-2">
              <p className="text-xs font-bold text-blue-700">📞 Contact Details</p>
              <div>
                <label className="text-xs text-gray-500 font-medium">Phone</label>
                <input type="tel" value={editForm.contactPhone}
                  onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Email</label>
                <input type="email" value={editForm.contactEmail}
                  onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* Sync to Eptomart account toggle — only shown if seller has a linked account */}
            {editSeller.user && (
              <label className="flex items-start gap-2 cursor-pointer p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <input type="checkbox" checked={editForm.syncToAccount}
                  onChange={e => setEditForm(f => ({ ...f, syncToAccount: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">Also update linked Eptomart account</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Syncs phone &amp; email to the seller's login account ({editSeller.user?.email || editSeller.user?.phone || 'linked account'}) so they can log in with the new details.
                  </p>
                </div>
              </label>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditSeller(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={saveEditSeller} disabled={editSaving}
                className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Product modal (admin) ── */}
      {showAddProduct && addProdSeller && (
        <div className="fixed inset-0 bg-black/50 z-[9995] overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Add Product</h3>
                  <p className="text-xs text-gray-500">For: {addProdSeller.businessName} · {addProdSeller.ownerName}</p>
                </div>
                <button onClick={() => setShowAddProduct(false)} className="text-gray-400 text-xl">✕</button>
              </div>

              <KoyambeduVariantProductForm
                form={kbdProdForm}
                onChange={setKbdProdForm}
                categories={kbdCategories}
              />

              <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                <button onClick={() => setShowAddProduct(false)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
                <button onClick={submitAddProduct} disabled={addProdSaving}
                  className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                  {addProdSaving ? 'Adding…' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Review SA Edit modal (SuperAdmin only) ── */}
      {reviewEditSeller && reviewEditSeller.pendingEdit && (
        <div className="fixed inset-0 bg-black/50 z-[9996] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Review Proposed Edit</h3>
                <p className="text-xs text-gray-500">{reviewEditSeller.businessName} · submitted {new Date(reviewEditSeller.pendingEdit.submittedAt).toLocaleDateString('en-IN')}</p>
              </div>
              <button onClick={() => setReviewEditSeller(null)} className="text-gray-400 text-xl">✕</button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ Approving will immediately apply these changes to the live seller profile. Rejecting will discard them.
            </p>

            {/* Diff view */}
            <div className="space-y-2">
              {[
                ['Owner Name',     'ownerName'],
                ['Business Name',  'businessName'],
                ['Stall Number',   'stallNumber'],
                ['Market Section', 'marketSection'],
                ['Description',    'description'],
              ].map(([label, key]) => {
                const current  = reviewEditSeller[key] || '—';
                const proposed = reviewEditSeller.pendingEdit[key];
                if (proposed === undefined) return null;
                const changed = proposed !== current;
                return (
                  <div key={key} className={`rounded-xl px-3 py-2.5 border ${changed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {changed ? (
                        <>
                          <span className="text-xs text-red-500 line-through">{current}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs font-semibold text-green-700">{proposed || '—'}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">{current} <span className="text-gray-400">(no change)</span></span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contact fields */}
              {reviewEditSeller.pendingEdit.contact && [
                ['Phone',     'contact.phone',    'phone'],
                ['Email',     'contact.email',    'email'],
                ['Alt Phone', 'contact.altPhone', 'altPhone'],
              ].map(([label, _, key]) => {
                const current  = reviewEditSeller.contact?.[key] || '—';
                const proposed = reviewEditSeller.pendingEdit.contact?.[key];
                if (proposed === undefined) return null;
                const changed = proposed !== current;
                return (
                  <div key={key} className={`rounded-xl px-3 py-2.5 border ${changed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{label} (contact)</p>
                    <div className="flex items-center gap-2 mt-1">
                      {changed ? (
                        <>
                          <span className="text-xs text-red-500 line-through">{current}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xs font-semibold text-blue-700">{proposed || '—'}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">{current} <span className="text-gray-400">(no change)</span></span>
                      )}
                    </div>
                  </div>
                );
              })}

              {reviewEditSeller.user && reviewEditSeller.pendingEdit.contact && (
                reviewEditSeller.pendingEdit.contact.phone || reviewEditSeller.pendingEdit.contact.email
              ) && (
                <p className="text-[10px] text-blue-500 px-1">
                  ℹ️ Phone/email changes will also sync to the seller's Eptomart login account.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setReviewEditSeller(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => reviewSellerEdit(false)} disabled={reviewEditSaving}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600 disabled:opacity-60">
                {reviewEditSaving ? '...' : '✕ Reject'}
              </button>
              <button onClick={() => reviewSellerEdit(true)} disabled={reviewEditSaving}
                className="flex-1 bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {reviewEditSaving ? '...' : '✓ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DANGER ZONE TAB ── */}
      {tab === 'danger' && <DangerZone />}

      {/* ══════════════════════════════════════════════
          📊 REPORTS TAB
      ══════════════════════════════════════════════ */}
      {tab === 'reports' && (
        <div className="space-y-4 pb-6">
          {/* Report type selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Report Type</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                ['order-report',           '📋 Order Report',            'Delivery date wise — orders grouped by Seller Admin'],
                ['product-consolidation',  '📦 Product Consolidation',   'Products & quantities to procure for a date + slot'],
                ['cashflow',               '💰 Cash Flow Report',        'Revenue, procurement, commissions, delivery expenses'],
              ].map(([val, label, desc]) => (
                <button key={val} onClick={() => { setRptType(val); setRptData(null); }}
                  className={`text-left p-3 rounded-xl border-2 transition ${rptType === val ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <p className={`font-bold text-sm ${rptType === val ? 'text-green-700' : 'text-gray-700'}`}>{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Filters</p>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Delivery Date *</label>
              <input type="date" value={rptDate} onChange={e => setRptDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Delivery Slot {rptType === 'product-consolidation' ? '*' : '(optional)'}
              </label>
              <select value={rptSlot} onChange={e => setRptSlot(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                <option value="">All slots</option>
                {DELIVERY_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Seller Admin (optional)</label>
              <select value={rptSa} onChange={e => setRptSa(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                <option value="">All Seller Admins</option>
                {saAdminList.map(sa => <option key={sa._id} value={sa._id}>{sa.businessName || sa.name}</option>)}
              </select>
            </div>
            <button onClick={fetchReport} disabled={rptLoading}
              className="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 transition active:scale-95">
              {rptLoading ? 'Generating…' : '▶ Generate Report'}
            </button>
          </div>

          {/* Results */}
          {rptData && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-green-700 text-sm">
                    {rptType === 'order-report' ? '📋 Order Report' : rptType === 'product-consolidation' ? '📦 Product Consolidation' : '💰 Cash Flow'}
                  </p>
                  <p className="text-xs text-gray-400">{rptDate}{rptSlot ? ' · ' + rptSlot : ''}</p>
                </div>
                <button onClick={shareReport}
                  className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition">
                  📤 Share / Print
                </button>
              </div>

              {/* ORDER REPORT */}
              {rptType === 'order-report' && (
                <div className="space-y-4">
                  {(rptData.report || []).map((group, gi) => (
                    <div key={gi}>
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
                        <span className="font-bold text-green-800 text-sm">📦 {group.sa?.businessName || group.sa?.name || 'Unknown SA'}</span>
                        <span className="text-xs text-green-600 ml-auto">{group.orders?.length} orders</span>
                      </div>
                      <div className="space-y-2">
                        {(group.orders || []).map((o, oi) => (
                          <div key={oi} className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-gray-800">{o.orderId}</p>
                                <p className="text-[10px] text-gray-500">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '-'} · {o.deliverySlot || '-'}</p>
                                <p className="text-[10px] text-gray-500">{o.shippingAddress?.addressLine1 || ''}, {o.shippingAddress?.city || ''} {o.shippingAddress?.pincode || ''}</p>
                              </div>
                              <p className="text-sm font-bold text-green-700">₹{o.saSubtotal?.toFixed(0)}</p>
                            </div>
                            {(o.items || []).map((it, ii) => (
                              <div key={ii} className="px-3 py-1.5 flex justify-between border-t border-gray-50 text-xs">
                                <span className="text-gray-700">{it.name} × {it.quantity}{it.unit}</span>
                                <span className="text-gray-500">₹{it.orderedPrice} → ₹{it.lineTotal?.toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!rptData.report || rptData.report.length === 0) && <p className="text-center text-gray-400 py-4">No orders found for the selected filters</p>}
                </div>
              )}

              {/* PRODUCT CONSOLIDATION */}
              {rptType === 'product-consolidation' && (
                <div>
                  <div className="flex gap-4 mb-3 text-sm">
                    <div className="bg-green-50 rounded-xl px-3 py-2 flex-1 text-center">
                      <p className="text-xs text-gray-500">SA</p>
                      <p className="font-bold text-green-700 text-xs truncate">{typeof rptData.sellerAdmin === 'string' ? rptData.sellerAdmin : (rptData.sellerAdmin?.businessName || rptData.sellerAdmin?.name || 'All')}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl px-3 py-2 flex-1 text-center">
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-bold text-blue-700">{rptData.orderCount}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl px-3 py-2 flex-1 text-center">
                      <p className="text-xs text-gray-500">Products</p>
                      <p className="font-bold text-purple-700">{rptData.products?.length}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(rptData.products || []).map((p, pi) => (
                      <div key={pi} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2.5">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.orderCount} orders · ₹{p.totalValue?.toFixed(0)} value</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-green-700">{p.totalQty.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{p.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CASH FLOW */}
              {rptType === 'cashflow' && (() => {
                const s = rptData.summary || {};
                return (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Amount Received',    `₹${s.totalReceived?.toFixed(0)}`,          '#f0fdf4','#16a34a'],
                        ['Procurement to SA',  `₹${s.totalProcurement?.toFixed(0)}`,        '#eff6ff','#2563eb'],
                        ['SA Commission',      `₹${s.totalSaCommission?.toFixed(0)}`,       '#faf5ff','#9333ea'],
                        ['Eptomart Comm.',     `₹${s.totalEptomartCommission?.toFixed(0)}`, '#fff7ed','#ea580c'],
                        ['Delivery Collected', `₹${s.totalDeliveryCollected?.toFixed(0)}`,  '#f0fdf4','#059669'],
                        ['Actual Delivery',    `₹${s.totalActualDelivery?.toFixed(0)}`,     '#fef2f2','#dc2626'],
                        ['Misc Expenses',      `₹${s.totalMiscExpenses?.toFixed(0)}`,       '#fef9c3','#ca8a04'],
                        ['Eptomart Net',       `₹${s.eptomartNetProfit?.toFixed(0)}`,       '#f0fdf4','#14532d'],
                      ].map(([label, value, bg, color]) => (
                        <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
                          <p className="text-[10px] text-gray-500">{label}</p>
                          <p className="font-black text-sm" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Per SA */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Per Seller Admin</p>
                      <div className="space-y-2">
                        {(rptData.saSummary || []).map((sa, si) => (
                          <div key={si} className="border border-gray-100 rounded-xl p-3">
                            <p className="font-bold text-green-700 text-sm mb-2">{sa.sa?.businessName || sa.sa?.name}</p>
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                              <div className="bg-blue-50 rounded-lg p-1.5"><p className="text-gray-500">Procurement</p><p className="font-bold text-blue-700">₹{sa.procurementCost?.toFixed(0)}</p></div>
                              <div className="bg-purple-50 rounded-lg p-1.5"><p className="text-gray-500">SA Comm.</p><p className="font-bold text-purple-700">₹{sa.saCommission?.toFixed(0)}</p></div>
                              <div className="bg-green-50 rounded-lg p-1.5"><p className="text-gray-500">Total to SA</p><p className="font-bold text-green-700">₹{sa.totalToSA?.toFixed(0)}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery expense per order */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Delivery Expense per Order</p>
                      <div className="space-y-1.5">
                        {(rptData.deliveryExpenses || []).map((d, di) => (
                          <div key={di} className="border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-700">{d.orderId}</p>
                              <p className="text-[10px] text-gray-400">{d.deliverySlot || 'No slot'}</p>
                            </div>
                            <div className="text-right text-[10px] space-y-0.5">
                              <p className="text-gray-500">Charged: <strong>₹{d.deliveryCharge?.toFixed(0)}</strong></p>
                              <p className="text-gray-500">Actual: <strong className="text-red-600">₹{d.actualDeliveryCost?.toFixed(0)}</strong></p>
                              <p className={`font-bold ${d.netDeliveryProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net: ₹{d.netDeliveryProfit?.toFixed(0)}</p>
                            </div>
                          </div>
                        ))}
                        {(!rptData.deliveryExpenses || rptData.deliveryExpenses.length === 0) && (
                          <p className="text-xs text-gray-400 text-center py-3">No delivery cost data. Enter costs from the Orders tab.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Admin Costs Modal ── */}
      {costsModal && (
        <div className="fixed inset-0 bg-black/50 z-[9997] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">💰 Internal Costs</h3>
                <p className="text-xs text-gray-400">{costsModal.orderId} — not shown to customer</p>
              </div>
              <button onClick={() => setCostsModal(null)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Actual Delivery Cost (₹)</label>
              <input type="number" min="0" value={costsForm.actualDeliveryCost}
                onChange={e => setCostsForm(f => ({ ...f, actualDeliveryCost: e.target.value }))}
                placeholder="e.g. 120"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              <p className="text-[10px] text-gray-400 mt-0.5">Delivery charged to customer: ₹{costsModal.pricing?.deliveryCharge || 0}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Misc / Packing Expenses (₹)</label>
              <input type="number" min="0" value={costsForm.miscExpenses}
                onChange={e => setCostsForm(f => ({ ...f, miscExpenses: e.target.value }))}
                placeholder="e.g. 30"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Note (optional)</label>
              <input type="text" value={costsForm.costNote}
                onChange={e => setCostsForm(f => ({ ...f, costNote: e.target.value }))}
                placeholder="e.g. Porter + packing bags"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCostsModal(null)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={saveCosts} disabled={costsSaving}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {costsSaving ? 'Saving…' : 'Save Costs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Partial Refund Modal ── */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">💳 Partial Refund to Source</h3>
                <p className="text-xs text-gray-400">{refundModal.orderId} · Paid via Razorpay · Total ₹{refundModal.pricing?.total?.toFixed(2)}</p>
              </div>
              <button onClick={() => setRefundModal(null)} className="text-gray-400 text-xl font-bold leading-none">✕</button>
            </div>

            {/* Already refunded summary */}
            {refundModal.partialRefunds?.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-purple-700">Previous partial refunds</p>
                {refundModal.partialRefunds.map((r, i) => (
                  <div key={i} className="flex justify-between text-purple-600">
                    <span>₹{r.amount} {r.reason ? `— ${r.reason}` : ''}</span>
                    <span>{new Date(r.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
                <div className="border-t border-purple-200 pt-1 flex justify-between font-bold text-purple-800">
                  <span>Total refunded so far</span>
                  <span>₹{(refundModal.partialRefunds.filter(r=>r.status==='initiated').reduce((s,r)=>s+r.amount,0)).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Refund Amount (₹) *</label>
              <input
                type="number" min="1" step="0.01"
                value={refundAmt}
                onChange={e => setRefundAmt(e.target.value)}
                placeholder="e.g. 250"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 font-bold text-gray-800"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Max refundable: ₹{Math.max(0, (refundModal.pricing?.total || 0) - (refundModal.partialRefunds?.filter(r=>r.status==='initiated').reduce((s,r)=>s+r.amount,0)||0)).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Reason <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="e.g. Item declined, Price revision adjustment"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 ${!refundReason.trim() ? 'border-red-300' : 'border-gray-200'}`}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ This will immediately initiate a refund to the customer's original payment source (card/UPI/net-banking) via Razorpay. This action cannot be reversed.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">
                Cancel
              </button>
              <button onClick={submitPartialRefund} disabled={refunding || !refundAmt}
                className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition active:scale-95">
                {refunding ? 'Processing…' : `Refund ₹${refundAmt || '–'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve / Reject Review Modal ── */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-[9997] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">
                  {approveAction === 'approve' ? '✅ Approve SA Review' : '🔄 Send Back for Revision'}
                </h3>
                <p className="text-xs text-gray-400">{approveModal.orderId}</p>
              </div>
              <button onClick={() => setApproveModal(null)} className="text-gray-400 text-xl font-bold leading-none">✕</button>
            </div>

            {/* Toggle approve / reject */}
            <div className="flex gap-2">
              <button onClick={() => setApproveAction('approve')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${approveAction === 'approve' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                ✅ Approve
              </button>
              <button onClick={() => setApproveAction('reject')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${approveAction === 'reject' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                🔄 Send Back
              </button>
            </div>

            {approveAction === 'approve' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 space-y-1">
                <p className="font-bold">On approval:</p>
                <p>• Order status → Confirmed</p>
                <p>• Declined item refund processed to customer wallet</p>
                <p>• Order Confirmation invoice generated</p>
                <p>• Customer notified via WhatsApp</p>
              </div>
            )}

            {approveAction === 'reject' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                <p>The Seller Admin will be asked to re-review and resubmit. No refund is processed at this stage.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {approveAction === 'reject' ? 'Reason for revision (required)' : 'Notes (optional)'}
              </label>
              <textarea
                value={approveNotes} onChange={e => setApproveNotes(e.target.value)} rows={3}
                placeholder={approveAction === 'reject' ? 'Tell SA what to fix…' : 'Any notes for the record…'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setApproveModal(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">
                Cancel
              </button>
              <button onClick={handleApproveReview} disabled={approving || (approveAction === 'reject' && !approveNotes.trim())}
                className={`flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition active:scale-95 ${approveAction === 'approve' ? 'bg-green-600' : 'bg-orange-500'}`}>
                {approving ? 'Processing…' : approveAction === 'approve' ? 'Approve & Confirm Order' : 'Send Back for Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delivery Alerts tab ── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {deliveryAlerts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">✅ No active delivery alerts</div>
          ) : deliveryAlerts.map(a => (
            <div key={a._id} className="bg-white rounded-2xl border-2 border-red-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-gray-800 text-sm">#{a.orderId}</p>
                  <p className="text-xs font-bold text-red-600 mt-0.5">
                    {a.deliveryAck?.alert?.type === 'not_received' ? '🚨 ORDER NOT RECEIVED' : '⚠️ Partial / damaged delivery'}
                  </p>
                  {a.buyer && <p className="text-[11px] text-gray-500 mt-0.5">{a.buyer.name} · {a.buyer.phone}</p>}
                  {a.deliveryAck?.issues?.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {a.deliveryAck.issues.map((i, k) => (
                        <p key={k} className="text-[11px] text-red-700">• {i.name}: {i.missingQty}{i.unit ? ` ${i.unit}` : ''} missing{i.note ? ` — ${i.note}` : ''}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Raised {a.deliveryAck?.alert?.raisedAt ? new Date(a.deliveryAck.alert.raisedAt).toLocaleString('en-IN') : ''} · Order total ₹{(a.pricing?.total || 0).toFixed(0)}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => resolveAlert(a)}
                    className="text-xs font-bold text-white px-3 py-2 rounded-xl active:scale-95 transition shrink-0"
                    style={{ background: 'linear-gradient(135deg,#b91c1c,#dc2626)' }}>
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cancel Order Modal (Super Admin only) ── */}
      {cancelOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-[9997] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-red-700">❌ Cancel Order</h3>
                <p className="text-xs text-gray-400">{cancelOrderModal.orderId}</p>
              </div>
              <button onClick={() => setCancelOrderModal(null)} className="text-gray-400 text-xl font-bold leading-none">✕</button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
              <p className="font-bold">Cancelling this order will:</p>
              <p>• Mark order as Cancelled</p>
              <p>• Process full refund to customer wallet (if paid online)</p>
              <p>• Notify customer via WhatsApp</p>
              <p>• This action is irreversible</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-red-600 mb-1 block">Cancellation Reason <span className="text-red-500">*</span></label>
              <textarea
                value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
                placeholder="e.g. Seller unavailable, market closed, supply issue…"
                className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none focus:border-red-400"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCancelOrderModal(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl">
                Keep Order
              </button>
              <button onClick={handleCancelOrder} disabled={cancelling || !cancelReason.trim()}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition active:scale-95">
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject reason modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-[9996] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Rejection Reason</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Enter reason for rejection..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => {
                if (rejectModal.type === 'seller') sellerAction(rejectModal.id, 'reject', rejectReason);
                else saAction(rejectModal.id, 'reject', rejectReason);
                setRejectModal(null);
              }} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
