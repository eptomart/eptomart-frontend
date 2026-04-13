// ============================================
// ORDER TRACKING TIMELINE COMPONENT
// ============================================
import React from 'react';
import { FiCheckCircle, FiCircle, FiPackage, FiTruck, FiHome, FiX } from 'react-icons/fi';
import { formatDate } from '../../utils/currency';

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: FiCheckCircle, desc: 'We received your order' },
  { key: 'confirmed', label: 'Confirmed', icon: FiCheckCircle, desc: 'Order confirmed & payment verified' },
  { key: 'processing', label: 'Processing', icon: FiPackage, desc: 'Your items are being packed' },
  { key: 'shipped', label: 'Shipped', icon: FiTruck, desc: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered', icon: FiHome, desc: 'Package delivered successfully!' },
];

const STATUS_ORDER = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderTrackingTimeline({ order }) {
  if (!order) return null;

  const isCancelled = order.orderStatus === 'cancelled';
  const currentIndex = STATUS_ORDER.indexOf(order.orderStatus);

  const getStepStatus = (stepKey) => {
    if (isCancelled) return 'cancelled';
    const stepIndex = STATUS_ORDER.indexOf(stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Find timestamp for each status from history
  const getStepTime = (stepKey) => {
    const histEntry = order.statusHistory?.find(h => h.status === stepKey);
    return histEntry?.timestamp;
  };

  return (
    <div className="p-4">
      {isCancelled ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
          <FiX size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Order Cancelled</p>
            <p className="text-sm text-red-500">
              {order.statusHistory?.find(h => h.status === 'cancelled')?.note || 'This order was cancelled.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {TIMELINE_STEPS.map((step, index) => {
            const status = getStepStatus(step.key);
            const time = getStepTime(step.key);
            const Icon = step.icon;
            const isLast = index === TIMELINE_STEPS.length - 1;

            return (
              <div key={step.key} className="flex gap-4">
                {/* Icon + connector line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${status === 'completed' ? 'bg-green-500 text-white' :
                      status === 'current' ? 'bg-primary-500 text-white ring-4 ring-primary-100' :
                      'bg-gray-100 text-gray-300'}`}>
                    <Icon size={16} />
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 min-h-[2rem] transition-colors
                      ${status === 'completed' ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-semibold text-sm
                        ${status === 'completed' ? 'text-green-700' :
                          status === 'current' ? 'text-primary-700' :
                          'text-gray-400'}`}>
                        {step.label}
                        {status === 'current' && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
                            Current
                          </span>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 ${status !== 'pending' ? 'text-gray-500' : 'text-gray-300'}`}>
                        {step.desc}
                      </p>
                    </div>
                    {time && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatDate(time)}
                      </span>
                    )}
                  </div>

                  {/* Tracking number */}
                  {step.key === 'shipped' && order.trackingNumber && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5 text-xs">
                      <FiTruck size={12} />
                      <span>Tracking: <span className="font-mono font-bold">{order.trackingNumber}</span></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
