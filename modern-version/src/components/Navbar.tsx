"use client";

import React from 'react';

interface NavbarProps {
  onAddProduct: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export const Navbar = ({ onAddProduct, onTabChange, activeTab }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-10 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-10">
        <div className="brand">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
            Menejer Pro
          </h1>
        </div>
        
        <div className="hidden md:flex gap-1 p-1 bg-slate-100/50 rounded-2xl">
          <button 
            onClick={() => onTabChange('products')}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            📦 Mahsulotlar
          </button>
          <button 
            onClick={() => onTabChange('categories')}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            📁 Kategoriyalar
          </button>
          <button 
            onClick={() => onTabChange('ai')}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'ai' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            🤖 AI Panel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href="/api/products/export" 
          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
          title="Excel Eksport"
        >
          📥
        </a>
        <button 
          onClick={onAddProduct}
          className="px-6 py-3 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Yangi mahsulot
        </button>
      </div>
    </nav>
  );
};
