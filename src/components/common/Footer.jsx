// ============================================
// FOOTER
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../../utils/businessInfo';
import { FiInstagram, FiFacebook, FiTwitter, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import EptomartLogo from './EptomartLogo';

export default function Footer() {
  return (
    <footer className="text-gray-400 mt-auto" style={{background:'#0B1729'}}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <EptomartLogo variant="horizontal" height={38} />
            </div>
            <p className="text-sm leading-relaxed mb-4">
              India's fast & affordable online shopping destination. Quality products delivered to your door.
            </p>
            <div className="flex gap-3">
              {[FiInstagram, FiFacebook, FiTwitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{background:'#0E2040'}} onMouseEnter={e=>e.currentTarget.style.background='#f4941c'} onMouseLeave={e=>e.currentTarget.style.background='#0E2040'}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[['Home', '/'], ['Shop', '/shop'], ['My Orders', '/orders'], ['My Profile', '/profile']].map(([label, path]) => (
                <li key={path}>
                  <Link to={path} className="transition-colors hover:text-orange-400">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold mb-4">Help & Support</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Contact Us', href: '/contact' },
                { label: 'FAQ',              href: '/faq' },
                { label: 'Shipping Policy',  href: '/shipping-policy' },
                { label: 'Return Policy',    href: '/return-policy' },
                { label: 'Privacy Policy',   href: '/privacy-policy' },
                { label: 'Terms of Service', href: '/terms-of-service' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.href} className="transition-colors hover:text-orange-400">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <FiMail size={15} className="flex-shrink-0" style={{color:'#f4941c'}} />
                <span>{BUSINESS.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <FiPhone size={15} className="flex-shrink-0" style={{color:'#f4941c'}} />
                <span>{BUSINESS.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <FiMapPin size={15} className="text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{BUSINESS.address}</span>
              </li>
            </ul>

            {/* Payment badges */}
            <div className="mt-4">
              <p className="text-xs mb-2 text-gray-500">Accepted Payments</p>
              <div className="flex gap-2 flex-wrap">
                {['UPI', 'COD', 'Cards', 'NetBanking'].map(method => (
                  <span key={method} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">{method}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs">© {new Date().getFullYear()} Eptomart. All rights reserved. Made with ❤️ in India 🇮🇳</p>
          <p className="text-xs">GST Registered Business</p>
        </div>
      </div>
    </footer>
  );
}
