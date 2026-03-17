import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess: () => void;
  categories?: any[];
}

export const ProductModal = ({ isOpen, onClose, product, onSuccess, categories = [] }: ProductModalProps) => {
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
  });

  const [loading, setLoading] = useState(false);

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
      });
    } else {
      setFormData({
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
      });
    }
  }, [product, isOpen]);

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
            category: data.result.category || prev.category
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
                disabled={!!product}
                placeholder="Masalan: 1001"
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-100 text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all disabled:opacity-50"
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
              <div className="flex justify-between mb-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nomi (UZ)*</label>
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
              <div className="flex justify-between mb-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nomi (RU)</label>
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

            <div className="col-span-1 lg:col-span-2">
               <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kategoriya</label>
               <input 
                 list="category-list"
                 type="text"
                 placeholder="Kategoriyani tanlang yoki yozing..."
                 className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                 value={formData.category}
                 onChange={(e) => setFormData({...formData, category: e.target.value})}
               />
               <datalist id="category-list">
                 {categories.map((c, i) => (
                   <option key={i} value={c.name} />
                 ))}
               </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Short Descriptions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Qisqa tavsif (UZ)</label>
                <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'description_short', 'description_short_ru')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 RU tarjima</button>
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
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest px-1">Qisqa tavsif (RU)</label>
                <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'description_short_ru', 'description_short')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 UZ tarjima</button>
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
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">To'liq tavsif (UZ)</label>
                <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'description_full', 'description_full_ru')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 RU tarjima</button>
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
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">To'liq tavsif (RU)</label>
                <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'description_full_ru', 'description_full')} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-black hover:bg-indigo-100 transition-colors flex items-center gap-1">🤖 UZ tarjima</button>
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
