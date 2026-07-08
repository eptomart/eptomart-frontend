// ============================================
// CART PAGE — Tab-based multi-vertical cart
// ============================================
// Each Eptomart vertical (Koyambedu Daily, Eptomart, future sub-apps)
// gets its own tab. Tabs are generated dynamically — a tab is visible
// only when the vertical has items. Every tab maintains independent
// calculations, delivery info, and its own Proceed to Checkout button.
//
// To add a new vertical:
//   1. Add an entry to VERTICAL_CONFIG below.
//   2. Add its item count to `itemCounts`.
//   3. Render its tab content inside the "Tab Content" section.
// ============================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiTrash2, FiShoppingBag, FiTruck, FiEdit2, FiInfo, FiCheckCircle,
  FiZap, FiPackage, FiLock, FiGrid, FiMinus, FiPlus,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import QuantityControl from '../components/cart/QuantityControl';
import VariantPickerModal from '../components/cart/VariantPickerModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useKoyambeduCart } from '../context/KoyambeduCartContext';
import { formatINR } from '../utils/currency';

// ── Eptomart (main cart) shipping thresholds ────────────
const FREE_SHIPPING_THRESHOLD = 999;
const LIGHT_SHIPPING = 49;
const HEAVY_SHIPPING = 149;

// ── Vertical configuration registry ─────────────────────
// displayOrder controls left-to-right tab ordering.
// Add new entries here when a sub-app integrates its cart.
const VERTICAL_CONFIG = {
  koyambedu: {
    id:                  'koyambedu',
    label:               'Koyambedu Daily',
    iconEl:              <FaLeaf size={13} />,
    accent:              '#065f46',
    accentLight:         '#dcfce7',
    accentText:          '#166534',
    headerGradient:      'linear-gradient(135deg,#064e3b,#065f46)',
    btnGradient:         'linear-gradient(135deg,#064e3b,#16a34a)',
    btnShadow:           '0 4px 16px rgba(22,163,74,0.35)',
    checkoutPath:        '/koyambedu/checkout',
    checkoutLabel:       'Proceed to Koyambedu Checkout →',
    continuePath:        '/koyambedu/shop',
    continueLabel:       'Add more items',
    displayOrder:        0,
  },
  eptomart: {
    id:                  'eptomart',
    label:               'Eptomart',
    iconEl:              <FiShoppingBag size={13} />,
    accent:              '#f4941c',
    accentLight:         '#fff8ee',
    accentText:          '#92400e',
    headerGradient:      'linear-gradient(135deg,#f4941c,#f97316)',
    btnGradient:         'linear-gradient(135deg,#f4941c,#f97316)',
    btnShadow:           '0 4px 16px rgba(244,148,28,0.35)',
    checkoutPath:        '/checkout',
    checkoutLabel:       'Proceed to Checkout →',
    continuePath:        '/shop',
    continueLabel:       'Continue Shopping',
    displayOrder:        1,
  },
  // ── Future verticals (uncomment when integrated) ───────
  // farmerFresh: {
  //   id: 'farmerFresh', label: 'Farmer Fresh', displayOrder: 2, ...
  // },
  // proteins: {
  //   id: 'proteins', label: 'Proteins', displayOrder: 3, ...
  // },
};

// ── Tab pill component ───────────────────────────────────
function TabPill({ vertical, isActive, itemCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                 transition-all duration-200 active:scale-[0.97] whitespace-nowrap"
      style={isActive ? {
        background:  vertical.headerGradient,
        color:       '#fff',
        boxShadow:   `0 3px 12px ${vertical.accent}50`,
      } : {
        background:  vertical.accentLight,
        color:       vertical.accentText,
        border:      `1.5px solid ${vertical.accent}30`,
      }}
    >
      <span style={{ color: isActive ? '#fff' : vertical.accent }}>
        {vertical.iconEl}
      </span>
      <span>{vertical.label}</span>
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5"
        style={isActive
          ? { background: 'rgba(255,255,255,0.22)', color: '#fff' }
          : { background: `${vertical.accent}18`, color: vertical.accent }}
      >
        {itemCount}
      </span>
    </button>
  );
}

