// Sticky bar shown to a Super Admin while "viewing as customer".
// Everything underneath is the real customer UI; this bar only adds the
// shortcuts and the Exit button. Renders nothing for anyone else.
import { Link } from 'react-router-dom';
import { getViewAs, stopViewAs } from '../../utils/viewAsCustomer';

export default function ViewAsBanner() {
  // The app's user is the customer while viewing; the server re-checks super
  // admin on every request, so sessionStorage alone grants nothing.
  const va = getViewAs();
  const active = !!va;

  if (!active) return null;
  const link = (to, label) => (
    <Link to={to} className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold whitespace-nowrap">{label}</Link>
  );
  return (
    <div className="sticky top-0 z-[60] bg-indigo-700 text-white px-3 py-2 flex items-center gap-2 flex-wrap shadow">
      <span className="text-xs font-bold">👁 Viewing as {va.name}{va.phone ? ` · ${va.phone}` : ''}</span>
      <span className="text-[10px] opacity-80">Changes are saved to this customer. Payment is off.</span>
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
