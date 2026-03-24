import React from 'react';

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row gap-8 items-stretch relative overflow-hidden">
      {/* Shimmer animation overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10" />
      
      {/* Left Gallery Skeleton */}
      <div className="w-full md:w-[350px] shrink-0">
        <div className="w-full aspect-[3/4] md:h-[400px] bg-slate-200/60 rounded-2xl animate-pulse" />
      </div>

      {/* Right Content Skeleton */}
      <div className="flex-1 flex flex-col pt-2">
        <div className="mb-6 flex justify-between items-start">
          <div className="space-y-4 w-3/4">
            <div className="h-8 bg-slate-200/60 rounded-xl w-full animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 bg-slate-200/60 rounded-lg w-24 animate-pulse" />
              <div className="h-6 bg-slate-200/60 rounded-lg w-16 animate-pulse" />
              <div className="h-6 bg-slate-200/60 rounded-lg w-20 animate-pulse" />
            </div>
          </div>
          <div className="h-12 bg-slate-200/60 rounded-2xl w-32 animate-pulse" />
        </div>

        <div className="space-y-4">
          <div className="h-4 bg-slate-200/60 rounded-md w-24 animate-pulse" />
          <div className="flex gap-3">
             <div className="h-10 bg-slate-200/60 rounded-xl w-24 animate-pulse" />
             <div className="h-10 bg-slate-200/60 rounded-xl w-24 animate-pulse" />
             <div className="h-10 bg-slate-200/60 rounded-xl w-24 animate-pulse" />
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-14 bg-slate-200/60 rounded-2xl w-full animate-pulse" />
          <div className="h-14 bg-slate-200/60 rounded-2xl w-full animate-pulse" />
          <div className="h-14 bg-slate-200/60 rounded-2xl w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
