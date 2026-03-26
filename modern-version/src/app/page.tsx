"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from "@/components/Navbar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductCard } from "@/components/ProductCard";
import dynamic from 'next/dynamic';
import useSWR from "swr";
import toast from "react-hot-toast";

// Dynamic Imports
const ProductModal = dynamic(() => import("@/components/ProductModal").then(mod => ({ default: mod.ProductModal })), { ssr: false });
const CategoryManager = dynamic(() => import("@/components/CategoryManager").then(mod => ({ default: mod.CategoryManager })), { ssr: false });
const AiSettingsManager = dynamic(() => import("@/components/AiSettingsManager").then(mod => ({ default: mod.AiSettingsManager })), { ssr: false });
const VideoDownloader = dynamic(() => import("@/components/VideoDownloader").then(mod => ({ default: mod.VideoDownloader })), { ssr: false });
const MarketManager = dynamic(() => import("@/components/MarketManager").then(mod => ({ default: mod.MarketManager })), { ssr: false });
const NotesManager = dynamic(() => import("@/components/NotesManager").then(mod => ({ default: mod.NotesManager })), { ssr: false });

// Hooks & Store
import { useScrollPersistence } from "@/hooks/useScrollPersistence";
import { useAppStore } from "@/store/useAppStore";
import { useProductsFiltering } from "@/hooks/useProductsFiltering";
import { useProductActions } from "@/hooks/useProductActions";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

// UI Components
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";

