// ============================================
// SEO LANDING PAGE — /wholesale-chennai
// Purpose-built to rank for "wholesale in Chennai",
// "wholesale market Chennai", "wholesale vegetables/
// fruits Chennai". Content-rich, FAQ rich-snippets,
// heavy internal links into Koyambedu Daily.
// ============================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiCheckCircle, FiTruck, FiClock, FiTag } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const BASE = 'https://www.eptomart.com';

const FAQS = [
  {
    q: 'Where can I buy wholesale vegetables and fruits in Chennai?',
    a: 'Eptomart\'s Koyambedu Daily lets you buy wholesale vegetables and fruits online at Koyambedu Market prices — Asia\'s largest perishables wholesale market — with home and business delivery across Chennai. No need to visit the market at 4 AM.',
  },
  {
    q: 'Are the prices really wholesale rates?',
    a: 'Yes. Prices are updated every day directly from Koyambedu Market vendors. You see the same daily wholesale rates the market trades at, with quality grades (Premium / Standard) to choose from.',
  },
  {
    q: 'What is the minimum order for wholesale delivery in Chennai?',
    a: 'Koyambedu Daily orders start from ₹1,500 — suited to hotels, restaurants, caterers, mess kitchens, vegetable shops and large families buying in bulk.',
  },
  {
    q: 'Which areas of Chennai do you deliver to?',
    a: 'We deliver across Chennai with same-day and next-day slots (7 AM – 4 PM). Enter your location in the app to confirm delivery availability and charges for your area.',
  },
  {
    q: 'What can I buy wholesale on Eptomart?',
    a: 'Vegetables, fruits, leafy greens, coconuts, banana leaves, flowers and pooja items from 2,000+ verified Koyambedu vendors — plus groceries, and soon farm-direct produce (Farmer Fresh) and fresh meat & seafood (Proteins).',
  },
  {
    q: 'Do you provide GST invoices for bulk purchases?',
    a: 'Yes. Every order gets a proforma invoice at placement and a final GST tax invoice after delivery — ideal for hotels, restaurants and businesses that need proper billing.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${BASE}/wholesale-chennai`,
      url: `${BASE}/wholesale-chennai`,
      name: 'Wholesale Market in Chennai — Order Online from Koyambedu | Eptomart',
      description: 'Buy wholesale vegetables, fruits, greens and flowers in Chennai at Koyambedu Market prices. Daily wholesale rates, bulk quantities, GST invoices, same-day delivery.',
      inLanguage: 'en-IN',
      isPartOf: { '@id': `${BASE}/#website` },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Wholesale Chennai', item: `${BASE}/wholesale-chennai` },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'GroceryStore',
      name: 'Eptomart — Koyambedu Daily Wholesale',
      description: 'Wholesale vegetables, fruits, greens and flowers at Koyambedu Market prices, delivered across Chennai.',
      url: `${BASE}/koyambedu`,
      priceRange: '₹₹',
      areaServed: { '@type': 'City', name: 'Chennai', sameAs: 'https://www.wikidata.org/wiki/Q1352' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Chennai',
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN',
      },
    },
  ],
};

const CATEGORIES = [
  { emoji: '🥦', name: 'Wholesale Vegetables', desc: 'Onions, tomatoes, potatoes, brinjal, carrots & 300+ varieties at daily market rates.' },
  { emoji: '🍊', name: 'Wholesale Fruits', desc: 'Bananas, mangoes, apples, seasonal fruits — crate and bulk quantities.' },
  { emoji: '🌿', name: 'Leafy Greens', desc: 'Keerai varieties, coriander, curry leaves, mint — picked fresh each morning.' },
  { emoji: '🌸', name: 'Flowers & Pooja', desc: 'Loose flowers, garlands, banana leaves and pooja items for functions & events.' },
];

const BUYERS = [
  'Hotels & Restaurants', 'Caterers & Event Planners', 'Mess & Canteen Kitchens',
  'Vegetable Shops & Resellers', 'Supermarkets', 'Apartments & Large Families',
];

