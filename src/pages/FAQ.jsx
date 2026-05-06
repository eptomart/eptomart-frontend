// ============================================
// FAQ PAGE
// ============================================
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FAQS = [
  {
    q: 'How do I place an order on Eptomart?',
    a: 'Browse our shop, add products to your cart, and proceed to checkout. You can pay online via Razorpay (UPI, cards, net banking) or choose Cash on Delivery (COD) where available.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, debit/credit cards, net banking through Razorpay, and Cash on Delivery (COD). COD may not be available for all products or pincodes.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Most orders are delivered within 1–5 business days depending on your location. We use Shiprocket-powered logistics for reliable, trackable delivery across India.',
  },
  {
    q: 'Is there free shipping?',
    a: 'Yes! Orders above ₹1,499 (inclusive of GST) qualify for free shipping. For orders below that, shipping charges are calculated based on your pincode and order weight.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'You can cancel orders that are in "Placed" or "Confirmed" status from your Orders page. Once an order is shipped, cancellation is not possible — you may initiate a return instead.',
  },
  {
    q: 'How do refunds work?',
    a: 'If you cancel an eligible online-paid order, a refund is automatically initiated to your original payment method within 5–7 business days. COD orders are not eligible for automatic refunds.',
  },
  {
    q: 'How do I return a product?',
    a: 'Contact us within 7 days of delivery via the Contact Us page. Our team will guide you through the return process. Products must be unused, in original packaging.',
  },
  {
    q: 'Are the products genuine?',
    a: 'Yes. All sellers on Eptomart are verified and onboarded manually by our team. Every product undergoes an approval process before going live on the platform.',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Once your order is shipped, you can track it from the My Orders page. Click "Track Order" to see the live delivery timeline.',
  },
  {
    q: 'Do I get a GST invoice?',
    a: 'Yes. A full GST-compliant tax invoice is generated for every order. You can view and download it from the My Orders page once your order is processed.',
  },
  {
    q: 'How do I contact customer support?',
    a: 'Visit our Contact Us page or email us at eptosicare@gmail.com. We respond within 24 hours on business days.',
  },
  {
    q: 'How do I become a seller on Eptomart?',
    a: 'Visit the Sell With Us page and complete your seller registration. Our team will review your application and onboard you after verification.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 pr-4">{q}</span>
        {open ? <FiChevronUp size={16} className="text-primary-500 flex-shrink-0" /> : <FiChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <>
      <Helmet>
        <title>FAQ — Eptomart</title>
        <meta name="description" content="Frequently asked questions about ordering, payment, delivery, returns, and more on Eptomart." />
      </Helmet>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-500">Everything you need to know about shopping on Eptomart.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="mt-12 text-center bg-orange-50 rounded-2xl p-8">
          <p className="text-gray-700 font-medium mb-2">Still have questions?</p>
          <p className="text-gray-500 text-sm mb-4">Our support team is happy to help.</p>
          <a href="/contact" className="btn-primary inline-block">Contact Us</a>
        </div>
      </main>

      <Footer />
    </>
  );
}
