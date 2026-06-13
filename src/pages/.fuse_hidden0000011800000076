import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrash2, FiAlertTriangle, FiMail, FiCheckCircle } from 'react-icons/fi';

export default function DeleteAccount() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', reason: '', confirm: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.confirm) return;
    setLoading(true);
    try {
      await fetch('/api/auth/request-delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, reason: form.reason }),
      });
    } catch (_) {}
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <FiTrash2 size={28} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Delete Your Eptomart Account</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Request permanent deletion of your account and all associated data
          </p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <FiCheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Request Received</h2>
            <p className="text-gray-600 text-sm mb-4">
              We've received your account deletion request. Our team will process it within <strong>7 business days</strong> and send a confirmation to your email address.
            </p>
            <p className="text-gray-500 text-xs">
              If you have any questions, contact us at{' '}
              <a href="mailto:support@eptomart.com" className="text-orange-500 font-medium">
                support@eptomart.com
              </a>
            </p>
            <Link to="/" className="mt-6 inline-block bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            {/* What gets deleted */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <FiAlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-700 mb-2">What will be deleted</h3>
                  <ul className="text-sm text-red-600 space-y-1">
                    <li>• Your profile (name, email, phone number)</li>
                    <li>• Saved addresses and preferences</li>
                    <li>• Wishlist and saved items</li>
                    <li>• Account login credentials</li>
                  </ul>
                  <h3 className="font-semibold text-orange-700 mt-3 mb-2">What will be retained</h3>
                  <ul className="text-sm text-orange-600 space-y-1">
                    <li>• Order history — retained for <strong>7 years</strong> for GST/tax compliance</li>
                    <li>• Invoices and transaction records — retained for legal and financial audits</li>
                    <li>• Seller settlement records (if you were a seller)</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3">
                    Retained data is anonymised where possible and kept only as required by Indian tax law (GST Act) and RBI regulations.
                  </p>
                </div>
              </div>
            </div>

            {/* How to delete from app */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiMail size={18} className="text-orange-500" />
                How to delete your account
              </h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li><span className="font-semibold text-gray-700">Option 1 — From the app:</span> Go to <strong>Profile → Settings → Delete Account</strong> and follow the on-screen steps.</li>
                <li><span className="font-semibold text-gray-700">Option 2 — Use the form below:</span> Fill in your details and submit a request. We'll confirm via email within 7 business days.</li>
                <li><span className="font-semibold text-gray-700">Option 3 — Email us:</span> Write to <a href="mailto:support@eptomart.com" className="text-orange-500 font-medium">support@eptomart.com</a> from your registered email address with subject <em>"Account Deletion Request"</em>.</li>
              </ol>
            </div>

            {/* Request form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Submit Deletion Request</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Your registered name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us why you're leaving..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-red-500"
                  />
                  <span className="text-sm text-gray-600">
                    I understand that this action is <strong>permanent</strong> and cannot be undone. My profile, addresses, and wishlist will be deleted. Order history will be retained for compliance purposes.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!form.confirm || loading}
                  className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit Deletion Request'}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Changed your mind?{' '}
              <Link to="/" className="text-orange-500 font-medium">Go back to Eptomart</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
