// Sticky bar shown to a Super Admin while "viewing as customer".
// Everything underneath is the real customer UI; this bar only adds the
// shortcuts and the Exit button. Renders nothing for anyone else.
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getViewAs, stopViewAs } from '../../utils/viewAsCustomer';

export default function ViewAsBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const va = getViewAs();
  const active = !!va && user?.role === 'superAdmin';

  // Checkout / payment are never available while viewing as a customer.
  useEffect(() => {
    if (active && pathname.startsWith('/koyambedu/checkout')) {
      toast('Checkout is disabled while viewing as a customer', { icon: 'ℹ️' });
      navigate('/koyambedu/cart', { replace: true });
    }
  }, [active, pathname, navigate]);

  if (!active) return null;
  const link = (to, label) => (
    <Link to={to} className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold whitespace-nowrap">{label}</Link>
  );
  return (
    <div className="sticky top-0 z-[60] bg-indigo-700 text-white px-3 py-2 flex items-center gap-2 flex-wrap shadow">
      <span className="text-xs font-bold">👁 Viewing as {va.name}{va.phone ? ` · ${va.phone}` : ''}</span>
      <span className="text-[10px] opacity-80">Cart edits are saved to this customer. Checkout is off.</span>
      <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
        {link('/koyambedu', 'Home')}
        {link('/koyambedu/shop', 'Shop')}
        {link('/koyambedu/cart', 'Cart')}
        {link('/koyambedu/wallet', 'Wallet')}
        {link('/orders?tab=koyambedu', 'Orders')}
        <button onClick={() => stopViewAs()} className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-[11px] font-black whitespace-nowrap">Exit</button>
      </div>
    </div>
  );
}
