// ============================================
// SHIPPING POLICY PAGE
// ============================================
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FiTruck, FiCheckCircle, FiMapPin, FiPackage, FiAlertCircle } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function ShippingPolicy() {
  return (
    <>
      <Helmet>
        <title>Shipping Policy — Eptomart</title>
        <meta name="description" content="Learn about Eptomart's 1-day shipping commitment, delivery timelines, and shipping rates." />
      </Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <FiTruck size={28} className="text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">1-Day Shipping Policy</h1>
          <p className="text-gray-500">Eptomart is committed to getting your orders to you as fast as possible.</p>
        </div>

        <div className="space-y-8 text-gray-700">

          {/* Key promises */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: FiCheckCircle, title: 'Same-Day Dispatch', desc: 'Orders placed before 12:00 PM are dispatched the same day (business days).', color: 'text-green-500', bg: 'bg-green-50' },
              { icon: FiTruck,       title: 'Express Delivery',   desc: 'Delivery within 1–2 business days for most metros and tier-1 cities.',      color: 'text-blue-500',  bg: 'bg-blue-50'  },
              { icon: FiPackage,     title: 'Tracked Shipments',  desc: 'Every order is tracked via Shiprocket. Track it live from your Orders page.', color: 'text-purple-500',bg: 'bg-purple-50'},
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={`${bg} rounded-2xl p-5`}>
                <Icon size={22} className={`${color} mb-2`} />
                <p className="font-semibold text-gray-800 mb-1">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Delivery Timelines</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Estimated Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Metro cities (Chennai, Mumbai, Delhi, Bengaluru…)', '1–2 business days'],
                    ['Tier-1 & Tier-2 cities', '2–3 business days'],
                    ['Tier-3 cities & towns', '3–5 business days'],
                    ['Remote & rural areas', '5–7 business days'],
                  ].map(([loc, time]) => (
                    <tr key={loc} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{loc}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">* Timelines are estimates and may vary during peak seasons, public holidays, or extreme weather events.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Shipping Charges</h2>
            <p className="mb-3">Shipping charges are calculated based on your delivery pincode and the total order weight.</p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <FiCheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Free Shipping on Orders Above ₹1,499</p>
                <p className="text-sm text-green-700 mt-0.5">Orders totalling ₹1,499 or more (inclusive of GST) qualify for free delivery anywhere in India.</p>
              </div>
            </div>
            <p className="mt-3 text-sm">For orders below ₹1,499, shipping charges are shown at checkout based on real-time courier rates.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Serviceability</h2>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <FiMapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                We ship to most pin codes across India via our logistics partner Shiprocket. Enter your pincode in the Cart page to check delivery availability and rates before placing your order.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Important Notes</h2>
            <ul className="space-y-2 text-sm">
              {[
                'Orders are dispatched on business days (Monday–Saturday, excluding public holidays).',
                'Delivery timelines begin from the day of dispatch, not the day of order placement.',
                'Eptomart is not liable for delays caused by logistics partners, natural events, or incorrect address details provided by the buyer.',
                'For bulk or custom orders, shipping timelines may differ. Please contact us in advance.',
                'In case of a failed delivery attempt, our logistics partner will retry. After 3 failed attempts the parcel may be returned.',
              ].map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <FiAlertCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Contact Us</h2>
            <p className="text-sm">For any shipping-related queries, please reach us at <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a> or visit our <a href="/contact" className="text-primary-500 hover:underline">Contact page</a>.</p>
          </section>

          <p className="text-xs text-gray-400">Last updated: May 2025</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
