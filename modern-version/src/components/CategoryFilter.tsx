"use client";

import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  currentCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryFilter = ({ categories, currentCategory, onSelectCategory }: CategoryFilterProps) => {
  const allCategories = ['Barchasi', ...categories];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
      {allCategories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelectCategory(cat)}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all shadow-sm border ${
            cat === currentCategory
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};
