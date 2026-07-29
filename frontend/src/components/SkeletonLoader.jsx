import React from 'react';

// Single shimmering card skeleton
export const CardSkeleton = () => {
  return (
    <div className="glass rounded-3xl p-5 border border-gray-800 bg-gray-900/40 animate-pulse light-theme:bg-gray-150/40 light-theme:border-gray-200">
      <div className="flex justify-between items-center">
        <div className="space-y-2.5 w-2/3">
          <div className="h-3 w-1/2 bg-gray-800 rounded-md light-theme:bg-gray-300" />
          <div className="h-7 w-4/5 bg-gray-800 rounded-lg light-theme:bg-gray-300" />
        </div>
        <div className="h-12 w-12 rounded-2xl bg-gray-800 light-theme:bg-gray-300" />
      </div>
    </div>
  );
};

// Shimmering Table loader skeleton
export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="glass rounded-3xl p-6 border border-gray-800 bg-gray-900/20 animate-pulse light-theme:bg-gray-150/20 light-theme:border-gray-200">
      <div className="h-5 w-40 bg-gray-800 rounded-md mb-6 light-theme:bg-gray-300" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5 border-b border-gray-800/40 light-theme:border-gray-200">
            <div className="space-y-1.5 w-1/3">
              <div className="h-4 w-4/5 bg-gray-800 rounded-md light-theme:bg-gray-300" />
              <div className="h-3 w-1/2 bg-gray-800 rounded-md light-theme:bg-gray-300" />
            </div>
            <div className="h-5 w-16 bg-gray-800 rounded-full light-theme:bg-gray-300" />
            <div className="h-4 w-20 bg-gray-800 rounded-md light-theme:bg-gray-300" />
            <div className="h-5 w-14 bg-gray-800 rounded-md light-theme:bg-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Shimmering Chart container skeleton
export const ChartSkeleton = () => {
  return (
    <div className="glass rounded-3xl p-6 border border-gray-800 bg-gray-900/20 animate-pulse light-theme:bg-gray-150/20 light-theme:border-gray-200">
      <div className="h-4 w-32 bg-gray-800 rounded-md mb-6 light-theme:bg-gray-300" />
      <div className="h-64 w-full bg-gray-800/40 rounded-2xl flex items-center justify-center light-theme:bg-gray-200/40">
        <div className="h-28 w-28 rounded-full border-4 border-dashed border-gray-700 light-theme:border-gray-300 animate-spin" style={{ animationDuration: '6s' }} />
      </div>
    </div>
  );
};
