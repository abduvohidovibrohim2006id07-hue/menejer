"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { CategoryManager } from "@/components/CategoryManager";
import { AiSettingsManager } from "@/components/AiSettingsManager";
import { VideoDownloader } from "@/components/VideoDownloader";
import { MarketManager } from "@/components/MarketManager";
import { NotesManager } from "@/components/NotesManager";
import { useScrollPersistence } from "@/hooks/useScrollPersistence";
import { apiClient } from "@/lib/api-client";

export default function Home() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  
  useScrollPersistence(`home-scroll-${activeTab}`, activeTab === 'products' ? !initialLoading : true);
  const [mounted, setMounted] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'quarantine', 'archive'
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load persisted states
    const savedTab = sessionStorage.getItem('activeTab');
    if (savedTab) setActiveTab(savedTab);
    
    const savedCategory = sessionStorage.getItem('filters-category');
    if (savedCategory) setSelectedCategory(savedCategory);
    
    const savedStatus = sessionStorage.getItem('filters-status');
    if (savedStatus) setStatusFilter(savedStatus);
    
    const savedMarkets = sessionStorage.getItem('filters-markets');
    if (savedMarkets) {
      try {
        setSelectedMarkets(JSON.parse(savedMarkets));
      } catch (e) {
        setSelectedMarkets([]);
      }
    }
    
    const savedSearch = sessionStorage.getItem('filters-search');
    if (savedSearch) setSearchQuery(savedSearch);
    
    const savedBrand = sessionStorage.getItem('filters-brand');
    if (savedBrand) setBrandFilter(savedBrand);
    
    const savedColor = sessionStorage.getItem('filters-color');
    if (savedColor) setColorFilter(savedColor);
    
    const savedMinPrice = sessionStorage.getItem('filters-minPrice');
    if (savedMinPrice) setMinPrice(savedMinPrice);
    
    const savedMaxPrice = sessionStorage.getItem('filters-maxPrice');
    if (savedMaxPrice) setMaxPrice(savedMaxPrice);
    
    const savedPanelOpen = sessionStorage.getItem('filters-panelOpen');
    if (savedPanelOpen === 'true') setIsFilterPanelOpen(true);
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

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size} ta mahsulot o'chirilsinmi?`)) return;
    setRefreshing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await apiClient.delete('/api/products', id);
      }
      setSelectedIds(new Set());
      await fetchData();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds).join(',');
    window.location.href = `/api/products/export?ids=${ids}`;
  };

  const fetchData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else if (allProducts.length === 0) setInitialLoading(true);

    try {
      const [prodData, catsData, marketsData] = await Promise.all([
        apiClient.get('/api/products'),
        apiClient.get('/api/categories'),
        apiClient.get('/api/markets')
      ]);
      
      setAllProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      
      const mData = Array.isArray(marketsData) ? marketsData : [];
      setMarkets(mData);

      // Initialize selected markets if none saved
      const savedMarkets = sessionStorage.getItem('filters-markets');
      if (!savedMarkets && mData.length > 0) {
        setSelectedMarkets(mData.map((m: any) => m.id));
      }
    } catch (e: any) {
      console.error("Fetch Data Error:", e.message);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('filters-category', selectedCategory);
    sessionStorage.setItem('filters-status', statusFilter);
    sessionStorage.setItem('filters-markets', JSON.stringify(selectedMarkets));
    sessionStorage.setItem('filters-search', searchQuery);
    sessionStorage.setItem('filters-brand', brandFilter);
    sessionStorage.setItem('filters-color', colorFilter);
    sessionStorage.setItem('filters-minPrice', minPrice);
    sessionStorage.setItem('filters-maxPrice', maxPrice);
    sessionStorage.setItem('filters-panelOpen', isFilterPanelOpen.toString());
  }, [selectedCategory, statusFilter, selectedMarkets, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, isFilterPanelOpen, mounted]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = allProducts;
    
    if (selectedCategory !== "Barchasi") {
      result = result.filter((p: any) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p: any) => {
        const searchPool = [
          p.name || '',
          p.name_ru || '',
          p.brand || '',
          p.model || '',
          p.color || '',
          p.id?.toString() || ''
        ].map(val => val.toLowerCase());

        return searchPool.some(val => val.includes(q));
      });
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

    if (statusFilter !== "all") {
      result = result.filter((p: any) => (p.status || 'active') === statusFilter);
    }

    if (selectedMarkets.length > 0) {
      result = result.filter((p: any) => {
        const prodMarkets = p.marketplaces || [];
        // Show product if it has NO markets (available for all) OR its marketplace is selected
        if (prodMarkets.length === 0) return true;
        return prodMarkets.some((m: string) => selectedMarkets.includes(m));
      });
    } else {
      // If no markets selected at all, show only products with no markets?
      result = result.filter((p: any) => (p.marketplaces || []).length === 0);
    }
    
    setFilteredProducts(result);
  }, [allProducts, selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets]);

  const handleUpdate = (id: string, updates: any) => {
    setAllProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDelete = async (id: string) => {
    // Optimistically update the UI FIRST
    const originalProducts = [...allProducts];
    setAllProducts(prev => prev.filter(p => p.id !== id));

    try {
      // Perform deletion in background
      apiClient.delete('/api/products', id).catch(e => {
        console.error("Background delete error:", e);
        // Rollback only on critical error
        setAllProducts(originalProducts);
        alert("Mahsulotni o'chirishda xatolik: " + e.message);
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDuplicate = async (product: any) => {
    setRefreshing(true);
    try {
      // Generate next numeric ID
      let nextId = "10001";
      const ids = allProducts
        .map(p => parseInt(String(p.id)) || 0)
        .filter(id => !isNaN(id) && id < 1000000); // Ignore long Uzum IDs
      if (ids.length > 0) {
        nextId = (Math.max(...ids) + 1).toString();
      }

      const clone = { 
        ...product, 
        id: nextId,
        updated_at: new Date().toISOString()
      };
      
      await apiClient.post('/api/products', clone);
      await fetchData(true);
    } catch (e: any) {
      alert("Nusxalashda xatolik: " + e.message);
    } finally {
      setRefreshing(false);
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
        onRefreshProducts={() => fetchData(true)}
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
                            setSelectedMarkets(prev => 
                              isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            );
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
                      setBrandFilter("");
                      setColorFilter("");
                      setMinPrice("");
                      setMaxPrice("");
                      setStatusFilter("all");
                      setSelectedMarkets(markets.map((m: any) => m.id));
                    }}
                    className="md:col-span-4 mt-2 text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-widest text-right"
                  >
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            )}

            {/* Status Tabs */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mb-6 w-full max-w-2xl overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Barchasi', count: allProducts.length },
                { id: 'active', label: 'Faol', count: allProducts.filter(p => (p.status || 'active') === 'active').length },
                { id: 'quarantine', label: 'Karantin', count: allProducts.filter(p => p.status === 'quarantine').length },
                { id: 'archive', label: 'Arxiv', count: allProducts.filter(p => p.status === 'archive').length },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    statusFilter === s.id 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-500 hover:bg-slate-50'
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
              onSelectCategory={setSelectedCategory} 
            />
 
            <div className="relative min-h-[400px]">
              {/* SILENT REFRESH INDICATOR */}
              {refreshing && (
                 <div className="absolute -top-12 right-0 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-100 shadow-sm z-20 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase">Yangilanmoqda</span>
                 </div>
              )}
 
              {initialLoading ? (
                <div className="py-40 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Ma&apos;lumotlar yuklanmoqda...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  {filteredProducts.map((product: any) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      markets={markets}
                      selected={selectedIds.has(product.id)}
                      onSelectToggle={toggleSelection}
                      onEdit={(p: any) => {
                        setEditingProduct(p);
                        setIsModalOpen(true);
                      }}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                      onRefresh={() => fetchData(true)}
                    />
                  ))}
                  
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                      <p className="text-2xl text-slate-300 font-black italic">
                        Hech narsa topilmadi
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "video" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VideoDownloader />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CategoryManager categories={categories} onRefresh={() => fetchData(true)} />
          </div>
        )}

        {activeTab === "ai" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AiSettingsManager />
          </div>
        )}

        {activeTab === "markets" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MarketManager markets={markets} onRefresh={() => fetchData(true)} />
          </div>
        )}

        {activeTab === "notes" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NotesManager />
          </div>
        )}
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

      {/* FLOAT BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 md:px-6 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl md:rounded-[32px] p-3 md:p-4 flex items-center justify-between backdrop-blur-xl">
             <div className="flex items-center gap-3 md:gap-4 pl-2 md:pl-4">
               <span className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs md:sm">
                 {selectedIds.size}
               </span>
               <div className="flex flex-col">
                 <span className="text-white font-black text-[10px] md:text-sm uppercase tracking-wider">Tanlandi</span>
                 <button onClick={clearSelection} className="text-indigo-400 text-[9px] md:text-[10px] font-black uppercase text-left hover:text-white">Tozalash</button>
               </div>
             </div>
             
             <div className="flex gap-2">
                <button 
                  onClick={handleBulkExport}
                  title="Export (Excel)"
                  className="px-4 md:px-6 py-3 md:py-4 bg-emerald-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <span>📥</span> <span className="hidden sm:inline">Export</span>
                </button>
                <button 
                  onClick={handleBulkDelete}
                  title="O'chirish"
                  className="px-4 md:px-6 py-3 md:py-4 bg-red-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <span>🗑️</span> <span className="hidden sm:inline">O&apos;chirish</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}
