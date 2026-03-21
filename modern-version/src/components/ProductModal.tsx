import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess: () => void;
  categories?: any[];
  markets?: any[];
  allProducts?: any[];
}

export const ProductModal = ({ isOpen, onClose, product, onSuccess, categories = [], markets = [], allProducts = [] }: ProductModalProps) => {
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    name_ru: '',
    price: '',
    category: '',
    brand: '',
    model: '',
    color: '',
    description_short: '',
    description_full: '',
    description_short_ru: '',
    description_full_ru: '',
    status: 'active',
    marketplaces: [],
    warehouse_data: {},
    price_retail: '',
  });

  const [loading, setLoading] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id || '',
        name: product.name || '',
        name_ru: product.name_ru || '',
        price: product.price || '',
        category: product.category || '',
        brand: product.brand || '',
        model: product.model || '',
        color: product.color || '',
        description_short: product.description_short || '',
        description_full: product.description_full || '',
        description_short_ru: product.description_short_ru || '',
        description_full_ru: product.description_full_ru || '',
        status: product.status || 'active',
        marketplaces: product.marketplaces || [],
        warehouse_data: product.warehouse_data || {},
        price_retail: product.price_retail || '',
      });
    } else {
      // Automatic ID generation for NEW product
      let nextId = "10001";
      if (allProducts.length > 0) {
        const ids = allProducts.map(p => parseInt(p.id) || 0).filter(id => !isNaN(id));
        if (ids.length > 0) {
          nextId = (Math.max(...ids) + 1).toString();
        }
      }

      setFormData({
        id: nextId,
        name: '',
        name_ru: '',
        price: '',
        category: '',
        brand: '',
        model: '',
        color: '',
        description_short: '',
        description_full: '',
        description_short_ru: '',
        description_full_ru: '',
        status: 'active',
        marketplaces: [],
        warehouse_data: {},
        price_retail: '',
      });
    }
  }, [product, isOpen, allProducts]);

  const handleAIAction = async (action: string, field: string, targetField: string) => {
    setLoading(true);
    try {
      const data = await apiClient.post('/api/ai', { 
        action, 
        text: formData[field],
        context: {
          ...formData,
          images: product?.local_images || []
        }
      });
      
      console.log("--- AI DEBUG LOGS ---", data);

      if (data.result) {
        if (typeof data.result === 'object') {
          setFormData((prev: any) => ({
            ...prev,
            name: data.result.uz?.name || prev.name,
            name_ru: data.result.ru?.name || prev.name_ru,
            description_short: data.result.uz?.short || prev.description_short,
            description_short_ru: data.result.ru?.short || prev.description_short_ru,
            description_full: data.result.uz?.full || prev.description_full,
            description_full_ru: data.result.ru?.full || prev.description_full_ru,
            brand: data.result.brand || prev.brand,
            model: data.result.model || prev.model,
            color: data.result.color || prev.color,
            category: data.result.category || prev.category,
            marketId: data.result.marketId || prev.marketId,
          }));
        } else {
          setFormData((prev: any) => ({ ...prev, [targetField]: data.result }));
        }
      }
    } catch (error: any) {
      console.error("AI action failed", error);
      alert(error.message || "AI xatoligi yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const syncProductToMarket = async (market: any, cabinet: any) => {
    if (!product?.id) {
       alert("Avval mahsulotni saqlang!");
       return;
    }
    
    setLoading(true);
    try {
      const res = await apiClient.post('/api/markets/uzum/sync', {
        productId: product.id,
        cabinetId: cabinet.id,
      });
      
      if (res.success) {
        alert(res.message);
      } else {
        alert("Xato: " + res.message);
      }
    } catch (err: any) {
      alert("Xatolik yuz berdi: " + (err.message || "Noalum xato"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/api/products', formData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Save failed", error);
      alert("Xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 md:p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white relative">
          <div>
            <h3 className="text-lg md:text-2xl font-black">{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</h3>
            <p className="text-indigo-100 text-[10px] md:text-sm mt-0.5 md:mt-1">{product ? `ID: ${product.id}` : "Barcha ma'lumotlarni to'ldiring"}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {product?.local_images?.some((url: string) => !url.toLowerCase().endsWith('.mp4')) && (
              <button 
                type="button"
                onClick={() => handleAIAction('generate_from_image', '', '')}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 px-3 md:px-4 py-2 rounded-xl font-black text-[10px] md:text-sm transition-all flex items-center gap-1.5 md:gap-2 border border-white/20 shadow-lg backdrop-blur-sm"
              >
                <span>✨</span> <span className="hidden sm:inline">Rasmdan ma'lumot olish (AI)</span><span className="sm:hidden">AI Tahlil</span>
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xl md:text-2xl">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">ID (O'zgartirib bo'lmaydi)*</label>
              <input 
                type="text" 
                required 
                disabled={true} // System generates ID
                placeholder="Tizim ozi yozadi..."
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-100 text-slate-500 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-not-allowed"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Brend</label>
              <input 
                type="text"
                placeholder="Masalan: KEMEI"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Model</label>
              <input 
                type="text"
                placeholder="Masalan: KM-3012"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
              />
            </div>

            <div className="col-span-1">
               <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rang</label>
               <input 
                 type="text"
                 placeholder="Masalan: Qora, Oq, Purple"
                 className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                 value={formData.color}
                 onChange={(e) => setFormData({...formData, color: e.target.value})}
               />
            </div>

            <div className="col-span-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex gap-2 items-center">
                  Nomi (UZ)*
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.name?.length || 0}</span>
                </label>
                <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'name', 'name_ru')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors tracking-tighter flex items-center gap-1">🤖 RU tarjima</button>
              </div>
              <input 
                type="text" required
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="col-span-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex gap-2 items-center">
                  Nomi (RU)
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.name_ru?.length || 0}</span>
                </label>
                <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'name_ru', 'name')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors tracking-tighter flex items-center gap-1">🤖 UZ tarjima</button>
              </div>
              <input 
                type="text"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.name_ru}
                onChange={(e) => setFormData({...formData, name_ru: e.target.value})}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Narxi (Raqamda)</label>
              <input 
                type="text"
                placeholder="315000"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Chakana narx</label>
              <input 
                type="text"
                placeholder="350000"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                value={formData.price_retail}
                onChange={(e) => setFormData({...formData, price_retail: e.target.value})}
              />
            </div>

            <div className="col-span-1 lg:col-span-2 relative">
               <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kategoriya*</label>
               <div className="relative">
                 <input 
                   type="text"
                   placeholder="Kategoriyani tanlang yoki yangi yozing..."
                   className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                   value={formData.category}
                   autoComplete="off"
                   onFocus={() => setIsCatOpen(true)}
                   onBlur={() => setTimeout(() => setIsCatOpen(false), 200)}
                   onChange={(e) => {
                     setFormData({...formData, category: e.target.value});
                     setIsCatOpen(true);
                   }}
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                   {isCatOpen ? "▲" : "▼"}
                 </div>

                 {isCatOpen && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] max-h-[250px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-hide">
                     <div className="sticky top-0 bg-slate-50 p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       Mavjud kategoriyalar
                     </div>
                     {categories
                       .filter(c => c.name.toLowerCase().includes((formData.category || "").toLowerCase()))
                       .length > 0 ? (
                         categories
                           .filter(c => c.name.toLowerCase().includes((formData.category || "").toLowerCase()))
                           .map((c, i) => (
                             <button
                               key={i}
                               type="button"
                               onClick={() => {
                                 setFormData({...formData, category: c.name});
                                 setIsCatOpen(false);
                               }}
                               className="w-full text-left px-5 py-4 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                             >
                               <span className="font-bold text-slate-700 group-hover:text-indigo-600">{c.name}</span>
                               <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-lg uppercase font-black">Tanlash</span>
                             </button>
                           ))
                       ) : (
                         <div className="p-5 text-center text-slate-400 italic font-medium">
                           Mos kategoriya topilmadi. Yangi yozishingiz mumkin.
                         </div>
                       )}
                   </div>
                 )}
               </div>
            </div>

            {/* STATUS SELECTION */}
            <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-[24px] border border-slate-200">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Mahsulot Holati (Status)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'active', label: '✅ Faol', color: 'emerald' },
                  { id: 'quarantine', label: '⚠️ Karantin', color: 'amber' },
                  { id: 'archive', label: '📁 Arxiv', color: 'slate' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: s.id })}
                    className={`p-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                      formData.status === s.id 
                        ? `bg-${s.color}-50 border-${s.color}-500 text-${s.color}-700 shadow-lg shadow-${s.color}-100 scale-[1.02]` 
                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MARKETPLACES */}
            <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-[24px] border border-slate-200">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Sotuv bozorlari (Marketplaces)</label>
              <div className="flex flex-wrap gap-3">
                {markets.map((m) => {
                  const isSelected = formData.marketplaces?.includes(m.id);
                  const isInstagram = m.id === 'instagram';
                  
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const mps = formData.marketplaces || [];
                        const next = isSelected 
                          ? mps.filter((x: string) => x !== m.id)
                          : [...mps, m.id];
                        setFormData({ ...formData, marketplaces: next });
                      }}
                      className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-3 border-2 ${
                        isSelected 
                          ? 'border-indigo-600 shadow-lg scale-[1.05] z-10' 
                          : 'border-transparent bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-200'
                      }`}
                      style={isSelected ? {
                        borderColor: m.color,
                        boxShadow: `0 10px 15px -3px ${m.color}40`,
                        backgroundColor: `${m.color}15`,
                        color: m.color
                      } : {}}
                    >
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm"
                        style={{ 
                          backgroundColor: m.color !== 'gradient' ? m.color : undefined,
                          background: isInstagram || m.color === 'gradient' ? 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)' : undefined,
                          color: m.textColor || 'white'
                        }}
                      >
                        {m.icon || m.short || m.name.charAt(0)}
                      </div>
                      {m.name || m.label}
                    </button>
                  );
                })}
                {markets.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Hali hech qanday do'kon sozlanmagan.</p>
                )}
              </div>

              {/* DYNAMIC WAREHOUSE SETTINGS PER SELECTED MARKET */}
              {formData.marketplaces?.length > 0 && markets.filter((m: any) => formData.marketplaces.includes(m.id)).some((m: any) => m.accounts?.length > 0) && (
                 <div className="mt-6 space-y-4">
                   {markets.filter((m: any) => formData.marketplaces.includes(m.id)).map((m: any) => {
                      if (!m.accounts?.length) return null;
                      const whs: any[] = [];
                      m.accounts.forEach((acc: any) => acc.cabinets?.forEach((cab: any) => cab.warehouses?.forEach((wh: any) => whs.push({ acc, cab, wh }))));
                      if (whs.length === 0) return null;
                      
                      return (
                        <div key={m.id} className="p-4 border rounded-[20px] transition-all" style={{ borderColor: `${m.color}40`, backgroundColor: `${m.color}08` }}>
                          <h6 className="text-[10px] font-black uppercase mb-3 flex items-center gap-2" style={{ color: m.color }}>
                            {m.icon} {m.name} do'kon omborlari va SKU'lar
                          </h6>
                          <div className="space-y-3">
                            {whs.map((w, i) => {
                               const skuKey = `sku_${m.id}_${w.wh.id}`;
                               const stockKey = `stock_${m.id}_${w.wh.id}`;
                               return (
                                                    <div key={i} className="bg-white/70 p-4 rounded-[20px] border border-white shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                     <div>
                                        <p className="text-[10px] text-slate-400 font-bold mb-0.5 tracking-widest uppercase">Ombor ({w.cab.name})</p>
                                        <p className="text-sm font-black text-slate-800">{w.wh.name}</p>
                                     </div>
                                     <div className="flex items-center gap-3">
                                       <button 
                                         type="button"
                                         onClick={() => syncProductToMarket(m, w.cab)}
                                         className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                                       >
                                         🚀 Uzumga Yuklash
                                       </button>
                                       <div className="flex items-center justify-between sm:justify-start gap-2 bg-amber-50 rounded-xl pr-2 border border-amber-200">
                                          <span className="text-[10px] font-black text-amber-700 ml-4 tracking-widest uppercase">Qoldiq:</span>
                                          <input 
                                            type="number" 
                                            placeholder="0" 
                                            className="w-24 bg-transparent border-0 p-2.5 text-sm font-black text-amber-900 text-center outline-none" 
                                            value={formData.warehouse_data?.[stockKey] || ''} 
                                            onChange={e => setFormData((p: any) => ({...p, warehouse_data: {...p.warehouse_data, [stockKey]: parseInt(e.target.value) || 0}}))} 
                                          />
                                       </div>
                                     </div>
                                   </div>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
                                     {[
                                       { k: 'sku', l: 'SKU Kod' }, 
                                       { k: 'skuId', l: 'SKU ID' }, 
                                       { k: 'groupId', l: 'Grup ID' }, 
                                       { k: 'groupSku', l: 'Grup SKU Kod' },
                                       { k: 'marketId', l: 'Bozordagi ID (Uzum)' }
                                     ].map(f => {
                                        const key = `${f.k}_${m.id}_${w.wh.id}`;
                                        return (
                                           <div key={f.k}>
                                             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{f.l}</label>
                                             <input
                                               type="text"
                                               placeholder="Kodni kiriting"
                                               className="w-full border border-slate-200 bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-300 focus:ring-2 outline-none focus:ring-indigo-500/20 shadow-sm"
                                               value={formData.warehouse_data?.[key] || ''}
                                               onChange={e => setFormData((p: any) => ({...p, warehouse_data: {...p.warehouse_data, [key]: e.target.value}}))}
                                             />
                                           </div>
                                        )
                                     })}
                                   </div>
                                 </div>
                               )
                            })}
                          </div>
                        </div>
                      )
                   })}
                 </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Short Descriptions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex gap-2 items-center">
                  Qisqa tavsif (UZ)
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.description_short?.length || 0}</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAIAction('generate_short', 'description_short', 'description_short')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 AI Matn</button>
                  <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'description_short', 'description_short_ru')} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-1">🤖 RU tarjima</button>
                </div>
              </div>
              <textarea 
                className="w-full p-5 rounded-3xl border border-slate-200 bg-white text-slate-900 font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[120px] transition-all shadow-sm leading-relaxed"
                value={formData.description_short}
                onChange={(e) => setFormData({...formData, description_short: e.target.value})}
                placeholder="Qisqa ma'lumot yozing..."
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex gap-2 items-center">
                  Qisqa tavsif (RU)
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.description_short_ru?.length || 0}</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAIAction('generate_short_ru', 'description_short_ru', 'description_short_ru')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 AI Matn</button>
                  <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'description_short_ru', 'description_short')} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-1">🤖 UZ tarjima</button>
                </div>
              </div>
              <textarea 
                className="w-full p-5 rounded-3xl border border-slate-200 bg-white text-slate-900 font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[120px] transition-all shadow-sm leading-relaxed"
                value={formData.description_short_ru}
                onChange={(e) => setFormData({...formData, description_short_ru: e.target.value})}
                placeholder="Краткое описание на русском..."
              />
            </div>

            {/* Full Descriptions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex gap-2 items-center">
                  To'liq tavsif (UZ)
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.description_full?.length || 0}</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAIAction('generate_full', 'description_full', 'description_full')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 AI Matn</button>
                  <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'description_full', 'description_full_ru')} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-1">🤖 RU tarjima</button>
                </div>
              </div>
              <textarea 
                className="w-full p-5 rounded-3xl border border-slate-200 bg-white text-slate-900 font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[200px] transition-all shadow-sm leading-relaxed"
                value={formData.description_full}
                onChange={(e) => setFormData({...formData, description_full: e.target.value})}
                placeholder="Mahsulot haqida batafsil ma'lumot..."
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex gap-2 items-center">
                  To'liq tavsif (RU)
                  <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold">{formData.description_full_ru?.length || 0}</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAIAction('generate_full_ru', 'description_full_ru', 'description_full_ru')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 AI Matn</button>
                  <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'description_full_ru', 'description_full')} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-1">🤖 UZ tarjima</button>
                </div>
              </div>
              <textarea 
                className="w-full p-5 rounded-3xl border border-slate-200 bg-white text-slate-900 font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[200px] transition-all shadow-sm leading-relaxed"
                value={formData.description_full_ru}
                onChange={(e) => setFormData({...formData, description_full_ru: e.target.value})}
                placeholder="Полное описание на русском..."
              />
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-white">
          <button 
            onClick={onClose} 
            className="px-8 py-4 font-black text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
          >
            Yopish
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-12 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saqlanmoqda...
              </>
            ) : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
};
