"use client";
 
import React from 'react';
 
interface CategoryItem {
  name: string;
  count: number;
}
 
interface CategoryFilterProps {
  categories: CategoryItem[];
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  totalCount: number;
}
 
export const CategoryFilter = ({ categories, currentCategory, onSelectCategory, totalCount }: CategoryFilterProps) => {
  return (
    <div className="relative group/nav mb-8">
      <div className="flex flex-wrap gap-3 items-center">

        {/* BARCHASI BUTTON */}
        <button
          onClick={() => onSelectCategory('Barchasi')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all shadow-sm border-2 ${
            currentCategory === 'Barchasi'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-105'
              : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          🏷️ Barchasi
          <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${currentCategory === 'Barchasi' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {totalCount}
          </span>
        </button>

        <div className="w-px h-8 bg-slate-100 mx-2" />

        {/* DYNAMIC CATEGORIES */}
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => onSelectCategory(cat.name)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap font-bold text-xs uppercase tracking-tighter transition-all border-2 ${
              cat.name === currentCategory
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-105'
                : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            {cat.name}
            <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${cat.name === currentCategory ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400'}`}>
              {cat.count}
            </span>
          </button>
        ))}
        
        {categories.length === 0 && currentCategory !== 'Barchasi' && (
          <div className="text-slate-400 text-xs font-medium italic animate-pulse">
            Boshqa kategoriya topilmadi...
          </div>
        )}
      </div>
    </div>
  );
};


