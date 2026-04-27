// ============================================
// ABOUT PAGE
// ============================================
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FiShield, FiPackage, FiTruck, FiStar, FiUsers, FiFileText } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const PILLARS = [
  { icon: FiShield,   title: 'Trusted Quality',     desc: 'Every product on Eptomart is verified and meets our quality standards before going live.' },
  { icon: FiFileText, title: 'Transparent Billing',  desc: 'Full GST invoices on every order — no hidden charges, complete billing clarity.' },
  { icon: FiTruck,    title: 'Reliable Delivery',    desc: 'Powered by Shiprocket logistics for fast, trackable delivery across India.' },
  { icon: FiStar,     title: 'Premium Experience',   desc: 'Curated products, seamless checkout, and instant Razorpay payments.' },
  { icon: FiPackage,  title: 'Multi-Seller Platform', desc: 'Trusted sellers vetted and onboarded by Eptomart — quality controlled at every step.' },
  { icon: FiUsers,    title: 'Eptosi Group',          desc: 'Eptomart is a product of Eptosi Group of Companies, dedicated to building trusted digital commerce.' },
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us — Eptomart</title>
        <meta name="description" content="Eptomart is a premium quality-focused ecommerce platform from Eptosi Group of Companies. Trusted products, reliable service, transparent billing." />
      </Helmet>
      <Navbar />

      <main>
        {/* Hero */}
        <section style={{ background: '#0B1729' }} className="py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              About <span style={{ color: '#F4941C' }}>Eptomart</span>
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              Eptomart is a premium quality-focused ecommerce platform from <strong className="text-white">Eptosi Group of Companies</strong>.
              We bring trusted products with reliable service and transparent billing.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              To make quality commerce accessible to every Indian household — with fully transparent pricing,
              GST-compliant invoicing, and a curated selection of genuine products from verified sellers.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">What Sets Us Apart</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PILLARS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-primary-500" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brand statement */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #0B1729 0%, #0F2236 100%)' }}>
              <h2 className="text-2xl font-bold text-white mb-4">The Eptomart Promise</h2>
              <p className="text-gray-300 leading-relaxed">
                Every product listed on Eptomart comes with our promise of authenticity.
                Our sellers are vetted, our billing is transparent, and our support is real.
                Whether you're shopping for essentials or specialty items — you're in trusted hands.
              </p>
              <div className="flex gap-4 justify-center mt-8">
                <Link to="/shop" className="btn-primary">Shop Now</Link>
                <Link to="/contact" className="px-6 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-sm font-medium">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
