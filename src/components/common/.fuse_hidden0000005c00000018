// ============================================
// LOADER — Skeleton & Spinner Components
// ============================================
import React from 'react';
import EptomartLogo from './EptomartLogo';

export default function Loader({ fullPage = true }) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:'#0B1729'}}>
        <div className="flex flex-col items-center gap-6">
          <EptomartLogo height={80} />
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{ background: '#f4941c', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// Product card skeleton
export function ProductSkeleton() {
  return (
    <div className="card p-3">
      <div className="skeleton w-full aspect-square mb-3" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2 mb-3" />
      <div className="skeleton h-9 w-full rounded-xl" />
    </div>
  );
}

// Grid of skeletons
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array(count).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
    </div>
  );
}
