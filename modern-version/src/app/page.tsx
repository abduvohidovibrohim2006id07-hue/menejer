"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { CategoryManager } from "@/components/CategoryManager";
import { AiSettingsManager } from "@/components/AiSettingsManager";
import { useScrollPersistence } from "@/hooks/useScrollPersistence";
import { apiClient } from "@/lib/api-client";

export default function Home() {
  useScrollPersistence('home-scroll');
  
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
       return sessionStorage.getItem('activeTab') || 'products';
    }
    return 'products';
  });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

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
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.id?.toString().toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    setFilteredProducts(result);
  }, [allProducts, selectedCategory, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await apiClient.delete('/api/products', id);
      fetchData();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar 
        onAddProduct={() => {
          setEditingProduct(null);
          setIsModalOpen(true);
        }} 
        onTabChange={setActiveTab}
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
            </header>

            <CategoryFilter 
              categories={categories.map(c => c.name)} 
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
                
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onEdit={(p) => {
                      setEditingProduct(p);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDelete}
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
    </main>
  );
}
