// ============================================
// ADMIN — ACTIVITY LOG
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/currency';

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  'order.status_updated': 'bg-blue-50 text-blue-800 border-blue-200',
  'order.packaging_reviewed': 'bg-purple-50 text-purple-800 border-purple-200',
  'order.shipment_created': 'bg-green-50 text-green-800 border-green-200',
  'user.status_toggled': 'bg-orange-50 text-orange-800 border-orange-200',
  'seller.status_changed': 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const ENTITY_COLORS = {
  order: 'bg-blue-100 text-blue-800',
  user: 'bg-orange-100 text-orange-800',
  seller: 'bg-indigo-100 text-indigo-800',
  product: 'bg-green-100 text-green-800',
  category: 'bg-purple-100 text-purple-800',
};

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  const [entityFilter, setEntityFilter] = useState('');
  const [searchActor, setSearchActor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit,
      });
      if (entityFilter) params.append('entity', entityFilter);
      if (searchActor) params.append('actor', searchActor);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { data } = await api.get(`/activity?${params.toString()}`);
      setLogs(data.logs || []);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [entityFilter, searchActor, startDate, endDate, limit]);

  const getActionLabel = (action) => {
    const labels = {
      'order.status_updated': 'Order Status Updated',
      'order.packaging_reviewed': 'Packaging Reviewed',
      'order.shipment_created': 'Shipment Created',
      'user.status_toggled': 'User Status Toggled',
      'seller.status_changed': 'Seller Status Changed',
    };
    return labels[action] || action;
  };

  const formatDetails = (details) => {
    if (!details || typeof details !== 'object') return '';
    const parts = [];
    if (details.from && details.to) {
      parts.push(`${details.from} → ${details.to}`);
    }
    if (details.note) {
      parts.push(`Note: ${details.note}`);
    }
    if (details.awb) {
      parts.push(`AWB: ${details.awb}`);
    }
    if (details.courier) {
      parts.push(`Courier: ${details.courier}`);
    }
    if (details.action) {
      parts.push(`Action: ${details.action}`);
    }
    return parts.join(' • ');
  };

  return (
    <>
      <Helmet><title>Activity Log — Eptomart Admin</title></Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Activity Log</h1>
          <button
            onClick={() => fetchLogs(1)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Entity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="order">Order</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </select>
          </div>

          {/* Actor Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Name</label>
            <input
              type="text"
              placeholder="Search admin..."
              value={searchActor}
              onChange={(e) => {
                setSearchActor(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Activity Timeline */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <FiFilter className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No activities found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log._id}
                className={`p-4 border rounded-lg transition-all ${ACTION_COLORS[log.action] || 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header: Action, Entity, Admin */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{getActionLabel(log.action)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${ENTITY_COLORS[log.entity] || 'bg-gray-100 text-gray-800'}`}>
                        {log.entity}
                      </span>
                      <span className="text-xs text-gray-600">by {log.actor?.name || 'Unknown'}</span>
                    </div>

                    {/* Entity Label */}
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {log.entityLabel}
                    </div>

                    {/* Details */}
                    {formatDetails(log.details) && (
                      <div className="text-xs text-gray-700 mb-2">
                        {formatDetails(log.details)}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-gray-600 space-x-2">
                      <span>{formatDate(new Date(log.createdAt))}</span>
                      <span>{formatTime(new Date(log.createdAt))}</span>
                    </div>
                  </div>

                  {/* IP Address */}
                  {log.ip && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">IP</p>
                      <p className="text-xs font-mono text-gray-700">{log.ip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => fetchLogs(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
