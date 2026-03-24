"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Competitor {
  shopName: string;
  url: string;
  scraped?: {
    title?: string;
    image?: string;
    price?: number | null;
    fullPrice?: number | null;
    rating?: number | null;
    reviewsAmount?: number | null;
    ordersAmount?: number | null;
    deliveryDate?: string | null;
    seller?: {
      title?: string;
      rating?: number | null;
    };
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleAdd = () => {
    if (!newShop.trim() || !newUrl.trim()) return;
    const newItem: Competitor = { 
      shopName: newShop.trim(), 
      url: newUrl.trim(),
      scraped: scrapedPreview ? {
        title: scrapedPreview.title,
        image: scrapedPreview.image,
        price: scrapedPreview.price,
        fullPrice: scrapedPreview.fullPrice,
        rating: scrapedPreview.rating,
        reviewsAmount: scrapedPreview.reviewsAmount,
        ordersAmount: scrapedPreview.ordersAmount,
        deliveryDate: scrapedPreview.deliveryDate,
        seller: scrapedPreview.seller
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
      {/* FULL SCREEN HEADER */}
      <div className="px-10 py-8 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-600 rounded-[24px] shadow-xl shadow-red-200 flex items-center justify-center text-white text-3xl">📊</div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900 leading-none">Raqobat Tahlili</h3>
            <p className="text-slate-400 text-sm font-bold mt-2 truncate max-w-[600px]">
              {productName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={onClose}
             className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-sm uppercase tracking-widest"
           >
             Yopish
           </button>
           <button 
             onClick={onClose} 
             className="w-16 h-16 flex items-center justify-center rounded-[24px] bg-slate-900 hover:bg-black transition-all text-white text-2xl active:scale-95 shadow-xl"
           >
             &times;
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Left: Dashboard Controls */}
          <div className="lg:col-span-1 space-y-8">
             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl">+</div>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Yangi Raqobatchi</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Do&apos;kon nomi</label>
                    <input 
                      type="text"
                      placeholder="Masalan: Uzum Market"
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 shadow-inner"
                      value={newShop}
                      onChange={(e) => setNewShop(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Maxsulot havolasi</label>
                    <input 
                      type="text"
                      placeholder="https://uzum.uz/..."
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[24px] focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 shadow-inner"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>
                </div>

                {scrapedPreview && (
                  <div className="p-6 bg-slate-900 rounded-[32px] border border-white/10 space-y-4 animate-in zoom-in-95 duration-300">
                     <div className="flex gap-4">
                        {scrapedPreview.image && (
                          <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden flex-shrink-0 relative border border-white/10">
                             <img src={`/api/proxy?url=${encodeURIComponent(scrapedPreview.image)}`} className="w-full h-full object-cover" alt="preview" />
                             {scrapedPreview.rating && (
                               <div className="absolute top-1 right-1 bg-amber-400 text-black text-[8px] font-black px-1 rounded flex items-center gap-0.5">
                                 ⭐ {scrapedPreview.rating}
                               </div>
                             )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Topildi</p>
                           <h5 className="text-white text-xs font-bold truncate leading-tight mb-2">{scrapedPreview.title}</h5>
                           <p className="text-emerald-400 font-black text-lg leading-none">{scrapedPreview.price?.toLocaleString()} <span className="text-[10px] opacity-60 text-white font-medium">so&apos;m</span></p>
                           {scrapedPreview.fullPrice && scrapedPreview.fullPrice !== scrapedPreview.price && (
                             <p className="text-white/40 text-[10px] line-through mt-1">{scrapedPreview.fullPrice.toLocaleString()} so&apos;m</p>
                           )}
                        </div>
                     </div>
                  </div>
                )}

                {isScraping && (
                  <div className="p-8 bg-slate-100 rounded-[32px] border border-slate-200 flex items-center justify-center gap-4">
                     <div className="w-5 h-5 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Ma&apos;lumot olinmoqda...</span>
                  </div>
                )}

                <button 
                  onClick={handleAdd}
                  disabled={!newShop.trim() || !newUrl.trim() || isScraping}
                  className="w-full py-6 bg-red-600 text-white font-black rounded-3xl hover:bg-red-700 active:scale-[0.98] transition-all shadow-xl shadow-red-200 text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
                >
                  Qo&apos;shish
                </button>
             </div>
          </div>

          {/* Right: List Area */}
          <div className="lg:col-span-3 space-y-8">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Mavjud Raqobatchilar</h4>
                  <span className="px-5 py-2 bg-slate-200 text-slate-600 rounded-full text-xs font-black">{competitors.length}</span>
                </div>
              </div>

              {competitors.length === 0 ? (
                <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[64px] border-4 border-dashed border-slate-100 text-slate-300 text-center p-12">
                   <div className="text-9xl mb-8 opacity-20">📊</div>
                   <p className="text-3xl font-black italic text-slate-400">Hali raqobatchilar kiritilmagan</p>
                   <p className="text-lg font-medium mt-4 max-w-md">Raqobatchi do&apos;kon havolasini chap tomondagi panel orqali qo&apos;shing.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
                  {competitors.map((comp, idx) => (
                    <div key={idx} className="bg-white rounded-[48px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col">
                       {/* Image Section */}
                       <div className="h-72 relative overflow-hidden bg-slate-50">
                          {comp.scraped?.image ? (
                             <>
                               <img src={`/api/proxy?url=${encodeURIComponent(comp.scraped.image)}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="comp" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                               
                               {/* Badges on image */}
                               <div className="absolute top-6 left-6 flex flex-col gap-2">
                                  {comp.scraped.rating && (
                                    <div className="px-4 py-1.5 bg-amber-400 text-black rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg">
                                       ⭐ {comp.scraped.rating}
                                    </div>
                                  )}
                                  {comp.scraped.reviewsAmount && (
                                    <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-black shadow-lg border border-white/20">
                                       💬 {comp.scraped.reviewsAmount}
                                    </div>
                                  )}
                               </div>

                               <div className="absolute inset-x-0 bottom-0 p-8 flex justify-between items-end">
                                  <div>
                                     <p className="text-emerald-400 font-black text-3xl leading-none">{comp.scraped.price?.toLocaleString()} <span className="text-sm opacity-60 text-white font-medium">so&apos;m</span></p>
                                     {comp.scraped.fullPrice && comp.scraped.fullPrice !== comp.scraped.price && (
                                       <p className="text-white/40 text-xs line-through mt-2 font-bold">{comp.scraped.fullPrice.toLocaleString()} so&apos;m</p>
                                     )}
                                  </div>
                                  {comp.scraped.deliveryDate && (
                                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black flex flex-col items-center">
                                       <span className="opacity-60 text-[8px] uppercase tracking-tighter">Yetkazish</span>
                                       {comp.scraped.deliveryDate}
                                    </div>
                                  )}
                               </div>
                             </>
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-6xl">🔗</div>
                          )}
                       </div>

                       <div className="p-10 flex-1 flex flex-col justify-between space-y-8">
                          <div>
                             <div className="flex justify-between items-start mb-6">
                                <div className="flex flex-col gap-2">
                                   <span className="px-4 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest self-start">{comp.shopName}</span>
                                   {comp.scraped?.seller && (
                                     <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{comp.scraped.seller.title}</span>
                                        {comp.scraped.seller.rating && <span className="text-[10px] text-amber-500 font-black">★ {comp.scraped.seller.rating}</span>}
                                     </div>
                                   )}
                                </div>
                                <button 
                                  onClick={() => handleDelete(idx)}
                                  className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm flex-shrink-0"
                                >
                                  &times;
                                </button>
                             </div>
                             <h5 className="text-slate-900 text-xl font-bold mb-4 line-clamp-2 leading-tight tracking-tight group-hover:text-red-600 transition-colors">{comp.scraped?.title || 'Havola sarlavhasi'}</h5>
                             
                             {comp.scraped?.ordersAmount && (
                               <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                  {comp.scraped.ordersAmount.toLocaleString()}+ buyurtma berilgan
                               </div>
                             )}
                          </div>
                          
                          <a 
                            href={comp.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full py-5 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all rounded-[24px] flex items-center justify-center gap-3 active:scale-95"
                          >
                             Sotuv sahifasiga o&apos;tish ↗
                          </a>
                       </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
