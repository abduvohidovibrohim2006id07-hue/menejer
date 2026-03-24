"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

interface HistorySnapshot {
  date: string;
  price?: number | null;
  rating?: number | null;
  ordersAmount?: number | null;
}

interface Competitor {
  shopName: string;
  url: string;
  history?: HistorySnapshot[];
  scraped?: {
    title?: string;
    image?: string;
    shop?: string;
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
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [refreshingAll, setRefreshingAll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatic refresh comparison logic
  const refreshCompetitor = useCallback(async (comp: Competitor, index: number, currentList: Competitor[]) => {
    try {
      const res = await fetch(`/api/proxy/metadata?url=${encodeURIComponent(comp.url)}`);
      const newData = await res.json();
      
      if (newData && !newData.error) {
        const oldData = comp.scraped || {};
        
        // Detect significant changes (Price, Title, Rating, Orders)
        const hasPriceChanged = newData.price !== oldData.price;
        const hasRatingChanged = newData.rating !== oldData.rating;
        const hasOrdersChanged = newData.ordersAmount !== oldData.ordersAmount;
        
        if (hasPriceChanged || hasRatingChanged || hasOrdersChanged) {
            // Notifications
            if (hasPriceChanged) {
                const diff = (newData.price || 0) - (oldData.price || 0);
                const emoji = diff > 0 ? "📈" : "📉";
                toast.success(`${comp.shopName}: Narx ${emoji} ${Math.abs(diff).toLocaleString()} so'mga o'zgardi!`, { duration: 5000 });
            }

            // Create snapshot for history
            const snapshot: HistorySnapshot = {
                date: new Date().toISOString(),
                price: oldData.price,
                rating: oldData.rating,
                ordersAmount: oldData.ordersAmount
            };

            const updatedHistory = [...(comp.history || []), snapshot].slice(-10); // Keep last 10 snapshots
            
            const updatedComp: Competitor = {
                ...comp,
                history: updatedHistory,
                scraped: {
                    ...oldData,
                    ...newData
                }
            };

            const newList = [...currentList];
            newList[index] = updatedComp;
            return newList;
        }
      }
    } catch (e) {
      console.error("Refresh error:", e);
    }
    return null;
  }, []);

  useEffect(() => {
    if (isOpen && competitors.length > 0 && !refreshingAll) {
      const runRefresh = async () => {
        setRefreshingAll(true);
        let currentList = [...competitors];
        let hasChanges = false;

        for (let i = 0; i < currentList.length; i++) {
           const updatedList = await refreshCompetitor(currentList[i], i, currentList);
           if (updatedList) {
               currentList = updatedList;
               hasChanges = true;
           }
        }

        if (hasChanges) {
           onUpdate(currentList);
        }
        setRefreshingAll(false);
      };
      runRefresh();
    }
  }, [isOpen]); // Only trigger when modal opens

  // Preview logic for new URL
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
      history: [],
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
    toast.success("Raqobatchi muvaffaqiyatli qo'shildi!");
  };

  const handleDelete = (index: number) => {
    const next = [...competitors];
    next.splice(index, 1);
    onUpdate(next);
    toast.error("Raqobatchi o'chirildi");
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
      {/* HEADER */}
      <div className="px-10 py-8 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-red-600 rounded-[28px] shadow-xl shadow-red-200 flex items-center justify-center text-white text-3xl">📊</div>
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900 leading-none">Raqobat Markazi</h3>
            <p className="text-slate-400 text-sm font-bold mt-2 truncate max-w-[500px]">
              {productName}
            </p>
          </div>
          
          {/* TABS */}
          <div className="flex bg-slate-100 p-1.5 rounded-[24px] ml-4">
             <button 
               onClick={() => setActiveTab('list')}
               className={`px-8 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Ro&apos;yxat
             </button>
             <button 
               onClick={() => setActiveTab('stats')}
               className={`px-8 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               Statistika
             </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           {refreshingAll && (
              <div className="flex items-center gap-3 bg-red-50 px-6 py-3 rounded-2xl border border-red-100 animate-pulse">
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                 <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Ma&apos;lumotlar yangilanmoqda...</span>
              </div>
           )}
           <button 
             onClick={onClose} 
             className="w-16 h-16 flex items-center justify-center rounded-[28px] bg-slate-900 hover:bg-black transition-all text-white text-2xl active:scale-95 shadow-xl"
           >
             &times;
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12">
        <div className="max-w-[1700px] mx-auto">
          {activeTab === 'list' ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              {/* Left: Dashboard Controls */}
              <div className="lg:col-span-1 space-y-8">
                 <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-2xl space-y-8 sticky top-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl">+</div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Yangi Qo&apos;shish</h4>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Do&apos;kon nomi</label>
                        <input 
                          type="text"
                          placeholder="Masalan: Uzum Market"
                          className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 shadow-inner"
                          value={newShop}
                          onChange={(e) => setNewShop(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Maxsulot havolasi</label>
                        <input 
                          type="text"
                          placeholder="Uzum, Yandex yoki OLX havolasi"
                          className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none font-bold text-slate-900 shadow-inner"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    {scrapedPreview && (
                      <div className="p-6 bg-slate-900 rounded-[40px] border border-white/10 space-y-4 animate-in zoom-in-95 duration-300">
                         <div className="flex gap-4">
                            {scrapedPreview.image && (
                              <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden flex-shrink-0 relative border border-white/10">
                                 <img src={`/api/proxy?url=${encodeURIComponent(scrapedPreview.image)}`} className="w-full h-full object-cover" alt="preview" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{scrapedPreview.shop || "Tayyor"}</p>
                               <h5 className="text-white text-xs font-bold truncate leading-tight mb-2">{scrapedPreview.title}</h5>
                               <p className="text-white font-black text-lg leading-none">{scrapedPreview.price?.toLocaleString()} <span className="text-[10px] opacity-60 font-medium">so&apos;m</span></p>
                            </div>
                         </div>
                      </div>
                    )}

                    {isScraping && (
                      <div className="p-8 bg-slate-100 rounded-[32px] border border-slate-200 flex items-center justify-center gap-4">
                         <div className="w-5 h-5 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Tahlil...</span>
                      </div>
                    )}

                    <button 
                      onClick={handleAdd}
                      disabled={!newShop.trim() || !newUrl.trim() || isScraping}
                      className="w-full py-6 bg-red-600 text-white font-black rounded-[28px] hover:bg-red-700 active:scale-[0.98] transition-all shadow-xl shadow-red-200 text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
                    >
                      Ro&apos;yxatga qo&apos;shish
                    </button>
                 </div>
              </div>

              {/* List Cards */}
              <div className="lg:col-span-3 space-y-8">
                  {competitors.length === 0 ? (
                    <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[72px] border-4 border-dashed border-slate-100 text-slate-300 text-center p-12">
                       <p className="text-9xl mb-8 opacity-20">🛒</p>
                       <p className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Hali raqobatchi yo&apos;q</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                      {competitors.map((comp, idx) => (
                        <div key={idx} className="bg-white rounded-[56px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col">
                           <div className="h-72 relative overflow-hidden bg-slate-50">
                              {comp.scraped?.image ? (
                                 <>
                                   <img src={`/api/proxy?url=${encodeURIComponent(comp.scraped.image)}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="comp" />
                                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                   <div className="absolute top-6 left-6 flex flex-col gap-2">
                                      {comp.scraped.rating && <div className="px-4 py-1.5 bg-amber-400 text-black rounded-full text-[10px] font-black shadow-lg flex items-center gap-1">⭐ {comp.scraped.rating}</div>}
                                      <div className="px-4 py-1.5 bg-white text-slate-900 rounded-full text-[10px] font-black shadow-lg uppercase">{comp.scraped.shop || comp.shopName}</div>
                                   </div>
                                   <div className="absolute inset-x-0 bottom-0 p-8">
                                      <p className="text-emerald-400 font-black text-3xl leading-none">{comp.scraped.price?.toLocaleString()} <span className="text-sm opacity-60 text-white font-medium">so&apos;m</span></p>
                                   </div>
                                 </>
                              ) : <div className="w-full h-full flex items-center justify-center text-6xl">📊</div>}
                           </div>
                           <div className="p-10 flex-1 flex flex-col justify-between space-y-6">
                              <div>
                                 <h5 className="text-slate-900 text-xl font-bold mb-4 line-clamp-2 leading-tight tracking-tight">{comp.scraped?.title || 'Sarlavha'}</h5>
                                 {comp.scraped?.seller && (
                                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <span>{comp.scraped.seller.title}</span>
                                      {comp.scraped.seller.rating && <span className="text-amber-500">★ {comp.scraped.seller.rating}</span>}
                                   </p>
                                 )}
                              </div>
                              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                 <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">Ko&apos;rish ↗</a>
                                 <button onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700 transition-colors uppercase font-black text-[10px] tracking-widest">O&apos;chirish</button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ) : (
            /* STATS VIEW */
            <div className="space-y-12 animate-in fade-in slide-in-from-right-10 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 font-sans">
                   {/* Combined Mini Stats */}
                   <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center text-3xl">👥</div>
                      <div>
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Jami Raqobatchilar</p>
                         <h4 className="text-5xl font-black text-slate-900 mt-2">{competitors.length}</h4>
                      </div>
                   </div>
                   {/* Lowest Price Stat */}
                   {competitors.length > 0 && (
                      <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[24px] flex items-center justify-center text-3xl">💰</div>
                        <div>
                           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Eng arzon narx</p>
                           <h4 className="text-3xl font-black text-emerald-600 mt-2">
                              {Math.min(...competitors.filter(c => c.scraped?.price).map(c => c.scraped?.price || 0)).toLocaleString()} so&apos;m
                           </h4>
                        </div>
                      </div>
                   )}
                </div>

                <div className="bg-white p-12 rounded-[72px] border border-slate-100 shadow-2xl space-y-12">
                   <div className="flex items-center gap-4 px-4">
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl">📈</div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Narxlar Dinamikasi</h4>
                   </div>

                   <div className="space-y-12">
                      {competitors.map((comp, idx) => (
                        <div key={idx} className="bg-slate-50 p-10 rounded-[48px] space-y-8">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                 <span className="px-4 py-2 bg-white rounded-full text-xs font-black shadow-sm uppercase">{comp.shopName}</span>
                                 <h5 className="font-bold text-slate-900">{comp.scraped?.title}</h5>
                              </div>
                              <span className="text-2xl font-black text-slate-900">{comp.scraped?.price?.toLocaleString()} <span className="text-sm opacity-40">so&apos;m</span></span>
                           </div>

                           {/* CUSTOM CHART: CSS Visualizer */}
                           <div className="relative pt-12">
                             <div className="flex items-end h-48 gap-8 px-6">
                                {/* Historical snaps */}
                                {comp.history?.map((snap, sIdx) => (
                                   <div key={sIdx} className="flex-1 flex flex-col items-center group relative">
                                      <div 
                                        className="w-full bg-slate-300 rounded-2xl transition-all hover:bg-red-200"
                                        style={{ height: `${(snap.price || 0) / 10000}px`, maxHeight: '100%' }}
                                      ></div>
                                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-xl">
                                         {new Date(snap.date).toLocaleDateString()} : {snap.price?.toLocaleString()}
                                      </div>
                                   </div>
                                ))}
                                {/* Latest Price bar */}
                                <div className="flex-1 flex flex-col items-center group relative">
                                   <div 
                                     className="w-full bg-red-500 rounded-2xl shadow-xl shadow-red-100"
                                     style={{ height: `${(comp.scraped?.price || 0) / 10000}px`, maxHeight: '100%' }}
                                   ></div>
                                   <p className="text-[10px] font-black uppercase text-red-500 mt-4">Hozir</p>
                                </div>
                             </div>
                             {/* Bottom axis line */}
                             <div className="h-0.5 bg-slate-200 rounded-full w-full"></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
