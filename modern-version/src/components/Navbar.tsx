"use client";

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';

interface NavbarProps {
  onAddProduct: () => void;
  onRefreshProducts: () => void;
}

export const Navbar = ({ onAddProduct, onRefreshProducts }: NavbarProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const { activeTab, setActiveTab } = useAppStore();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`${data.count} ta mahsulot muvaffaqiyatli import qilindi!`);
        onRefreshProducts();
      } else {
        toast.error("Xatolik: " + data.error);
      }
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tabs = [
    { id: 'products', label: '📦 Mahsulotlar' },
    { id: 'video', label: '🎥 Video' },
    { id: 'categories', label: '📁 Kategoriyalar' },
    { id: 'ai', label: '🤖 AI Panel' },
    { id: 'markets', label: '🏢 Do\'konlar' },
    { id: 'notes', label: '📒 Eslatmalar' }
  ];

  return (
    <nav className="sticky top-0 z-50 flex flex-col md:flex-row items-center justify-between px-4 md:px-10 py-4 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm gap-4">
      <div className="flex items-center justify-between w-full md:w-auto gap-10">
        <div className="brand shrink-0">
          <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
            Menejer Pro
          </h1>
        </div>
        
        {/* Desktop Tabs */}
        <div className="hidden lg:flex gap-1 p-1 bg-slate-100/50 rounded-2xl">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden flex overflow-x-auto w-full gap-2 p-1 bg-slate-100/50 rounded-2xl no-scrollbar overflow-y-hidden">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2 md:gap-4 border-t md:border-t-0 pt-4 md:pt-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx, .xls"
          onChange={handleImport}
        />
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="p-3 md:p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 disabled:opacity-50"
            title="Excel Import"
          >
            {importing ? "⏳" : "📤"}
          </button>
          <a 
            href="/api/products/export" 
            className="p-3 md:p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
            title="Excel Eksport"
          >
            📥
          </a>
        </div>
        <button 
          onClick={onAddProduct}
          className="flex-1 md:flex-none px-4 md:px-6 py-3.5 md:py-4 text-xs md:text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> <span className="hidden sm:inline">Yangi mahsulot</span><span className="sm:hidden">Qo&apos;shish</span>
        </button>
      </div>
    </nav>
  );
};
