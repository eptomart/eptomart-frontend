// ============================================
// ADMIN — ENQUIRIES (Contact Form Submissions)
// ============================================
import React, { useState, useEffect } from 'react';
import {
  FiMessageSquare, FiMail, FiPhone, FiClock, FiCheckCircle,
  FiXCircle, FiRefreshCw, FiChevronDown, FiChevronUp, FiSend,
} from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  new:         { label: 'New',         cls: 'bg-orange-100 text-orange-700' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700'    },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700'  },
  closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-500'    },
};

export default function AdminEnquiries() {
  const [enquiries,    setEnquiries]    = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded,     setExpanded]     = useState(null);
  const [replyText,    setReplyText]    = useState('');
  const [replying,     setReplying]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/enquiries', {
        params: { status: filterStatus || undefined, limit: 50 },
      });
      setEnquiries(data.enquiries || []);
      setStatusCounts(data.statusCounts || {});
    } catch (_) {
      toast.error('Failed to load enquiries');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/settings/enquiries/${id}`, { status });
      setEnquiries(prev => prev.map(e => e._id === id ? { ...e, status } : e));
      toast.success('Status updated');
    } catch (_) { toast.error('Update failed'); }
  };

  const handleReply = async (enquiry) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await api.patch(`/settings/enquiries/${enquiry._id}`, {
        adminReply: replyText,
        status: 'resolved',
      });
      setEnquiries(prev => prev.map(e =>
        e._id === enquiry._id ? { ...e, adminReply: replyText, status: 'resolved' } : e
      ));
      setReplyText('');
      setExpanded(null);
      toast.success(enquiry.email ? 'Reply sent to customer' : 'Reply saved (no email on file)');
    } catch (_) { toast.error('Reply failed'); }
    finally { setReplying(false); }
  };

  const totalNew = statusCounts.new || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiMessageSquare className="text-primary-500" />
            Contact Enquiries
            {totalNew > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalNew} new</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Messages from the Contact Us form</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50 transition-colors">
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['', 'All'], ['new', 'New'], ['in_progress', 'In Progress'], ['resolved', 'Resolved'], ['closed', 'Closed']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filterStatus === val
                ? 'bg-primary-500 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            {val && statusCounts[val] ? ` (${statusCounts[val]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiMessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No enquiries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map(enq => {
            const cfg  = STATUS_CONFIG[enq.status] || STATUS_CONFIG.new;
            const open = expanded === enq._id;
            return (
              <div key={enq._id} className="card overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setExpanded(open ? null : enq._id)}
                  className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold text-sm">{enq.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{enq.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {enq.subject || 'General'} · {new Date(enq.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{enq.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {enq.email && <FiMail size={14} className="text-gray-400" />}
                    {enq.phone && <FiPhone size={14} className="text-gray-400" />}
                    {open ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {open && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    {/* Contact info */}
                    <div className="flex gap-4 text-sm flex-wrap">
                      {enq.email && (
                        <a href={`mailto:${enq.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          <FiMail size={13} /> {enq.email}
                        </a>
                      )}
                      {enq.phone && (
                        <a href={`tel:${enq.phone}`} className="flex items-center gap-1 text-green-600 hover:underline">
                          <FiPhone size={13} /> {enq.phone}
                        </a>
                      )}
                    </div>

                    {/* Full message */}
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {enq.message}
                    </div>

                    {/* Previous reply */}
                    {enq.adminReply && (
                      <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-1">Admin Reply (sent)</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{enq.adminReply}</p>
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="text-xs text-gray-500 font-medium">Change status:</span>
                      {Object.entries(STATUS_CONFIG).map(([val, { label, cls }]) => (
                        enq.status !== val && (
                          <button
                            key={val}
                            onClick={() => handleStatusChange(enq._id, val)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors hover:opacity-80 ${cls}`}
                          >
                            {label}
                          </button>
                        )
                      ))}
                    </div>

                    {/* Reply box */}
                    {enq.email && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600">
                          Reply to {enq.email}
                        </label>
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="input-field resize-none text-sm w-full"
                          placeholder="Type your reply..."
                        />
                        <button
                          onClick={() => handleReply(enq)}
                          disabled={replying || !replyText.trim()}
                          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <FiSend size={14} />
                          {replying ? 'Sending...' : 'Send Reply & Mark Resolved'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
