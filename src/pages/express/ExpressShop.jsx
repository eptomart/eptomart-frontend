// ============================================
// EPTOMART EXPRESS — Shop
// Shows the nearest active store's catalogue (customer never sees which
// store is fulfilling them beyond a light mention — spec section 8). If no
// store has been selected yet (first visit, or cleared), redirects to the
// location picker. Surfaces the 12kg large-order warning inline in the
// cart summary (spec section 10). No checkout yet — Phase 3.
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiZap, FiMapPin, FiShoppingCart, FiPlus, FiMinus, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useExpressCart } from '../../context/ExpressCartContext';

// Weight sub-unit options for kg-priced produce — lets the customer pick a
// smaller pack size than a full kilogram before adding to cart, instead of
// only ever being able to add/step by whole kilograms.
const WEIGHT_STEPS = [
  { label: '250 g', kg: 0.25 },
  { label: '500 g', kg: 0.5 },
  { label: '1 kg', kg: 1 },
];

export default function ExpressShop() {
  const navigate = useNavigate();
  const { selectedStore, cart, fetchCart, addToCart, updateItem } = useExpressCart();
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  // productId -> chosen kg step (default 1kg). Only relevant for unit==='kg'
  // products; once an item is in the cart its stepper increments/decrements
  // by whatever step is currently selected here.
  const [weightStep, setWeightStep] = useState({});

  useEffect(() => {
    if (!selectedStore?._id) {
      navigate('/express/location');
      return;
    }
    api.get(`/express/stores/${selectedStore._id}/catalogue`)
      .then(({ data }) => setCatalogue(data.catalogue || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
    fetchCart();
  }, [selectedStore]);

  const qtyInCart = (productId) => cart.items?.find(i => String(i.product) === String(productId))?.quantity || 0;
  const stepFor = (productId) => weightStep[productId] ?? 1;

  const handleAdd = (productId, unit) => addToCart(productId, unit === 'kg' ? stepFor(productId) : 1);
  const handleQtyChange = (productId, unit, direction) => {
    const step = unit === 'kg' ? stepFor(productId) : 1;
    const current = qtyInCart(productId);
    const next = Math.max(0, Math.round((current + direction * step) * 100) / 100);
    if (current === 0 && direction > 0) return handleAdd(productId, unit);
    updateItem(productId, next);
  };

  if (!selectedStore) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-28">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-amber-500" size={20} />
        <h1 className="text-xl font-black text-indigo-900">Eptomart Express</h1>
      </div>
      <button onClick={() => navigate('/express/location')} className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 hover:text-indigo-600">
        <FiMapPin size={12} /> Delivering to your area · Change location
      </button>

      {cart.largeOrderWarning && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
          <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-amber-800">
            This is a large order ({cart.totalWeightKg} kg). For orders above {cart.largeOrderThresholdKg} kg, we recommend
            {' '}<Link to="/koyambedu" className="font-bold underline">Koyambedu Daily</Link> for better availability and delivery support.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading products…</p>
      ) : catalogue.length === 0 ? (
        <p className="text-sm text-gray-400">No products available at this store right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {catalogue.map(({ product, pricePerUnit, stockQty }) => {
            const qty = qtyInCart(product._id);
            const isKg = product.unit === 'kg';
            return (
              <div key={product._id} className="bg-white border rounded-xl p-3 flex flex-col">
                <div className="w-full aspect-square rounded-lg bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <FiZap className="text-gray-300" size={24} />}
                </div>
                <p className="font-bold text-sm text-gray-800 truncate">{product.name}</p>
                <p className="text-xs text-gray-400 mb-2">₹{pricePerUnit}/{product.unit}</p>

                {isKg && qty === 0 && (
                  <select value={stepFor(product._id)} onChange={e => setWeightStep(w => ({ ...w, [product._id]: Number(e.target.value) }))}
                    className="mb-1.5 border rounded-lg px-2 py-1 text-xs">
                    {WEIGHT_STEPS.map(s => <option key={s.kg} value={s.kg}>{s.label}</option>)}
                  </select>
                )}

                {qty === 0 ? (
                  <button onClick={() => handleAdd(product._id, product.unit)} disabled={stockQty === 0}
                    className="mt-auto w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-40">
                    {stockQty === 0 ? 'Out of stock' : 'Add'}
                  </button>
                ) : (
                  <div className="mt-auto flex items-center justify-between bg-indigo-50 rounded-lg px-2 py-1.5">
                    <button onClick={() => handleQtyChange(product._id, product.unit, -1)} className="text-indigo-700"><FiMinus size={14} /></button>
                    <span className="font-bold text-sm text-indigo-900">{qty}{isKg ? ' kg' : ''}</span>
                    <button onClick={() => handleQtyChange(product._id, product.unit, 1)} className="text-indigo-700"><FiPlus size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cart.itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{cart.itemCount} item(s) · {cart.totalWeightKg} kg</p>
              <p className="font-bold text-gray-800">₹{cart.subtotal}</p>
            </div>
            <button onClick={() => navigate('/express/checkout')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
              <FiShoppingCart size={16} /> Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
