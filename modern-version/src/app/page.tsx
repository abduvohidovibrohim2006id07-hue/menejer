"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { CategoryManager } from "@/components/CategoryManager";
import { AiSettingsManager } from "@/components/AiSettingsManager";
import { VideoDownloader } from "@/components/VideoDownloader";
import { useScrollPersistence } from "@/hooks/useScrollPersistence";
import { apiClient } from "@/lib/api-client";

export default function Home() {
  useScrollPersistence('home-scroll');
  
  const [activeTab, setActiveTab] = useState('products');
  const [mounted, setMounted] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('activeTab');
    if (saved) setActiveTab(saved);
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size} ta mahsulot o'chirilsinmi?`)) return;
    setLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await apiClient.delete('/api/products', id);
      }
      setSelectedIds(new Set());
      await fetchData();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds).join(',');
    window.location.href = `/api/products/export?ids=${ids}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodData = await apiClient.get('/api/products');
      const catsData = await apiClient.get('/api/categories');
      
      setAllProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (e: any) {
      console.error("Fetch Data Error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = allProducts;
    
    if (selectedCategory !== "Barchasi") {
      result = result.filter((p: any) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) => 
        p.name?.toLowerCase().includes(q) || 
        p.id?.toString().toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    if (brandFilter) {
      const bf = brandFilter.toLowerCase();
      result = result.filter((p: any) => p.brand?.toLowerCase().includes(bf));
    }

    if (colorFilter) {
      const cf = colorFilter.toLowerCase();
      result = result.filter((p: any) => p.color?.toLowerCase().includes(cf));
    }

    if (minPrice) {
      result = result.filter((p: any) => Number(p.price) >= Number(minPrice));
    }

    if (maxPrice) {
      result = result.filter((p: any) => Number(p.price) <= Number(maxPrice));
    }

    setFilteredProducts(result);
  }, [allProducts, selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice]);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete('/api/products', id);
      fetchData();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar 
        onAddProduct={() => {
          setEditingProduct(null);
          setIsModalOpen(true);
        }} 
        onTabChange={setActiveTab}
        onRefreshProducts={fetchData}
        activeTab={activeTab}
      />
      
      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-8">
        
        {activeTab === "products" && (
          <>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                  Galereya
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Hozirda <span className="text-indigo-600 font-bold">{filteredProducts.length}</span> ta mahsulot ko'rsatilmoqda
                </p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
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
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </header>

            {/* EXPANDABLE FILTER PANEL */}
            {isFilterPanelOpen && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8 bg-white rounded-[32px] border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Brend</label>
                  <input 
                    type="text"
                    placeholder="Brend nomi..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Rang</label>
                  <input 
                    type="text"
                    placeholder="Rangi..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Min. Narx</label>
                  <input 
                    type="number"
                    placeholder="0"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Max. Narx</label>
                  <input 
                    type="number"
                    placeholder="999 999 999"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                {(brandFilter || colorFilter || minPrice || maxPrice) && (
                  <button 
                    onClick={() => {
                      setBrandFilter("");
                      setColorFilter("");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="md:col-span-4 mt-2 text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-widest text-right"
                  >
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            )}

            <CategoryFilter 
              categories={categories.map((c: any) => c.name)} 
              currentCategory={selectedCategory} 
              onSelectCategory={setSelectedCategory} 
            />

            {loading && allProducts.length === 0 ? (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Ma'lumotlar yuklanmoqda...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700 relative">
                {loading && (
                   <div className="absolute top-0 right-0 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-sm z-10 flex items-center gap-2 -mt-4 animate-in slide-in-from-top-1">
                      <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase">Yangilanmoqda</span>
                   </div>
                )}
                
                {filteredProducts.map((product: any) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    selected={selectedIds.has(product.id)}
                    onSelectToggle={toggleSelection}
                    onEdit={(p: any) => {
                      setEditingProduct(p);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDelete}
                    onRefresh={fetchData}
                  />
                ))}
                
                {filteredProducts.length === 0 && !loading && (
                  <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-2xl text-slate-300 font-black italic">
                      Hech narsa topilmadi
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "video" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VideoDownloader />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CategoryManager categories={categories} onRefresh={fetchData} />
          </div>
        )}

        {activeTab === "ai" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AiSettingsManager />
          </div>
        )}
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={editingProduct}
        onSuccess={fetchData}
        categories={categories}
      />

      {/* FLOAT BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-6 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-[32px] p-4 flex items-center justify-between backdrop-blur-xl">
             <div className="flex items-center gap-4 pl-4">
               <span className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                 {selectedIds.size}
               </span>
               <div className="flex flex-col">
                 <span className="text-white font-black text-sm uppercase tracking-wider">Tanlandi</span>
                 <button onClick={clearSelection} className="text-indigo-400 text-[10px] font-black uppercase text-left hover:text-white">Tozalash</button>
               </div>
             </div>
             
             <div className="flex gap-2">
                <button 
                  onClick={handleBulkExport}
                  className="px-6 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  📥 Export (Excel)
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="px-6 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  🗑️ O'chirish
                </button>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}
