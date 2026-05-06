// ============================================
// RETURN POLICY PAGE
// ============================================
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function ReturnPolicy() {
  return (
    <>
      <Helmet>
        <title>Return Policy — Eptomart</title>
        <meta name="description" content="Eptomart's return and refund policy. Learn what's eligible for return, how to initiate one, and how refunds are processed." />
      </Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
            <FiRefreshCw size={28} className="text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Return & Refund Policy</h1>
          <p className="text-gray-500">We want you to be completely satisfied with your purchase.</p>
        </div>

        <div className="space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Return Window</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="font-semibold text-orange-800">7-Day Return Window</p>
              <p className="text-sm text-orange-700 mt-1">You may request a return within <strong>7 days</strong> of the delivery date. Requests raised after 7 days will not be accepted.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">What Can Be Returned?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle size={16} className="text-green-500" />
                  <p className="font-semibold text-green-800">Eligible for Return</p>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Defective or damaged products</li>
                  <li>• Wrong item delivered</li>
                  <li>• Product significantly different from description</li>
                  <li>• Incomplete order (missing items)</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiXCircle size={16} className="text-red-500" />
                  <p className="font-semibold text-red-800">Not Eligible for Return</p>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Items that have been used or altered</li>
                  <li>• Perishable goods (food, consumables)</li>
                  <li>• Items without original packaging</li>
                  <li>• Digital products or software</li>
                  <li>• Products marked "Non-Returnable"</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">How to Initiate a Return</h2>
            <ol className="space-y-3 text-sm">
              {[
                'Go to My Orders and find the order you want to return.',
                'Contact us via the Contact Us page or email eptosicare@gmail.com with your order ID and reason for return.',
                'Our team will review your request within 1–2 business days.',
                'If approved, you will receive return pickup instructions. Pack the item securely in its original packaging.',
                'Once the item is received and inspected, your refund will be processed.',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-gray-600">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Refund Process</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <FiCheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">Online Payments (Razorpay)</p>
                  <p className="text-gray-600">Refunds are credited back to the original payment method within <strong>5–7 business days</strong> after the return is approved and the item is received.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <FiAlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">Cash on Delivery (COD)</p>
                  <p className="text-gray-600">COD refunds are processed manually via bank transfer or UPI. Our team will contact you to collect your account details. Please allow 3–5 additional business days.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">* Shipping charges are non-refundable unless the return is due to a defect or wrong item.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Cancellations</h2>
            <p className="text-sm mb-2">Orders in "Placed" or "Confirmed" status can be cancelled directly from the My Orders page. Once shipped, cancellation is not possible.</p>
            <p className="text-sm text-gray-600">For online-paid orders cancelled before shipment, refunds are automatically initiated and credited within 5–7 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Contact Us</h2>
            <p className="text-sm">For return or refund queries, email us at <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a> or use our <a href="/contact" className="text-primary-500 hover:underline">Contact page</a>. Include your order ID for faster assistance.</p>
          </section>

          <p className="text-xs text-gray-400">Last updated: May 2025</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
