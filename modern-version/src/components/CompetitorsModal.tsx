"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Competitor {
  shopName: string;
  url: string;
  scraped?: {
    title?: string;
    image?: string;
    price?: number | null;
  };
}

interface CompetitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: Competitor[];
  onUpdate: (competitors: Competitor[]) => void;
  productName: string;
}

export const CompetitorsModal = ({ isOpen, onClose, competitors = [], onUpdate, productName }: CompetitorsModalProps) => {
  const [newShop, setNewShop] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedPreview, setScrapedPreview] = useState<any>(null);

  useEffect(() => {
    if (!newUrl || !newUrl.startsWith('http')) {
      setScrapedPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsScraping(true);
      try {
        const res = await fetch(`/api/proxy/metadata?url=${encodeURIComponent(newUrl)}`);
        const data = await res.json();
        if (data && !data.error) {
          setScrapedPreview(data);
          if (!newShop && data.shop) setNewShop(data.shop);
        }
      } catch (e) {
        console.error("Scraping error:", e);
      } finally {
        setIsScraping(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [newUrl]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newShop.trim() || !newUrl.trim()) return;
    const newItem: Competitor = { 
      shopName: newShop.trim(), 
      url: newUrl.trim(),
      scraped: scrapedPreview ? {
        title: scrapedPreview.title,
        image: scrapedPreview.image,
        price: scrapedPreview.price
      } : undefined
    };
    onUpdate([...competitors, newItem]);
    setNewShop('');
    setNewUrl('');
    setScrapedPreview(null);
  };

  const handleDelete = (index: number) => {
    const next = [...competitors];
    next.splice(index, 1);
    onUpdate(next);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <div 
        className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[48px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-12 border-b border-slate-100 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-3xl font-black tracking-tighter uppercase whitespace-pre">Raqobat Tahlili</h3>
            <p className="text-red-100 text-sm font-medium mt-1 truncate max-w-[500px] opacity-80">
              {productName}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 w-14 h-14 flex items-center justify-center rounded-3xl hover:bg-white/20 transition-all text-3xl active:scale-90 border border-white/20"
          >
            &times;
          </button>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-slate-50/50">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Form Area */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-black">+</div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Yangi qo&apos;shish</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Do&apos;kon nomi</label>
                      <input 
                        type="text"
                        placeholder="Masalan: Uzum Market"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-sm font-bold text-slate-900"
                        value={newShop}
                        onChange={(e) => setNewShop(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Maxsulot havolasi</label>
                      <input 
                        type="text"
                        placeholder="https://uzum.uz/..."
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-sm font-bold text-slate-900"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  {scrapedPreview && (
                    <div className="p-6 bg-slate-900 rounded-3xl border border-white/10 space-y-4 animate-in zoom-in-95 duration-300">
                       <div className="flex gap-4">
                          {scrapedPreview.image && (
                            <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 relative">
                               <img src={`/api/proxy?url=${encodeURIComponent(scrapedPreview.image)}`} className="w-full h-full object-cover" alt="preview" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Topildi</p>
                             <h5 className="text-white text-xs font-bold truncate leading-tight mb-2">{scrapedPreview.title}</h5>
                             <p className="text-emerald-400 font-black text-lg">{scrapedPreview.price?.toLocaleString()} <span className="text-[10px] opacity-60">so&apos;m</span></p>
                          </div>
                       </div>
                    </div>
                  )}

                  {isScraping && (
                    <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center gap-3">
                       <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ma&apos;lumot olinmoqda...</span>
                    </div>
                  )}

                  <button 
                    onClick={handleAdd}
                    disabled={!newShop.trim() || !newUrl.trim() || isScraping}
                    className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all shadow-xl text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
                  >
                    Qo&apos;shish
                  </button>
               </div>
            </div>

            {/* Right: List Area */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Mavjud Raqobatchilar</h4>
                    <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black">{competitors.length}</span>
                  </div>
                </div>

                {competitors.length === 0 ? (
                  <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[48px] border-4 border-dashed border-slate-100 text-slate-300 text-center p-10">
                     <span className="text-7xl mb-4">🔍</span>
                     <p className="text-xl font-black italic">Hali hech qanday raqobatchi qo&apos;shilmagan</p>
                     <p className="text-sm font-medium mt-2">Havolani kiritib, tahlil qilishni boshlang</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {competitors.map((comp, idx) => (
                      <div key={idx} className="bg-white rounded-[40px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col">
                         {/* Scraped Image & Price Overlay */}
                         {comp.scraped?.image && (
                           <div className="h-48 relative overflow-hidden">
                              <img src={`/api/proxy?url=${encodeURIComponent(comp.scraped.image)}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="comp" />
                              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                 <p className="text-white font-black text-2xl">{comp.scraped.price?.toLocaleString()} <span className="text-xs opacity-60">so&apos;m</span></p>
                              </div>
                           </div>
                         )}

                         <div className="p-8 flex-1 flex flex-col justify-between">
                            <div>
                               <div className="flex justify-between items-start mb-4">
                                  <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">{comp.shopName}</span>
                                  <button 
                                    onClick={() => handleDelete(idx)}
                                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    &times;
                                  </button>
                               </div>
                               <h5 className="text-slate-900 font-bold mb-4 line-clamp-2 leading-snug">{comp.scraped?.title || 'Havola sarlavhasi'}</h5>
                            </div>
                            
                            <a 
                              href={comp.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                            >
                               Saytga o&apos;tish <span>↗</span>
                            </a>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

        </div>

        <div className="p-12 border-t border-slate-100 flex justify-end bg-white">
          <button 
            onClick={onClose}
            className="px-12 py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black active:scale-[0.98] transition-all shadow-xl text-sm uppercase tracking-widest"
          >
            Tushunarli va Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
