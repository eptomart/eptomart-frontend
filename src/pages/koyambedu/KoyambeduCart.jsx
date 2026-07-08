// KoyambeduCart — redirects to the unified Eptomart cart (/cart)
// The Koyambedu Daily section is displayed within the common cart page.
import { Navigate } from 'react-router-dom';
export default function KoyambeduCart() {
  return <Navigate to="/cart" replace />;
}
