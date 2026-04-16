// ============================================
// FOOTER
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS } from '../../utils/businessInfo';
import { FiInstagram, FiFacebook, FiTwitter, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <span className="text-white font-bold text-lg">Eptomart</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              India's fast & affordable online shopping destination. Quality products delivered to your door.
            </p>
            <div className="flex gap-3">
              {[FiInstagram, FiFacebook, FiTwitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-primary-500 hover:text-white transition-colors">
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
                  <Link to={path} className="hover:text-primary-400 transition-colors">{label}</Link>
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
                { label: 'FAQ',              href: '#' },
                { label: 'Shipping Policy',  href: '#' },
                { label: 'Return Policy',    href: '#' },
                { label: 'Privacy Policy',   href: '#' },
                { label: 'Terms of Service', href: '#' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.href} className="hover:text-primary-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <FiMail size={15} className="text-primary-400 flex-shrink-0" />
                <span>{BUSINESS.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <FiPhone size={15} className="text-primary-400 flex-shrink-0" />
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