// ── Main cart component ──────────────────────────────────
export default function Cart() {
  const {
    sellerGroups, cartCount, subtotalExGst, gstTotal, shipping, total,
    updateQuantity, removeFromCart, updateItemVariant,
    isCodBlocked, codBlockedItems,
  } = useCart();

  const {
    cart:       kbdCart,
    fetchCart:  kbdFetchCart,
    updateItem: kbdUpdateItem,
    loading:    kbdLoading,
    subtotal:   kbdSubtotal,
    itemCount:  kbdItemCount,
  } = useKoyambeduCart();

  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [updating,         setUpdating]         = useState({});
  const [variantPickerItem, setVariantPickerItem] = useState(null);
  const [activeTab,        setActiveTab]         = useState(null);

  useEffect(() => { kbdFetchCart(); }, []);

  // Map vertical id → item count
  const itemCounts = {
    koyambedu: kbdItemCount,
    eptomart:  cartCount,
  };

  // Tabs sorted by displayOrder, filtered to those with items
  const availableTabs = Object.values(VERTICAL_CONFIG)
    .filter(v => (itemCounts[v.id] || 0) > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Auto-select first valid tab when items change
  useEffect(() => {
    if (!activeTab || !(itemCounts[activeTab] > 0)) {
      const first = availableTabs[0]?.id;
      if (first) setActiveTab(first);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbdItemCount, cartCount]);

  const totalCount    = kbdItemCount + cartCount;
  const activeTabId   = (activeTab && itemCounts[activeTab] > 0) ? activeTab : availableTabs[0]?.id;
  const activeVertical = VERTICAL_CONFIG[activeTabId];

  // ── Eptomart-specific helpers ──────────────────────────
  const cartGrandExShipping = parseFloat((subtotalExGst + gstTotal).toFixed(2));

  const handleQtyChange = (cartItemId, newQty) => {
    setUpdating(p => ({ ...p, [cartItemId]: true }));
    updateQuantity(cartItemId, newQty);
    setTimeout(() => setUpdating(p => ({ ...p, [cartItemId]: false })), 300);
  };

  const handleVariantSelect = (variant, vLabel) => {
    if (!variantPickerItem) return;
    updateItemVariant(variantPickerItem.cartItemId, variant.price, vLabel, variant.stock);
    setVariantPickerItem(null);
  };

  // ── Empty state ────────────────────────────────────────
  if (totalCount === 0) {
    return (
      <>
        <Helmet><title>Cart — Eptomart</title></Helmet>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-5 animate-fade-in-up"
            style={{ background: 'linear-gradient(135deg,#fff8ee,#ffecd0)' }}
          >
            <FiShoppingBag size={52} style={{ color: '#f4941c' }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Looks like you haven't added anything yet.</p>
          <Link to="/shop" className="btn-primary">Start Shopping →</Link>
        </div>
        <Footer />
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      <Helmet><title>{`Cart (${totalCount}) — Eptomart`}</title></Helmet>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Page heading ─────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-1 h-8 rounded-full bg-primary-500" />
          <h1 className="text-2xl font-bold text-gray-800">
            My Cart{' '}
            <span className="text-primary-500">
              ({totalCount} item{totalCount !== 1 ? 's' : ''})
            </span>
          </h1>
        </div>

        {/* ── Tab bar ──────────────────────────────── */}
        {availableTabs.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {availableTabs.map(tab => (
              <TabPill
                key={tab.id}
                vertical={tab}
                isActive={activeTabId === tab.id}
                itemCount={itemCounts[tab.id]}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        )}

        {/* ── Tab content ──────────────────────────── */}

        {activeTabId === 'koyambedu' && (
          <KoyambeduTab
            kbdCart={kbdCart}
            kbdItemCount={kbdItemCount}
            kbdLoading={kbdLoading}
            kbdSubtotal={kbdSubtotal}
            kbdUpdateItem={kbdUpdateItem}
            navigate={navigate}
            vertical={VERTICAL_CONFIG.koyambedu}
          />
        )}

        {activeTabId === 'eptomart' && (
          <EptomartTab
            sellerGroups={sellerGroups}
            cartCount={cartCount}
            subtotalExGst={subtotalExGst}
            gstTotal={gstTotal}
            shipping={shipping}
            total={total}
            isCodBlocked={isCodBlocked}
            codBlockedItems={codBlockedItems}
            cartGrandExShipping={cartGrandExShipping}
            updating={updating}
            handleQtyChange={handleQtyChange}
            removeFromCart={removeFromCart}
            setVariantPickerItem={setVariantPickerItem}
            navigate={navigate}
            isLoggedIn={isLoggedIn}
            vertical={VERTICAL_CONFIG.eptomart}
          />
        )}

      </main>

      <Footer />

      {variantPickerItem && (
        <VariantPickerModal
          item={variantPickerItem}
          onSelect={handleVariantSelect}
          onClose={() => setVariantPickerItem(null)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════
// KOYAMBEDU DAILY TAB
// Delivery charges are distance-based → shown at checkout.
// ════════════════════════════════════════════════════════
function KoyambeduTab({
  kbdCart, kbdItemCount, kbdLoading, kbdSubtotal, kbdUpdateItem, navigate, vertical,
}) {
  // editQty maps itemKey → draft string while user is editing qty inline
  const [editQty, setEditQty] = useState({});

  const commitQty = (pid, itemKey, rawVal, item) => {
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val >= 0) {
      kbdUpdateItem(pid, val, item.deliveryType || 'tomorrow',
        { gradeKey: item.gradeKey, gradeName: item.gradeName, silent: true });
    }
    setEditQty(p => { const n = { ...p }; delete n[itemKey]; return n; });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* ── Items ──────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">

        <div className="card overflow-hidden">
          {/* Section header */}
          <div className="px-4 py-2.5 border-b" style={{ background: vertical.headerGradient }}>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-green-300">{vertical.iconEl}</span>
              {vertical.label}
              <span className="ml-auto text-green-200 text-xs font-normal">
                {kbdItemCount} item{kbdItemCount !== 1 ? 's' : ''}
              </span>
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {kbdCart.items?.map((item, i) => {
              const prod    = item.product;
              const img     = prod?.images?.find(im => im.isPrimary)?.url
                              || prod?.images?.[0]?.url
                              || 'https://placehold.co/80x80/dcfce7/166534?text=🌿';
              const pid     = String(prod?._id || item.product);
              const lineAmt = (item.unitPrice || 0) * (item.quantity || 0);

              return (
                <div key={item._id || i} className="p-4 flex gap-4">
                  <Link to={`/koyambedu/product/${pid}`} className="flex-shrink-0">
                    <img src={img} alt={item.name}
                      className="w-20 h-20 object-cover rounded-xl bg-gray-100" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/koyambedu/product/${pid}`}>
                      <h3 className="text-sm font-medium text-gray-800 hover:text-green-700 line-clamp-2 mb-0.5">
                        {item.name}
                        {item.gradeKey && (
                          <span className="ml-1.5 text-[11px] bg-green-100 text-green-700
                                           font-semibold px-1.5 py-0.5 rounded-full">
                            {item.gradeName || item.gradeKey}
                          </span>
                        )}
                      </h3>
                    </Link>

                    {/* Variant label */}
                    {item.variantLabel && (
                      <span className="inline-block mb-1.5 text-[11px] bg-emerald-50 text-emerald-700
                                       border border-emerald-200 font-medium px-2 py-0.5 rounded-full">
                        {item.variantLabel}
                      </span>
                    )}

                    <p className="text-xs text-gray-500 mb-2">
                      ₹{item.unitPrice} / {item.unit}
                    </p>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {/* Qty stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => kbdUpdateItem(
                            pid,
                            Math.max(0, item.quantity - 1),
                            item.deliveryType || 'tomorrow',
                            { gradeKey: item.gradeKey, gradeName: item.gradeName, silent: true }
                          )}
                          disabled={kbdLoading}
                          className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center
                                     justify-center disabled:opacity-50 transition active:scale-90"
                        >
                          {item.quantity <= 1 ? <FiTrash2 size={11} /> : <FiMinus size={11} />}
                        </button>
                        <span className="text-sm font-bold text-gray-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => kbdUpdateItem(
                            pid,
                            item.quantity + 1,
                            item.deliveryType || 'tomorrow',
                            { gradeKey: item.gradeKey, gradeName: item.gradeName, silent: true }
                          )}
                          disabled={kbdLoading}
                          className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center
                                     justify-center disabled:opacity-50 transition active:scale-90"
                        >
                          <FiPlus size={11} />
                        </button>
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatINR(lineAmt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => kbdUpdateItem(pid, 0)}
                    disabled={kbdLoading}
                    className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1 disabled:opacity-50"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery note */}
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <FiTruck size={15} className="flex-shrink-0 mt-0.5" style={{ color: vertical.accent }} />
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Delivery Charges</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Koyambedu Daily delivery charges are calculated based on your delivery
                distance and the slot you choose. The exact charge will be shown at checkout.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary sidebar ────────────────────────────── */}
      <div>
        <div className="card p-6 sticky top-20">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

          <div className="space-y-2.5 text-sm mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Items ({kbdItemCount})</span>
              <span>{formatINR(kbdSubtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span className="flex items-center gap-1">
                <FiTruck size={11} /> Delivery charge
              </span>
              <span className="italic">Calculated at checkout</span>
            </div>

            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-100">
              <span>Items Total</span>
              <span style={{ color: vertical.accent }}>{formatINR(kbdSubtotal)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(vertical.checkoutPath)}
            className="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition mb-3"
            style={{ background: vertical.btnGradient, boxShadow: vertical.btnShadow }}
          >
            {vertical.checkoutLabel}
          </button>

          <Link
            to={vertical.continuePath}
            className="block text-center text-sm hover:underline"
            style={{ color: vertical.accent }}
          >
            <FiShoppingBag className="inline mr-1" size={13} />
            {vertical.continueLabel}
          </Link>

          <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
            <FiLock size={11} /> Secure checkout
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// EPTOMART TAB
// Weight-based shipping slabs, GST breakdown, full summary.
// ════════════════════════════════════════════════════════
function EptomartTab({
  sellerGroups, cartCount, subtotalExGst, gstTotal, shipping, total,
  isCodBlocked, codBlockedItems, cartGrandExShipping,
  updating, handleQtyChange, removeFromCart, setVariantPickerItem,
  navigate, isLoggedIn, vertical,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* ── Items ──────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">

        {Object.entries(sellerGroups).map(([key, group]) => (
          <div key={key} className="card overflow-hidden">
            {group.seller && (
              <div className="bg-orange-50 px-4 py-2.5 border-b border-orange-100">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FiGrid size={13} className="text-orange-400" />
                  {group.seller.businessName || 'Seller'}
                </p>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {group.items.map(item => (
                <div key={item.cartItemId} className="p-4 flex gap-4">
                  <Link to={`/product/${item.slug}`} className="flex-shrink-0">
                    <img src={item.image} alt={item.name}
                      className="w-20 h-20 object-cover rounded-xl bg-gray-100" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.slug}`}>
                      <h3 className="text-sm font-medium text-gray-800 hover:text-primary-600
                                     line-clamp-2 mb-1">
                        {item.name}
                      </h3>
                    </Link>

                    {item.variantLabel && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs bg-orange-100 text-orange-700 font-medium
                                         px-2 py-0.5 rounded-full">
                          {item.variantLabel}
                        </span>
                        <button
                          onClick={() => setVariantPickerItem(item)}
                          className="flex items-center gap-0.5 text-xs text-primary-500
                                     hover:text-primary-700 transition-colors"
                        >
                          <FiEdit2 size={10} /> Change
                        </button>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                      <p>Price excl. GST: {formatINR(item.unitPriceExGst)}</p>
                      <p>GST {item.gstRate}%: {formatINR(item.gstPerUnit)} per unit</p>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <QuantityControl
                        quantity={item.quantity}
                        min={0}
                        max={item.stock}
                        loading={updating[item.cartItemId]}
                        onChange={(q) => handleQtyChange(item.cartItemId, q)}
                        showTrashAtMin
                      />
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatINR(item.lineGrandTotal)}</p>
                        <p className="text-xs text-gray-400">incl. GST</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* COD warning */}
        {isCodBlocked && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm
                          text-blue-700 flex items-start gap-2">
            <FiInfo size={15} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Cash on Delivery not available</strong> for:{' '}
              {codBlockedItems.map(i => i.name).join(', ')}. Please pay online.
            </span>
          </div>
        )}

        {/* ── Delivery slab card ──────────────────────── */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
            <FiTruck size={14} /> Delivery Charges
          </h3>

          {cartGrandExShipping > FREE_SHIPPING_THRESHOLD ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200
                            rounded-lg px-3 py-2 text-sm text-green-700 font-semibold">
              <FiCheckCircle size={15} /> FREE shipping — orders above ₹{FREE_SHIPPING_THRESHOLD}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200
                              rounded-lg px-3 py-2 text-sm text-orange-700 mb-2">
                <FiTruck size={13} />
                <span>Shipping: <strong>{formatINR(shipping)}</strong></span>
                <span className="text-xs text-gray-500 ml-1">(based on order weight)</span>
              </div>
              <p className="text-xs text-gray-400">
                Add items worth{' '}
                <strong>{formatINR(FREE_SHIPPING_THRESHOLD - cartGrandExShipping)}</strong>{' '}
                more to get free shipping
              </p>
            </>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((cartGrandExShipping / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                  background: cartGrandExShipping >= FREE_SHIPPING_THRESHOLD
                    ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                    : 'linear-gradient(90deg,#f97316,#fb923c)',
                }}
              />
              <div className="absolute top-0 h-full w-px bg-orange-300" style={{ left: '33%' }} />
              <div className="absolute top-0 h-full w-px bg-orange-400" style={{ left: '66%' }} />
            </div>

            {/* Slab cards */}
            <div className="grid grid-cols-3 gap-2">
              {/* Slab 1 */}
              <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                shipping === LIGHT_SHIPPING
                  ? 'border-orange-400 bg-orange-50 shadow-sm scale-[1.02]'
                  : 'border-gray-100 bg-gray-50'
              }`}>
                {shipping === LIGHT_SHIPPING && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white
                                   text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    YOUR RATE
                  </span>
                )}
                <div className="flex justify-center mb-1"><FiZap size={20} className="text-orange-400" /></div>
                <p className="text-[11px] font-semibold text-gray-600 leading-tight">≤ 500g</p>
                <p className="text-sm font-extrabold text-orange-500 mt-0.5">₹{LIGHT_SHIPPING}</p>
              </div>

              {/* Slab 2 */}
              <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                shipping === HEAVY_SHIPPING
                  ? 'border-orange-400 bg-orange-50 shadow-sm scale-[1.02]'
                  : 'border-gray-100 bg-gray-50'
              }`}>
                {shipping === HEAVY_SHIPPING && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white
                                   text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    YOUR RATE
                  </span>
                )}
                <div className="flex justify-center mb-1"><FiTruck size={20} className="text-orange-400" /></div>
                <p className="text-[11px] font-semibold text-gray-600 leading-tight">&gt; 500g</p>
                <p className="text-sm font-extrabold text-orange-500 mt-0.5">₹{HEAVY_SHIPPING}</p>
              </div>

              {/* Slab 3 — Free */}
              <div className={`relative rounded-xl p-3 text-center border-2 transition-all ${
                shipping === 0
                  ? 'border-green-400 bg-green-50 shadow-sm scale-[1.02]'
                  : 'border-gray-100 bg-gray-50'
              }`}>
                {shipping === 0 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white
                                   text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    APPLIED ✓
                  </span>
                )}
                <div className="flex justify-center mb-1"><FiPackage size={20} className="text-green-500" /></div>
                <p className="text-[11px] font-semibold text-gray-600 leading-tight">
                  Above ₹{FREE_SHIPPING_THRESHOLD}
                </p>
                <p className="text-sm font-extrabold text-green-500 mt-0.5">FREE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Summary sidebar ───────────────────────── */}
      <div>
        <div className="card p-6 sticky top-20">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

          <div className="space-y-2.5 text-sm mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (excl. GST)</span>
              <span>{formatINR(subtotalExGst)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST</span>
              <span>{formatINR(gstTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>
                {shipping === 0 ? 'FREE' : formatINR(shipping)}
              </span>
            </div>
            {shipping === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50
                              rounded-lg p-2">
                <FiTruck size={12} /> Free delivery applied
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-gray-900
                            pt-2 border-t border-gray-100">
              <span>Grand Total</span>
              <span className="text-primary-600">{formatINR(total)}</span>
            </div>
          </div>

          <button
            onClick={() => isLoggedIn
              ? navigate('/checkout')
              : navigate('/login', { state: { from: '/checkout' } })}
            className="btn-primary w-full mb-3"
          >
            {isLoggedIn ? 'Proceed to Checkout →' : 'Login to Checkout →'}
          </button>

          <Link to="/shop" className="block text-center text-sm text-primary-500 hover:underline">
            <FiShoppingBag className="inline mr-1" size={13} />
            Continue Shopping
          </Link>

          <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
            <FiLock size={11} /> Secure checkout
          </p>
        </div>
      </div>
    </div>
  );
}
