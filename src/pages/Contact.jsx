// ============================================
// CONTACT PAGE
// ============================================
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { BUSINESS } from '../utils/businessInfo';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.message) return toast.error('Name and message are required');
    setSending(true);
    // Simulate send — wire to a backend endpoint or EmailJS when ready
    await new Promise(r => setTimeout(r, 800));
    toast.success('Message sent! We\'ll reply within 24 hours.');
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us — Eptomart</title>
        <meta name="description" content="Get in touch with Eptomart. We're here to help with orders, seller queries, and support." />
      </Helmet>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Contact Us</h1>
          <p className="text-gray-500">We're here to help. Reach out anytime.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Business Info */}
          <div className="space-y-5">
            <div className="card p-6">
              <h2 className="font-bold text-gray-800 mb-4 text-lg">Get In Touch</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Address</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{BUSINESS.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiPhone size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Phone</p>
                    <a href={`tel:${BUSINESS.phone}`} className="text-sm text-gray-700 hover:text-primary-500 transition-colors">
                      {BUSINESS.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiMail size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                    <a href={`mailto:${BUSINESS.email}`} className="text-sm text-gray-700 hover:text-primary-500 transition-colors">
                      {BUSINESS.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiClock size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Support Hours</p>
                    <p className="text-sm text-gray-700">Mon – Sat: 9 AM – 7 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder — replace with actual Google Maps embed if needed */}
            <div className="card overflow-hidden">
              <iframe
                title="Eptomart Location"
                src="https://maps.google.com/maps?q=Maduravoyal,Chennai,Tamil+Nadu&output=embed"
                className="w-full h-48 border-0"
                loading="lazy"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="font-bold text-gray-800 mb-5 text-lg">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="Your full name" className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                      placeholder="you@example.com" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                      placeholder="+91 98765 43210" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <select value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className="input-field">
                      <option value="">Select a topic</option>
                      <option>Order Issue</option>
                      <option>Payment Problem</option>
                      <option>Seller Query</option>
                      <option>Product Question</option>
                      <option>Return & Refund</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
                    rows={5} placeholder="Describe your query in detail..." className="input-field resize-none" required />
                </div>
                <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2">
                  <FiSend size={15} />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              <div className="mt-6 p-4 bg-orange-50 rounded-xl text-sm text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">For Seller Inquiries</p>
                <p>Contact our admin team to become a seller on Eptomart. We'll set up your account and help you get started.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
