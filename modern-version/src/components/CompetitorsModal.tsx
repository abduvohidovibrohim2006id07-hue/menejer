"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { 
  X, RefreshCw, ExternalLink, TrendingUp, AlertCircle, 
  History, PieChart, LayoutDashboard, Star, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Globe, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { clsx } from 'clsx';

interface HistorySnapshot {
  date: string;
  price?: number | null;
}

interface Competitor {
  id: string;
  url: string;
  type: 'uzum' | 'yandex';
  metadata?: {
    title?: string;
    image?: string;
    price?: number | null;
    fullPrice?: number | null;
    rating?: number | null;
    reviewsAmount?: number | null;
    shop?: string;
  };
  history?: HistorySnapshot[];
}

interface CompetitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: any[]; // Flexibility for legacy data
  onUpdate: (competitors: any[]) => void;
  productName: string;
  currentProduct?: {
    price: number;
    image: string;
    title: string;
  };
}

export const CompetitorsModal = ({ 
  isOpen, 
  onClose, 
  competitors: initialCompetitors = [], 
  onUpdate, 
  productName,
  currentProduct = { price: 0, image: '', title: productName }
}: CompetitorsModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'dashboard' | 'stats' | 'history' | 'add'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  
  // Add state
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Transform legacy competitors if needed
    const normalized = initialCompetitors.map((c, idx) => ({
      id: c.id || `c-${idx}-${Date.now()}`,
      url: c.url,
      type: c.url.includes('yandex') ? 'yandex' : 'uzum',
      metadata: c.scraped || c.metadata || {},
      history: c.history || []
    })) as Competitor[];
    setCompetitors(normalized);
  }, [initialCompetitors]);

  const saveChanges = (newList: Competitor[]) => {
    setCompetitors(newList);
    onUpdate(newList);
  };

  const refreshCompetitor = async (id: string) => {
    const comp = competitors.find(c => c.id === id);
    if (!comp) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/metadata?url=${encodeURIComponent(comp.url)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const newList = competitors.map(c => {
        if (c.id === id) {
          const oldPrice = c.metadata?.price;
          const newPrice = data.price;
          const history = [...(c.history || [])];
          
          if (oldPrice && newPrice && oldPrice !== newPrice) {
             history.unshift({ date: new Date().toISOString(), price: newPrice });
          }

          return { ...c, metadata: data, history };
        }
        return c;
      });

      saveChanges(newList);
      toast.success("Ma'lumot yangilandi");
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    for (const comp of competitors) {
      await refreshCompetitor(comp.id);
    }
    setLoading(false);
  };

  const handleAddCompetitor = async () => {
    if (!newUrl.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/proxy/metadata?url=${encodeURIComponent(newUrl)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const newComp: Competitor = {
        id: `c-${Date.now()}`,
        url: newUrl,
        type: newUrl.includes('yandex') ? 'yandex' : 'uzum',
        metadata: data,
        history: [{ date: new Date().toISOString(), price: data.price }]
      };

      const newList = [...competitors, newComp];
      saveChanges(newList);
      setNewUrl('');
      setView('dashboard');
      toast.success("Yangi raqobatchi qo'shildi");
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setIsAdding(false);
    }
  };

  const removeCompetitor = (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    const newList = competitors.filter(c => c.id !== id);
    saveChanges(newList);
    toast.success("O'chirildi");
  };

  const getAveragePrice = () => {
    const prices = competitors.map(c => Number(c.metadata?.price)).filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return 0;
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="px-10 py-6 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <TrendingUp size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Raqobatchilar Tahlili</h2>
            <p className="text-slate-500 font-medium text-sm">Real vaqt rejimida narxlar monitoringi</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={refreshAll}
            disabled={loading || competitors.length === 0}
            className="flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Hamma ma'lumotlarni yangilash
          </button>
          
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-8">
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">Menejer</h3>
            <button
              onClick={() => setView('dashboard')}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all",
                view === 'dashboard' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={20} />
              Barcha raqobatchilar
            </button>
            <button
              onClick={() => setView('add')}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all",
                view === 'add' ? "bg-green-50 text-green-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Plus size={20} />
              Yangi qo'shish
            </button>
            <button
              onClick={() => setView('stats')}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all",
                view === 'stats' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <PieChart size={20} />
              Statistika
            </button>
          </div>

          <div className="mt-auto bg-slate-50 rounded-2xl p-5 border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sizning mahsulotingiz</p>
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden p-1 shrink-0">
                 <img src={currentProduct.image} alt="" className="w-full h-full object-contain" />
               </div>
               <div className="overflow-hidden">
                 <p className="text-xs font-bold text-slate-900 truncate">{currentProduct.title}</p>
                 <p className="text-indigo-600 font-black text-sm">{currentProduct.price.toLocaleString()} so'm</p>
               </div>
             </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="max-w-6xl mx-auto">
            
            {view === 'dashboard' && (
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 tracking-tight">Raqobatchilar</h3>
                     <p className="text-slate-500 font-medium">Monitoring ro'yxati ({competitors.length})</p>
                   </div>
                   <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <ArrowUpRight size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">O'rtacha Narx</p>
                        <p className="text-xl font-black text-slate-900">{getAveragePrice().toLocaleString()} so'm</p>
                      </div>
                   </div>
                </div>

                {competitors.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                    <p className="text-xl font-bold text-slate-400 italic">Hali raqobatchilar qo'shilmagan</p>
                    <button onClick={() => setView('add')} className="mt-4 text-indigo-600 font-black uppercase tracking-widest text-sm hover:underline">Yangi qo'shish &rarr;</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {competitors.map((comp) => (
                      <div key={comp.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-6 transition-all hover:shadow-md hover:border-indigo-100">
                        <div className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-2 shrink-0">
                          <img 
                            src={comp.metadata?.image || 'https://via.placeholder.com/150'} 
                            alt="" 
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-widest">
                              <span className={clsx(
                                comp.type === 'uzum' ? "text-yellow-600" : "text-red-500"
                              )}>
                                {comp.type === 'uzum' ? 'Uzum Market' : 'Yandex Market'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 truncate">{comp.metadata?.shop || 'Bozor'}</span>
                           </div>
                           <h4 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                             {comp.metadata?.title || 'Yuklanmoqda...'}
                           </h4>
                           <div className="flex items-center gap-4 mt-2">
                             <a href={comp.url} target="_blank" className="text-indigo-500 hover:underline text-xs font-bold flex items-center gap-1">
                               Ko'rish <ExternalLink size={12} />
                             </a>
                             {comp.metadata?.rating && (
                               <div className="text-orange-500 font-bold text-xs flex items-center gap-1">
                                 <Star size={12} fill="currentColor" /> {comp.metadata.rating}
                               </div>
                             )}
                           </div>
                        </div>

                        <div className="text-right shrink-0 min-w-[150px]">
                           <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Narx</p>
                           <p className="text-2xl font-black text-slate-900 leading-none">
                             {comp.metadata?.price ? Number(comp.metadata.price).toLocaleString() : '—'} 
                             <span className="text-xs font-medium ml-1">so'm</span>
                           </p>
                           {comp.metadata?.price && currentProduct.price > 0 && (
                             <p className={clsx(
                               "text-[10px] font-black mt-1 uppercase",
                               Number(comp.metadata.price) < currentProduct.price ? "text-red-500" : "text-green-500"
                             )}>
                               {Number(comp.metadata.price) < currentProduct.price ? "Sizdan arzon ⬇️" : "Sizdan qimmat ⬆️"}
                             </p>
                           )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => refreshCompetitor(comp.id)}
                            className="p-3 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-xl transition-all"
                            title="Yangilash"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button 
                            onClick={() => removeCompetitor(comp.id)}
                            className="p-3 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-500 rounded-xl transition-all"
                            title="O'chirish"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'add' && (
              <div className="max-w-2xl mx-auto py-10">
                <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-200">
                  <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center text-green-600 mb-8">
                    <Plus size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">Yangi Raqobatchi</h3>
                  <p className="text-slate-500 mb-8 font-medium">Uzum yoki Yandex Market havolasini kiriting</p>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mahsulot Havolasi (URL)</label>
                       <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Globe size={20} />
                         </div>
                         <input 
                           type="text"
                           placeholder="https://market.yandex.uz/product/..."
                           className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium"
                           value={newUrl}
                           onChange={(e) => setNewUrl(e.target.value)}
                         />
                       </div>
                    </div>
                    
                    <button 
                      onClick={handleAddCompetitor}
                      disabled={isAdding || !newUrl}
                      className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 text-lg active:scale-95"
                    >
                      {isAdding ? <RefreshCw size={24} className="animate-spin" /> : <Plus size={24} />}
                      Ro'yxatga qo'shish
                    </button>
                  </div>
                  
                  <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 italic text-xs text-amber-700">
                     <AlertCircle size={16} className="shrink-0" />
                     <span>Ma'lumotlar avtomatik ravishda marketplace sahifasidan skanerlab olinadi.</span>
                  </div>
                </div>
              </div>
            )}

            {view === 'stats' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                  <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <TrendingUp size={24} className="text-indigo-600" />
                    Market Analizi
                  </h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={competitors}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="metadata.shop" 
                          axisLine={false}
                          tickLine={false}
                          fontSize={10}
                          fontWeight="bold"
                        />
                        <YAxis hide />
                        <Tooltip />
                        <Bar dataKey="metadata.price" radius={[10, 10, 0, 0]}>
                           {competitors.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={Number(entry.metadata?.price) < currentProduct.price ? '#ef4444' : '#6366f1'} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="space-y-6">
                   <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl">
                      <h4 className="text-lg font-bold mb-4 opacity-80 uppercase tracking-tighter">O'rtacha Narx</h4>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-black">{getAveragePrice().toLocaleString()}</span>
                        <span className="text-xl font-bold mb-1 opacity-60">so'm</span>
                      </div>
                   </div>
                   <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                      <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" /> AI Tavsiya
                      </h4>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        Mahsulotingiz narxi bozordagi o'rtacha narxdan 
                        <span className="text-indigo-600 font-black px-1.5">{Math.round((currentProduct.price / getAveragePrice()) * 100) - 100}%</span> 
                        farq qilmoqda. Savdolarni oshirish uchun narxni o'zgartirishni ko'rib chiqing.
                      </p>
                   </div>
                </div>
              </div>
            )}

            {view === 'history' && (
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sana</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Platforma</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Store</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yangi Narx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {competitors.flatMap(c => (c.history || []).map(h => ({ ...h, type: c.type, shop: c.metadata?.shop }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-sm font-bold text-slate-500">{new Date(item.date).toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <span className={clsx(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                            item.type === 'uzum' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                          )}>{item.type}</span>
                        </td>
                        <td className="px-8 py-5 text-sm font-black text-slate-900">{item.shop || '—'}</td>
                        <td className="px-8 py-5 font-black text-indigo-600">{item.price?.toLocaleString()} so'm</td>
                      </tr>
                    ))}
                    {competitors.every(c => !c.history?.length) && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">Hozircha o'zgarishlar tarixi yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