const fetcher = (url: string) => apiClient.get(url);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Zustand Store
  const {
    activeTab, setActiveTab,
    selectedIds, toggleSelection, clearSelection, selectAll,
    selectedCategory, setFilter,
    searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets, sortBy,
    isFilterPanelOpen
  } = useAppStore();

  // Data Fetching
  const { data: dbProds, mutate: mutateProducts, isLoading: pLoad } = useSWR('/api/products', fetcher);
  const { data: dbCats, mutate: mutateCats, isLoading: cLoad } = useSWR('/api/categories', fetcher);
  const { data: dbMrkts, mutate: mutateMrkts, isLoading: mLoad } = useSWR('/api/markets', fetcher);
  
  const allProducts = Array.isArray(dbProds) ? dbProds : [];
  const categories = Array.isArray(dbCats) ? dbCats : [];
  const markets = Array.isArray(dbMrkts) ? dbMrkts : [];
  const isLoadingData = pLoad || cLoad || mLoad;

  // Custom Logic Hooks
  const { filteredProducts, visibleCount, setVisibleCount } = useProductsFiltering(allProducts);
  const { refreshing, handleUpdate, handleDelete, handleDuplicate, handleBulkDelete, fetchData } = useProductActions(allProducts, mutateProducts, mutateCats, mutateMrkts);

  const observerTarget = React.useRef<HTMLDivElement>(null);

  useScrollPersistence(`home-scroll-${activeTab}`, activeTab === 'products' && !isLoadingData);

  useEffect(() => {
    setMounted(true);
    
    // Supabase Realtime Subscription for ALL tables
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => mutateProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => mutateCats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, () => mutateMrkts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutateProducts, mutateCats, mutateMrkts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 12);
        }
      },
      { rootMargin: "400px" }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [activeTab, filteredProducts.length, visibleCount, setVisibleCount]);

  const handleEditProduct = useCallback((p: any) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    selectAll(filteredProducts.map(p => p.id));
  }, [filteredProducts, selectAll]);

  const handleBulkExport = useCallback(() => {
    const ids = Array.from(selectedIds).join(',');
    window.location.href = `/api/products/export?ids=${ids}`;
  }, [selectedIds]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar 
        onAddProduct={() => {
          setEditingProduct(null);
          setIsModalOpen(true);
        }} 
        onRefreshProducts={() => fetchData(true)}
      />
      
      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-8">
        {activeTab === "products" && (
          <>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Galereya</h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Hozirda <span className="text-indigo-600 font-bold">{filteredProducts.length}</span> ta mahsulot ko&apos;rsatilmoqda
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleSelectAll}
                  className={`px-6 py-4 rounded-2xl border font-bold transition-all flex items-center gap-2 ${selectedIds.size > 0 && selectedIds.size === filteredProducts.length ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`}
                >
                  <span className="text-lg">{selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? '☑' : '☐'}</span>
                  {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? "Tanlovni yopish" : "Hammasini tanlash"}
                </button>
                <button 
                  onClick={() => setFilter('isFilterPanelOpen', !isFilterPanelOpen)}
                  className={`px-6 py-4 rounded-2xl border font-bold transition-all flex items-center gap-2 ${isFilterPanelOpen ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`}
                >
                  <span>{isFilterPanelOpen ? '✕' : '⚙️'}</span>
                  Filtrlar
                </button>
                <div className="relative w-full max-w-md">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input 
                    type="text"
                    placeholder="Qidirish (Nom, ID, Kategoriya)..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900"
                    value={searchQuery}
                    onChange={(e) => setFilter('searchQuery', e.target.value)}
                  />
                </div>
                <div className="relative">
                   <select 
                     className="h-full pl-10 pr-10 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer hover:border-indigo-400"
                     value={sortBy}
                     onChange={(e) => setFilter('sortBy', e.target.value)}
                   >
                      <option value="newest">🆕 Yangi sana</option>
                      <option value="oldest">🕰 Eski sana</option>
                      <option value="name-asc">🔤 Nom (A-Z)</option>
                      <option value="name-desc">🔤 Nom (Z-A)</option>
                   </select>
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">⇅</span>
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
                </div>
              </div>
            </header>

            {isFilterPanelOpen && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8 bg-white rounded-[32px] border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2 text-slate-700">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Brend</label>
                  <input 
                    type="text"
                    placeholder="Brend nomi..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    value={brandFilter}
                    onChange={(e) => setFilter('brandFilter', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Rang</label>
                  <input 
                    type="text"
                    placeholder="Rangi..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-slate-900"
                    value={colorFilter}
                    onChange={(e) => setFilter('colorFilter', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Min. Narx</label>
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-slate-900"
                    value={minPrice}
                    onChange={(e) => setFilter('minPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Max. Narx</label>
                  <input 
                    type="number"
                    placeholder="999..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-slate-900"
                    value={maxPrice}
                    onChange={(e) => setFilter('maxPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-3 md:col-span-4">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Sotuv bozorlari</label>
                  <div className="flex flex-wrap gap-2">
                    {markets.map((m: any) => {
                      const isSelected = selectedMarkets.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected 
                              ? selectedMarkets.filter(id => id !== m.id) 
                              : [...selectedMarkets, m.id];
                            setFilter('selectedMarkets', next);
                          }}
                          className={`px-4 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-white border-indigo-600 text-indigo-600 shadow-md scale-[1.02]' 
                              : 'bg-slate-50 border-transparent text-slate-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                          }`}
                        >
                          <span className="text-sm">{isSelected ? '✅' : '⬜'}</span>
                          <span>{m.icon}</span>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(brandFilter || colorFilter || minPrice || maxPrice || statusFilter !== 'all' || selectedMarkets.length !== markets.length) && (
                  <button 
                    onClick={() => {
                      setFilter('brandFilter', "");
                      setFilter('colorFilter', "");
                      setFilter('minPrice', "");
                      setFilter('maxPrice', "");
                      setFilter('statusFilter', "all");
                      setFilter('selectedMarkets', markets.map((m: any) => m.id));
                    }}
                    className="md:col-span-4 mt-2 text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-widest text-right"
                  >
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            )}

            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mb-6 w-full max-w-2xl overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Barchasi', count: allProducts.length },
                { id: 'active', label: 'Faol', count: allProducts.filter(p => (p.status || 'active') === 'active').length },
                { id: 'quarantine', label: 'Karantin', count: allProducts.filter(p => p.status === 'quarantine').length },
                { id: 'archive', label: 'Arxiv', count: allProducts.filter(p => p.status === 'archive').length },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilter('statusFilter', s.id)}
                  className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    statusFilter === s.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                  <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${statusFilter === s.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            <CategoryFilter 
              categories={categories.map((c: any) => c.name)} 
              currentCategory={selectedCategory} 
              onSelectCategory={(cat) => setFilter('selectedCategory', cat)} 
            />

            <div className="relative min-h-[400px]">
              {refreshing && (
                 <div className="absolute -top-12 right-0 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-sm z-20 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase">Yangilanmoqda</span>
                 </div>
              )}

              {isLoadingData ? (
                <div className="flex flex-col gap-6">
                  <ProductCardSkeleton /> <ProductCardSkeleton /> <ProductCardSkeleton />
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  {filteredProducts.slice(0, visibleCount).map((product: any) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      markets={markets}
                      selected={selectedIds.has(product.id)}
                      onSelectToggle={toggleSelection}
                      onEdit={handleEditProduct}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                      onRefresh={() => fetchData(true)}
                    />
                  ))}
                  
                  {visibleCount < filteredProducts.length && (
                    <div ref={observerTarget} className="w-full py-10 flex justify-center scroll-mt-20">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  )}

                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                      <p className="text-2xl text-slate-300 font-black italic">Hech narsa topilmadi</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "video" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><VideoDownloader /></div>}
        {activeTab === "categories" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><CategoryManager categories={categories} onRefresh={() => fetchData(true)} /></div>}
        {activeTab === "ai" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><AiSettingsManager /></div>}
        {activeTab === "markets" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><MarketManager markets={markets} onRefresh={() => fetchData(true)} /></div>}
        {activeTab === "notes" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><NotesManager /></div>}
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={editingProduct}
        allProducts={allProducts}
        onSuccess={() => fetchData(true)}
        categories={categories}
        markets={markets}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 md:px-6 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl md:rounded-[32px] p-3 md:p-4 flex items-center justify-between backdrop-blur-xl">
             <div className="flex items-center gap-3 md:gap-4 pl-2 md:pl-4">
               <span className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs md:sm">{selectedIds.size}</span>
               <div className="flex flex-col">
                 <span className="text-white font-black text-[10px] md:text-sm uppercase tracking-wider">Tanlandi</span>
                 <button onClick={clearSelection} className="text-indigo-400 text-[9px] md:text-[10px] font-black uppercase text-left hover:text-white">Tozalash</button>
               </div>
             </div>
             <div className="flex gap-2">
                <button onClick={handleBulkExport} className="px-4 md:px-6 py-3 md:py-4 bg-emerald-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                  <span>📥</span> <span className="hidden sm:inline">Export</span>
                </button>
                <button onClick={() => handleBulkDelete(selectedIds, clearSelection)} className="px-4 md:px-6 py-3 md:py-4 bg-red-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all flex items-center gap-2">
                  <span>🗑️</span> <span className="hidden sm:inline">O&apos;chirish</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}