export default function WholesaleChennai() {
  return (
    <>
      <Helmet>
        <title>Wholesale Market in Chennai — Order Online from Koyambedu | Eptomart</title>
        <meta name="description" content="Buy wholesale in Chennai without visiting the market: vegetables, fruits, greens & flowers at Koyambedu Market daily wholesale prices. Bulk quantities, GST invoices, same-day & next-day delivery." />
        <meta name="keywords" content="wholesale in chennai, wholesale market chennai, wholesale vegetables chennai, wholesale fruits chennai, koyambedu wholesale market, bulk vegetables chennai, wholesale price vegetables, chennai mandi rates" />
        <link rel="canonical" href={`${BASE}/wholesale-chennai`} />
        <meta property="og:title" content="Wholesale Market in Chennai — Order Online from Koyambedu" />
        <meta property="og:description" content="Koyambedu Market wholesale prices, delivered across Chennai. Vegetables, fruits, greens & flowers in bulk with GST invoices." />
        <meta property="og:url" content={`${BASE}/wholesale-chennai`} />
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Chennai" />
        <meta name="geo.position" content="13.0748;80.2136" />
        <meta name="ICBM" content="13.0748, 80.2136" />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>
      <Navbar />

      <main className="min-h-screen bg-[#f5f5f7]">
        {/* ── Hero ── */}
        <section className="px-4 pt-10 pb-8 text-center max-w-3xl mx-auto">
          <p className="text-[11px] font-black tracking-widest uppercase text-emerald-600 mb-2">
            Koyambedu Market · Asia's Largest Wholesale Market
          </p>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
            Wholesale Market in Chennai,<br className="hidden md:block" /> Delivered to Your Door
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-3 leading-relaxed">
            Buy <strong>wholesale vegetables, fruits, greens and flowers in Chennai</strong> at real
            Koyambedu Market rates — updated daily, sourced from 2,000+ verified vendors,
            delivered same-day or next-day across the city. Skip the 4 AM market trip.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Link to="/koyambedu"
              className="btn-primary text-sm inline-flex items-center gap-2">
              Shop Wholesale Now <FiArrowRight size={14} />
            </Link>
            <Link to="/koyambedu/shop" className="text-sm font-bold text-emerald-700 underline underline-offset-4">
              See today's prices
            </Link>
          </div>
        </section>

        {/* ── Why wholesale on Eptomart ── */}
        <section className="px-4 pb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { Icon: FiTag,         t: 'Daily Wholesale Rates', d: 'Prices refreshed every morning from the market floor.' },
              { Icon: FiTruck,       t: 'Chennai-wide Delivery', d: 'Same-day & next-day slots, 7 AM – 4 PM.' },
              { Icon: FiCheckCircle, t: 'GST Invoices',          d: 'Proforma + final tax invoice on every order.' },
              { Icon: FiClock,       t: 'Order by Night',        d: 'Order before midnight for next-morning delivery.' },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="card p-4 text-center">
                <Icon size={20} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-black text-gray-800">{t}</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What you can buy ── */}
        <section className="px-4 pb-8 max-w-4xl mx-auto">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">What You Can Buy Wholesale in Chennai</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {CATEGORIES.map(c => (
              <Link key={c.name} to="/koyambedu/shop" className="card p-4 flex gap-3 items-start hover:border-emerald-300">
                <span className="text-2xl">{c.emoji}</span>
                <span>
                  <p className="text-sm font-black text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Who buys ── */}
        <section className="px-4 pb-8 max-w-4xl mx-auto">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">Built for Chennai's Bulk Buyers</h2>
          <div className="flex flex-wrap gap-2">
            {BUYERS.map(b => (
              <span key={b} className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
                {b}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            Whether you run a restaurant in T. Nagar, a mess in Velachery, a vegetable shop in
            Tambaram or cater weddings across Chennai — Eptomart brings the Koyambedu wholesale
            market to your phone, with quality grades, transparent daily pricing and doorstep delivery.
          </p>
        </section>

        {/* ── FAQ (matches FAQPage schema) ── */}
        <section className="px-4 pb-12 max-w-3xl mx-auto">
          <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">Wholesale in Chennai — FAQs</h2>
          <div className="space-y-2">
            {FAQS.map(f => (
              <details key={f.q} className="card p-4 group">
                <summary className="text-sm font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-emerald-600 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/koyambedu" className="btn-primary text-sm inline-flex items-center gap-2">
              Start Buying Wholesale <FiArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
