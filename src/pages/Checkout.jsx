// ============================================
// CHECKOUT PAGE — Address + Razorpay / COD Payment
// ============================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiShield, FiTruck, FiLoader, FiEdit2, FiMinus, FiPlus } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import DeliveryEstimate from '../components/product/DeliveryEstimate';
import VariantPickerModal from '../components/cart/VariantPickerModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import { extractBasePrice } from '../utils/gst';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { usePincodeAutofill } from '../hooks/usePincodeAutofill';

// Load Razorpay SDK dynamically
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Checkout() {
  const { cartItems, enrichedItems, subtotalExGst, gstTotal, shipping, total, sellerGroups, clearCart, isCodBlocked, addToCart, updateQuantity } = useCart();
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Support "Buy Now" — items passed via navigate state instead of cart
  const buyNow = location.state?.buyNow || null;
  const checkoutItems = buyNow ? [buyNow] : cartItems;

  // COD + Shiprocket serviceability state — declared early so derived values below can use it
  const [codCheck, setCodCheck] = useState({
    available: null,   // null = unchecked, true/false = result
    edd: null,
    eddDays: null,
    courierName: null,
    shippingRate: null,   // actual courier rate in ₹ from Shiprocket
    loading: false,
    checked: false,
  });

  // Buy Now pricing — computed independently (cart totals are always from cartItems)
  const bnPrice    = buyNow?.price    || 0;
  const bnQty      = buyNow?.quantity || 1;
  const bnGstRate  = buyNow?.gstRate  || 18;
  const bnExGst    = buyNow ? extractBasePrice(bnPrice, bnGstRate) * bnQty : 0;
  const bnGst      = buyNow ? parseFloat((bnExGst * bnGstRate / 100).toFixed(2)) : 0;
  // Buy Now shipping will be determined after cod-check
  const bnShipping = buyNow && codCheck.shippingRate !== null ? codCheck.shippingRate : (buyNow ? null : 0);
  const bnTotal    = buyNow && bnShipping !== null ? parseFloat((bnExGst + bnGst + bnShipping).toFixed(2)) : null;

  // Use correct totals based on flow — use real shipping from codCheck if available
  const displaySubtotal = buyNow ? parseFloat(bnExGst.toFixed(2)) : subtotalExGst;
  const displayGst      = buyNow ? bnGst      : gstTotal;
  // For both cart and buy now, prefer real shipping from codCheck.shippingRate
  const displayShipping = codCheck.shippingRate !== null ? codCheck.shippingRate : (buyNow ? bnShipping : shipping);
  const displayTotal    = displayShipping !== null ? parseFloat((displaySubtotal + displayGst + displayShipping).toFixed(2)) : null;

  const [address, setAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '', landmark: '', alternatePhone: '',
  });
  const [savedAddresses,    setSavedAddresses]    = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddrForm,   setShowNewAddrForm]   = useState(false);
  const codCheckRef = useRef('');  // last pincode checked

  // Fix: sync address state AFTER user loads (fixes race condition)
  useEffect(() => {
    if (user?.addresses?.length) {
      const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setSavedAddresses(user.addresses);
      setSelectedAddressId(def._id?.toString());
      setAddress({
        fullName:     def.fullName     || user.name  || '',
        phone:        def.phone        || user.phone || '',
        addressLine1: def.addressLine1 || '',
        addressLine2: def.addressLine2 || '',
        city:         def.city         || '',
        state:        def.state        || '',
        pincode:      def.pincode      || '',
        landmark:     def.landmark     || '',
        alternatePhone: def.alternatePhone || '',
      });
    } else if (user) {
      setAddress(prev => ({
        ...prev,
        fullName: prev.fullName || user.name  || '',
        phone:    prev.phone    || user.phone || '',
      }));
      setShowNewAddrForm(true);
    }
  }, [user]);

  // Check COD serviceability when pincode is set on address
  const checkCodServiceability = useCallback(async (pincode) => {
    if (!pincode || pincode.length !== 6 || pincode === codCheckRef.current) return;
    codCheckRef.current = pincode;
    setCodCheck(prev => ({ ...prev, loading: true, checked: false }));
    try {
      const { data } = await api.get(`/delivery/cod-check?delivery=${pincode}`);
      setCodCheck({
        available:    data.codAvailable,
        edd:          data.edd,
        eddDays:      data.eddDays,
        courierName:  data.courierName,
        shippingRate: data.shippingRate || null,
        loading:      false,
        checked:      true,
      });
    } catch {
      // Fallback — show COD optimistically
      setCodCheck({ available: true, edd: null, eddDays: null, courierName: null, loading: false, checked: true });
    }
  }, []);

  // Re-check COD when pincode changes
  useEffect(() => {
    if (address.pincode?.length === 6) checkCodServiceability(address.pincode);
  }, [address.pincode, checkCodServiceability]);

  // Select a saved address
  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr._id?.toString());
    setAddress({
      fullName:       addr.fullName       || '',
      phone:          addr.phone          || '',
      addressLine1:   addr.addressLine1   || '',
      addressLine2:   addr.addressLine2   || '',
      city:           addr.city           || '',
      state:          addr.state          || '',
      pincode:        addr.pincode        || '',
      landmark:       addr.landmark       || '',
      alternatePhone: addr.alternatePhone || '',
    });
    setShowNewAddrForm(false);
    codCheckRef.current = '';  // force re-check for new pincode
  };

  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [step, setStep] = useState(1);
  const [variantPickerItem, setVariantPickerItem] = useState(null);

  // Pincode autofill for checkout address
  const { lookupPincode, pincodeLoading } = usePincodeAutofill(
    useCallback(({ city, state }) => setAddress(prev => ({ ...prev, city, state })), [])
  );

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
    if (name === 'pincode') {
      lookupPincode(value);
      if (value.length !== 6) {
        codCheckRef.current = '';
        setCodCheck({ available: null, edd: null, eddDays: null, courierName: null, loading: false, checked: false });
      }
    }
  };

  const validateAddress = () => {
    const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!address[field]?.trim()) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    if (!/^[6-9]\d{9}$/.test(address.phone)) { toast.error('Invalid mobile number'); return false; }
    if (!/^\d{6}$/.test(address.pincode)) { toast.error('Invalid pincode'); return false; }
    return true;
  };

  // ── Razorpay flow ────────────────────────────────────────
  const handleRazorpayPayment = async (orderId) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Failed to load payment gateway. Please try again.');
      return false;
    }

    const { data } = await api.post('/payment/razorpay/create-order', { orderId });

    return new Promise((resolve) => {
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Eptomart',
        description: `Order #${data.orderNumber}`,
        image: '/icons/icon-192x192.png',
        order_id: data.razorpayOrderId,
        prefill: {
          name: address.fullName,
          contact: `+91${address.phone}`,
          email: user?.email || '',
        },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId,
            });
            if (verifyRes.data.success) {
              resolve(true);
            } else {
              toast.error('Payment verification failed');
              resolve(false);
            }
          } catch {
            toast.error('Payment verification failed');
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' });
            resolve(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        resolve(false);
      });
      rzp.open();
    });
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;
    // Prevent COD if blocked by product or serviceability
    if (paymentMethod === 'cod' && isCodBlocked) {
      toast.error('One or more items do not support COD. Please pay online.');
      return;
    }
    if (paymentMethod === 'cod' && codCheck.checked && codCheck.available === false) {
      toast.error('COD is not available for your pincode. Please pay online.');
      return;
    }
    setLoading(true);

    try {
      // Save new addresses
      const isDuplicate = savedAddresses.some(
        a => a.addressLine1?.trim().toLowerCase() === address.addressLine1?.trim().toLowerCase()
          && a.pincode === address.pincode
      );
      if (!isDuplicate && !selectedAddressId) {
        try {
          const res = await api.post('/auth/add-address', {
            ...address,
            label: 'Home',
            isDefault: savedAddresses.length === 0,
          });
          if (res.data.success) {
            setSavedAddresses(res.data.addresses);
            await loadUser();
          }
        } catch {
          toast.error('Address could not be saved, but your order will proceed.');
        }
      }

      // Create order in our system
      const { data } = await api.post('/orders', {
        items: checkoutItems.map(item => ({
          product:      item._id || item.product,
          quantity:     item.quantity,
          price:        item.price,
          variantLabel: item.variantLabel || undefined,
        })),
        shippingAddress: address,
        paymentMethod,
      });

      const order = data.order;

      if (paymentMethod === 'razorpay') {
        const paid = await handleRazorpayPayment(order._id);
        if (!paid) {
          // Payment cancelled or failed — keep cart intact, go back to cart
          toast.error('Payment was not completed. Your cart items are saved — try again when ready.', { duration: 5000 });
          setLoading(false);
          navigate('/cart');
          return;
        }
        toast.success('Payment successful! Order confirmed 🎉');
      } else {
        // COD — order is already placed, Shiprocket is triggered server-side
        toast.success('Order placed! Pay on delivery 📦');
      }

      clearCart();
      setOrderPlaced({ ...order, codEdd: codCheck.edd, codEddDays: codCheck.eddDays, codCourier: codCheck.courierName });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ── Variant picker handler ───────────────────────────────
  const handleVariantSelect = (variant, vLabel) => {
    if (!variantPickerItem) return;
    const item = variantPickerItem;
    addToCart({
      _id:           item._id,
      name:          item.name,
      price:         variant.price,
      discountPrice: variant.price,
      images:        [{ url: item.image }],
      stock:         variant.stock,
      slug:          item.slug,
      gstRate:       item.gstRate,
      codAvailable:  item.codAvailable,
      selectedSeller:item.seller,
      variantLabel:  vLabel,
    }, item.quantity);
    setVariantPickerItem(null);
  };

  // ── Order Success Screen ─────────────────────────────────
  if (step === 3 && orderPlaced) {
    const isCod = orderPlaced.paymentMethod === 'cod';
    return (
      <>
        <Helmet><title>Order Placed! — Eptomart</title></Helmet>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isCod ? 'Order Placed! 📦' : 'Payment Successful! 🎉'}
          </h1>
          <p className="text-gray-500 mb-1">
            Order ID: <span className="font-mono font-bold text-primary-600">#{orderPlaced.orderId}</span>
          </p>
          <p className="text-gray-500 mb-4">
            Total: <span className="font-bold">{formatINR(orderPlaced.pricing?.total)}</span>
          </p>

          {isCod ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">💵 Cash on Delivery</p>
              <p>Keep ₹{orderPlaced.pricing?.total?.toLocaleString('en-IN')} ready when the order arrives.</p>
              {orderPlaced.codEdd && (
                <p className="mt-2 flex items-center gap-1.5 justify-center">
                  <FiTruck size={14} />
                  Expected delivery: <strong>{new Date(orderPlaced.codEdd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  {orderPlaced.codCourier && <span className="text-xs">via {orderPlaced.codCourier}</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm text-green-700">
              ✅ Payment confirmed via Razorpay. Your order is being processed. You will receive an invoice shortly.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary flex-1">Track Order</button>
            <button onClick={() => navigate('/')} className="btn-outline flex-1">Continue Shopping</button>
          </div>
        </div>
      </>
    );
  }

  // ── Checkout Form ────────────────────────────────────────
  const codAvailableForCart = !isCodBlocked;
  const showCodOption = codAvailableForCart && (
    !codCheck.checked || codCheck.available !== false
  );

  return (
    <>
      <Helmet><title>Checkout — Eptomart</title></Helmet>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Delivery Address */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">📍 Delivery Address</h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && !showNewAddrForm && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map(addr => (
                    <label
                      key={addr._id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${selectedAddressId === addr._id?.toString()
                          ? 'border-primary-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === addr._id?.toString()}
                        onChange={() => handleSelectAddress(addr)}
                        className="mt-1 accent-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">
                          {addr.fullName} · <span className="font-normal">{addr.phone}</span>
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                          {addr.landmark ? ` (${addr.landmark})` : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                        {addr.isDefault && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Default</span>
                        )}
                      </div>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowNewAddrForm(true); setSelectedAddressId(null); }}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl p-3 text-sm text-gray-500 hover:text-primary-600 transition-all text-center"
                  >
                    + Add New Address
                  </button>
                </div>
              )}

              {/* New address form */}
              {(showNewAddrForm || savedAddresses.length === 0) && (
                <>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddrForm(false);
                        const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
                        setSelectedAddressId(def?._id?.toString());
                      }}
                      className="text-sm text-primary-600 hover:underline mb-3 block"
                    >
                      ← Use saved address
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mb-4">Fields marked <span className="text-red-500 font-bold">*</span> are required</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'fullName',       label: 'Full Name',        placeholder: 'John Doe',                  required: true,  col: 1 },
                      { name: 'phone',          label: 'Mobile Number',    placeholder: '98765 43210',               required: true,  col: 1 },
                      { name: 'addressLine1',   label: 'Address Line 1',   placeholder: 'House No, Street Name',     required: true,  col: 2 },
                      { name: 'addressLine2',   label: 'Address Line 2',   placeholder: 'Apartment, Floor (optional)',required: false, col: 2 },
                      { name: 'landmark',       label: 'Landmark',         placeholder: 'Near school, temple, etc.', required: false, col: 2 },
                      { name: 'pincode',        label: 'Pincode',          placeholder: '400001',                    required: true },
                      { name: 'city',           label: 'City',             placeholder: 'Mumbai',                    required: true },
                      { name: 'state',          label: 'State',            placeholder: 'Maharashtra',               required: true },
                      { name: 'alternatePhone', label: 'Alternate Phone',  placeholder: 'Optional',                  required: false },
                    ].map(field => {
                      const isEmpty = field.required && !address[field.name]?.trim();
                      const isPincode = field.name === 'pincode';
                      return (
                        <div key={field.name} className={field.col === 2 ? 'sm:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <div className={isPincode ? 'relative' : ''}>
                            <input
                              type="text"
                              name={field.name}
                              placeholder={field.placeholder}
                              value={address[field.name]}
                              onChange={handleAddressChange}
                              maxLength={isPincode ? 6 : field.name === 'phone' || field.name === 'alternatePhone' ? 10 : undefined}
                              className={`input-field transition-all ${isPincode ? 'pr-8' : ''} ${isEmpty && address[field.name] !== undefined ? 'border-red-400 bg-red-50 focus:ring-red-300' : ''}`}
                            />
                            {isPincode && (pincodeLoading || codCheck.loading) && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                          {isPincode && <p className="text-xs text-gray-400 mt-0.5">City & state auto-filled from pincode</p>}
                          {isEmpty && address[field.name] !== undefined && (
                            <p className="text-xs text-red-500 mt-1">This field is required</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">💳 Payment Method</h2>

              <div className="space-y-3">
                {/* Razorpay */}
                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${paymentMethod === 'razorpay' ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input
                    type="radio" name="paymentMethod" value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="accent-primary-500"
                  />
                  <span className="text-2xl">💳</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Pay Online (Razorpay)</p>
                    <p className="text-xs text-gray-500">Cards, UPI, NetBanking, Wallets — secure &amp; instant</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Secure</span>
                </label>

                {/* COD */}
                {!isCodBlocked && (
                  <div>
                    <label
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                        ${codCheck.checked && codCheck.available === false
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'cursor-pointer ' + (paymentMethod === 'cod' ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}`}
                    >
                      <input
                        type="radio" name="paymentMethod" value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        disabled={codCheck.checked && codCheck.available === false}
                        className="accent-primary-500"
                      />
                      <span className="text-2xl">💵</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">Cash on Delivery (COD)</p>
                        {codCheck.loading ? (
                          <p className="text-xs text-gray-400 flex items-center gap-1"><FiLoader size={10} className="animate-spin" /> Checking COD for your pincode...</p>
                        ) : codCheck.checked && codCheck.available === false ? (
                          <p className="text-xs text-red-500">COD not available for pincode {address.pincode}. Please pay online.</p>
                        ) : codCheck.checked && codCheck.available && codCheck.edd ? (
                          <p className="text-xs text-gray-500">
                            Pay when delivered · EDD: {new Date(codCheck.edd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {codCheck.courierName ? ` via ${codCheck.courierName}` : ''}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">Pay when delivered to your door</p>
                        )}
                      </div>
                      {codCheck.checked && codCheck.available ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Available</span>
                      ) : !codCheck.checked && !codCheck.loading ? (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Enter pincode</span>
                      ) : null}
                    </label>
                  </div>
                )}

                {isCodBlocked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    ⚠️ One or more items in your cart are not eligible for COD. Please pay online.
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3 text-center">
                🔒 All online payments are processed securely via Razorpay
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {checkoutItems.map(item => (
                  <div key={item._id || item.product} className="flex gap-3 text-sm pb-3 border-b border-gray-100 last:border-0">
                    <img
                      src={item.image || item.images?.[0]?.url}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 line-clamp-1 font-medium">{item.name}</p>

                      {/* Variant label + change button */}
                      {item.variantLabel && (
                        <div className="flex items-center gap-1 mt-0.5 mb-1">
                          <span className="text-[11px] bg-orange-100 text-orange-700 font-medium px-1.5 py-0.5 rounded-full">
                            {item.variantLabel}
                          </span>
                          {/* Only show Change button for cart flow (not Buy Now) */}
                          {!buyNow && (
                            <button
                              onClick={() => setVariantPickerItem(item)}
                              className="flex items-center gap-0.5 text-[11px] text-primary-500 hover:text-primary-700 transition-colors"
                            >
                              <FiEdit2 size={9} /> Change
                            </button>
                          )}
                        </div>
                      )}

                      {/* Price + quantity controls */}
                      <div className="flex items-center justify-between mt-1 gap-2">
                        {/* Qty stepper — only for cart flow */}
                        {!buyNow ? (
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-0.5">
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiMinus size={10} />
                            </button>
                            <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => {
                                if (item.variantLabel) {
                                  // Item has variants — pop the picker so user can choose the right pack/price
                                  setVariantPickerItem(item);
                                } else {
                                  updateQuantity(item._id, item.quantity + 1);
                                }
                              }}
                              disabled={item.quantity >= (item.stock || 99)}
                              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiPlus size={10} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                        )}
                        <span className="font-semibold text-gray-800 text-sm">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatINR(item.price)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery estimates per seller */}
              {Object.entries(sellerGroups || {}).map(([key, group]) => (
                group.seller && (
                  <div key={key} className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      🏪 {group.seller.businessName || 'Seller'}
                    </p>
                    <DeliveryEstimate
                      sellerId={group.seller._id}
                      deliveryPincode={address.pincode?.length === 6 ? address.pincode : undefined}
                    />
                  </div>
                )
              ))}

              <div className="border-t pt-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (excl. GST)</span>
                  <span>{formatINR(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>{formatINR(displayGst)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping{codCheck.courierName ? <span className="text-xs text-gray-400 ml-1">via {codCheck.courierName}</span> : null}</span>
                  <span className={displayShipping === 0 ? 'text-green-500' : ''}>
                    {codCheck.shippingRate != null
                      ? formatINR(codCheck.shippingRate)
                      : displayShipping === 0 ? 'FREE' : formatINR(displayShipping)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatINR(displayTotal)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || checkoutItems.length === 0 || displayTotal === null}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading
                  ? 'Processing...'
                  : displayTotal === null
                    ? 'Enter pincode for shipping...'
                    : paymentMethod === 'razorpay'
                      ? `Pay ${formatINR(displayTotal)}`
                      : `Place COD Order — ${formatINR(displayTotal)}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3">
                <FiShield size={12} className="text-gray-400" />
                <p className="text-xs text-gray-400">Secure checkout. Your data is protected.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Variant picker modal */}
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
