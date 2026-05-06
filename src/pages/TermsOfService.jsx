// ============================================
// TERMS OF SERVICE PAGE
// ============================================
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FiFileText } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Eptomart</title>
        <meta name="description" content="Eptomart's Terms of Service — rules and guidelines for using our platform." />
      </Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-2xl mb-4">
            <FiFileText size={28} className="text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500">Please read these terms carefully before using Eptomart.</p>
        </div>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Eptomart (www.eptomart.com), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our platform. These terms are governed by Indian law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Platform Overview</h2>
            <p>Eptomart is an online marketplace operated by Eptosi Group of Companies. We facilitate transactions between buyers and verified third-party sellers. Eptomart is not the seller of record for all products; individual sellers are responsible for their listings and fulfilment.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>Eptomart reserves the right to suspend or terminate accounts for violations of these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">4. Orders and Payments</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>All prices are listed in Indian Rupees (INR) and include applicable GST.</li>
              <li>Placing an order constitutes an offer to purchase — the contract is formed when the seller confirms the order.</li>
              <li>Eptomart reserves the right to cancel orders in cases of pricing errors, stock unavailability, or suspected fraud.</li>
              <li>Payments are processed securely by Razorpay. Eptomart does not store card or banking credentials.</li>
              <li>Cash on Delivery (COD) is available at seller discretion and may not apply to all products or locations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">5. Delivery</h2>
            <p>Delivery timelines are estimates and not guarantees. Eptomart and its logistics partners strive to meet stated timelines but are not liable for delays due to events beyond reasonable control including logistics issues, public holidays, or natural events. Risk of loss passes to the buyer upon delivery.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">6. Returns and Refunds</h2>
            <p>Returns and refunds are subject to our <a href="/return-policy" className="text-primary-500 hover:underline">Return Policy</a>. Sellers may have additional return conditions stated on their product listings. Eptomart will facilitate refunds for eligible returns as per the stated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">7. Prohibited Conduct</h2>
            <p className="mb-2">When using Eptomart, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Post false, misleading, or fraudulent information.</li>
              <li>Attempt to circumvent security measures or gain unauthorised access.</li>
              <li>Use the platform for any illegal activity under Indian law.</li>
              <li>Misuse refund or return policies (e.g., returning used items as defective).</li>
              <li>Interfere with the proper functioning of the platform.</li>
              <li>Use automated tools, bots, or scraping without written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">8. Seller Conduct</h2>
            <p>Sellers on Eptomart must comply with all applicable Indian laws including Consumer Protection Act 2019, GST regulations, and the Information Technology Act 2000. Sellers are responsible for the accuracy of their product listings, timely fulfilment, and genuine representation of products.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">9. Intellectual Property</h2>
            <p>All content on Eptomart including logos, design, text, and software is the property of Eptosi Group of Companies or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Eptomart and Eptosi Group shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability to you for any claim shall not exceed the amount you paid for the relevant order.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">11. Governing Law & Disputes</h2>
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Chennai, Tamil Nadu. We encourage you to contact us first to resolve issues amicably before pursuing legal action.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">12. Changes to Terms</h2>
            <p>Eptomart reserves the right to update these Terms at any time. Changes will be posted on this page. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-2">13. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:eptosicare@gmail.com" className="text-primary-500 hover:underline">eptosicare@gmail.com</a> or visit our <a href="/contact" className="text-primary-500 hover:underline">Contact page</a>.</p>
          </section>

          <p className="text-xs text-gray-400">Last updated: May 2025</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
