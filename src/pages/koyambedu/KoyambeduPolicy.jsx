// ============================================
// KOYAMBEDU DAILY — Policy Page
// Covers: cancellation, price revision, declined items,
//         refunds, delivery, platform fee, GST, quality.
// ============================================
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertCircle, FiRefreshCw, FiXCircle, FiTruck, FiDollarSign, FiCheckCircle, FiPhone } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import BottomNav from '../../components/common/BottomNav';

const Section = ({ icon: Icon, title, color = 'green', children }) => {
  const colours = {
    green:  { bg: 'bg-green-50',  border: 'border-green-200', icon: 'text-green-600',  heading: 'text-green-900' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200', icon: 'text-amber-600',  heading: 'text-amber-900' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'text-blue-600',   heading: 'text-blue-900'  },
    red:    { bg: 'bg-red-50',    border: 'border-red-200',   icon: 'text-red-600',    heading: 'text-red-900'   },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200',icon: 'text-purple-600', heading: 'text-purple-900'},
  };
  const c = colours[color] || colours.green;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={c.icon} />
        <h2 className={`font-bold text-sm ${c.heading}`}>{title}</h2>
      </div>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className="text-gray-800 text-xs font-medium text-right">{value}</span>
  </div>
);

export default function KoyambeduPolicy() {
  return (
    <>
      <Helmet>
        <title>Policies — Koyambedu Daily</title>
        <meta name="description" content="Koyambedu Daily ordering, cancellation, refund, delivery, and quality policies." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 pb-24">

        {/* Header */}
        <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 60%,#059669 100%)' }}>
          <Link to="/koyambedu" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </Link>
          <div>
            <p className="text-white font-black text-sm">Koyambedu Daily</p>
            <p className="text-emerald-200 text-xs">Policies &amp; Guidelines</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-3">

          {/* Intro blurb */}
          <p className="text-xs text-gray-500 leading-relaxed px-1">
            Koyambedu Daily connects you directly with wholesale traders at Koyambedu market. Because orders are sourced fresh each morning, our policies differ from standard e-commerce — please read them carefully before ordering.
          </p>

          {/* 1 — Order Cancellation */}
          <Section icon={FiXCircle} title="Order Cancellation" color="red">
            <p>Orders can be cancelled <strong>only before 1:00 AM on the delivery day</strong>. After this time, procurement from the market has already begun and cancellations are not possible.</p>
            <div className="bg-red-100 rounded-xl p-3 mt-2">
              <p className="text-xs font-semibold text-red-800 mb-1">To cancel, contact our Help Desk:</p>
              <a href="tel:+919514519518" className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <FiPhone size={14} /> +91 95145 19518
              </a>
              <p className="text-[11px] text-red-600 mt-1">Available 9 PM – 1 AM (day before delivery)</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Cancellations made before the deadline receive a full refund to your Eptomart Wallet within minutes.</p>
          </Section>

          {/* 2 — Price Revision */}
          <Section icon={FiRefreshCw} title="Price Revision" color="amber">
            <p>Prices shown at the time of ordering are <strong>market estimates</strong>. Because Koyambedu wholesale rates fluctuate daily, final prices are confirmed by the market on the morning of delivery.</p>
            <div className="bg-white rounded-xl p-3 mt-2 space-y-1">
              <Row label="Price goes down" value="Difference credited to your Wallet" />
              <Row label="Price goes up (minor)" value="Extra amount debited from your Wallet" />
              <Row label="Price goes up significantly" value="You will be notified to approve" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Price adjustments are reflected in your order detail and a revised invoice is generated automatically.</p>
          </Section>

          {/* 3 — Declined Items */}
          <Section icon={FiAlertCircle} title="Declined / Unfulfilled Items" color="amber">
            <p>In rare cases, a product may be unavailable at the market on the day of delivery. When this happens:</p>
            <ul className="space-y-1 mt-1">
              {[
                'The item is marked as Declined in your order.',
                'The full amount for that item is refunded to your Eptomart Wallet.',
                'All other items in your order are delivered as normal.',
              ].map((t, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="text-amber-500 font-bold shrink-0">·</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-500 mt-2">Partial quantities may also be reduced — the difference is refunded accordingly.</p>
          </Section>

          {/* 4 — Refunds */}
          <Section icon={FiCheckCircle} title="Refunds &amp; Wallet" color="blue">
            <p>All refunds for Koyambedu Daily orders (cancellations, declined items, price adjustments) are credited to your <strong>Eptomart Wallet</strong>.</p>
            <div className="bg-white rounded-xl p-3 mt-2 space-y-1">
              <Row label="Cancellation refund" value="Instant (within minutes)" />
              <Row label="Declined item refund" value="Same day as delivery" />
              <Row label="Price revision credit" value="Morning of delivery" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Wallet balance can be used on any future Koyambedu Daily order. Wallet-to-bank withdrawal can be requested from the Wallet page.</p>
          </Section>

          {/* 5 — Delivery */}
          <Section icon={FiTruck} title="Delivery" color="green">
            <p>Orders are delivered to your pinned location in the <strong>early morning</strong>. Delivery timing depends on your distance from Koyambedu market.</p>
            <div className="bg-white rounded-xl p-3 mt-2 space-y-1">
              <Row label="Delivery slots" value="Slot 1 · Slot 2 · Slot 3 · Slot 4" />
              <Row label="Delivery area" value="Chennai &amp; nearby areas" />
              <Row label="Delivery charge" value="Distance-based (shown at checkout)" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Your exact address is never shared with sellers — only your area name is visible to them.</p>
          </Section>

          {/* 6 — Platform Fee & GST */}
          <Section icon={FiDollarSign} title="Platform Fee &amp; GST" color="purple">
            <div className="bg-white rounded-xl p-3 space-y-1">
              <Row label="Platform fee" value="₹15 per order" />
              <Row label="GST on platform fee" value="18% (included in ₹15, SAC 9985)" />
              <Row label="GST on fresh produce" value="0% — Exempt under Indian GST law" />
              <Row label="GSTIN" value="33IFLPS7086Q1Z6" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Fresh vegetables, fruits, flowers, and produce are exempt from GST under Chapter 7 &amp; 8, Notification No. 2/2017-Central Tax (Rate). The ₹15 platform fee includes all applicable GST — you are not charged any additional tax.
            </p>
          </Section>

          {/* 7 — Quality */}
          <Section icon={FiCheckCircle} title="Quality Guarantee" color="green">
            <p>All produce is sourced directly from licensed traders at Koyambedu Wholesale Market — Asia's largest fruits &amp; vegetables market. Quality is inspected at the source.</p>
            <p className="mt-1">If you receive damaged or sub-standard produce, contact us at <a href="tel:+919514519518" className="text-green-700 font-semibold">+91 95145 19518</a> or email <a href="mailto:support@eptomart.com" className="text-green-700 font-semibold">support@eptomart.com</a> within 2 hours of delivery.</p>
            <p className="text-[11px] text-gray-500 mt-2">Note: Fresh produce cannot be returned after acceptance. Quality complaints must be raised with photo evidence immediately upon delivery.</p>
          </Section>

          {/* Contact */}
          <div className="bg-gray-800 rounded-2xl p-4 text-center">
            <p className="text-white font-bold text-sm mb-1">Need Help?</p>
            <p className="text-gray-400 text-xs mb-3">Our team is available to assist with your orders.</p>
            <a href="tel:+919514519518"
              className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              <FiPhone size={14} /> Call +91 95145 19518
            </a>
            <p className="text-gray-500 text-[11px] mt-2">Or email: support@eptomart.com</p>
          </div>

          <p className="text-[10px] text-gray-400 text-center pb-2">Last updated: July 2026</p>

        </div>

        <BottomNav />
      </div>
    </>
  );
}
