// ============================================
// PRIVACY POLICY PAGE
// ============================================
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FiShield } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Eptomart</title>
        <meta name="description" content="Eptomart's Privacy Policy — how we collect, use, and protect your personal information." />
      </Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl mb-4">
            <FiShield size={28} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500">Your privacy is important to us. This policy explains how Eptomart collects and uses your data.</p>
        </div>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Who We Are</h2>
            <p>Eptomart is an online marketplace operated by Eptosi Group of Companies, registered in India. We connect buyers with verified local sellers for a safe and seamless shopping experience. For queries, contact us at <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following information when you use Eptomart:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li><strong>Account Information:</strong> Name, email address, mobile number, and password (encrypted).</li>
              <li><strong>Delivery Information:</strong> Shipping addresses including name, address, city, state, and pincode.</li>
              <li><strong>Order Information:</strong> Products purchased, payment method, order history, and invoice data.</li>
              <li><strong>Payment Information:</strong> We do not store card details. Payments are processed securely by Razorpay.</li>
              <li><strong>Usage Data:</strong> Pages visited, search queries, device type, IP address, and browser information (for analytics and fraud prevention).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>To process and fulfil your orders.</li>
              <li>To send order confirmations, shipping updates, and invoices.</li>
              <li>To provide customer support.</li>
              <li>To verify your identity and prevent fraud.</li>
              <li>To improve our platform and personalise your experience.</li>
              <li>To comply with legal and regulatory requirements in India.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">4. Sharing Your Information</h2>
            <p className="mb-2">We do not sell your personal data. We share information only as necessary:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li><strong>Sellers:</strong> Order details (name, delivery address) are shared with the seller fulfilling your order.</li>
              <li><strong>Logistics Partners:</strong> Delivery name and address are shared with Shiprocket and its courier network for fulfilment.</li>
              <li><strong>Payment Processors:</strong> Razorpay processes payments and has its own privacy policy.</li>
              <li><strong>Legal Requirements:</strong> We may disclose data if required by Indian law or a valid court order.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">5. Data Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your data, including HTTPS encryption, hashed passwords, and secure cloud storage. However, no system is 100% secure — please keep your account credentials private.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">6. Cookies</h2>
            <p>We use cookies and local storage to maintain your session, cart, and preferences. You can disable cookies in your browser settings, but this may affect functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">7. Your Rights</h2>
            <p className="mb-2">As a user, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Access and review the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Withdraw consent for marketing communications.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">8. Data Retention</h2>
            <p>We retain your account and order data for as long as your account is active or as required by law (typically 7 years for financial records under Indian tax laws). You may request account deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">9. Children's Privacy</h2>
            <p>Eptomart is not intended for users under 18 years of age. We do not knowingly collect personal data from minors.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with the updated date. Continued use of Eptomart after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">11. Contact</h2>
            <p>For privacy-related queries or concerns, please contact:<br />
              <strong>Eptosi Group of Companies</strong><br />
              Email: <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a>
            </p>
          </section>

          <p className="text-xs text-gray-400">Last updated: May 2025</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
