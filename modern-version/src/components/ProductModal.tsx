"use client";

import React, { useState, useEffect } from 'react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess: () => void;
}

export const ProductModal = ({ isOpen, onClose, product, onSuccess }: ProductModalProps) => {
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    name_ru: '',
    price: '',
    category: '',
    brand: '',
    model: '',
    description_short: '',
    description_full: '',
    description_short_ru: '',
    description_full_ru: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        id: '',
        name: '',
        name_ru: '',
        price: '',
        category: '',
        brand: '',
        model: '',
        description_short: '',
        description_full: '',
        description_short_ru: '',
        description_full_ru: '',
      });
    }
  }, [product, isOpen]);

  const handleAIAction = async (action: string, field: string, targetField: string) => {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text: formData[field] })
      });
      const data = await response.json();
      if (data.result) {
        setFormData((prev: any) => ({ ...prev, [targetField]: data.result }));
      }
    } catch (error) {
      console.error("AI action failed", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <h3 className="text-xl font-bold">{product ? "Tahrirlash" : "Yangi mahsulot"}</h3>
          <button onClick={onClose} className="text-2xl hover:opacity-70">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">ID (Majburiy)*</label>
              <input 
                type="text" 
                required 
                disabled={!!product}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Nomi (UZ)*</label>
                <button type="button" onClick={() => handleAIAction('translate_uz_ru', 'name', 'name_ru')} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">🤖 RU</button>
              </div>
              <input 
                type="text" required
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Nomi (RU)</label>
                <button type="button" onClick={() => handleAIAction('translate_ru_uz', 'name_ru', 'name')} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">🤖 UZ</button>
              </div>
              <input 
                type="text"
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                value={formData.name_ru}
                onChange={(e) => setFormData({...formData, name_ru: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Narxi</label>
              <input 
                type="text"
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Kategoriya</label>
              <input 
                type="text"
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Qisqa tavsif (UZ)</label>
                <button type="button" onClick={() => handleAIAction('translate_desc_uz_ru', 'description_short', 'description_short_ru')} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">🤖 RU</button>
              </div>
              <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 outline-none min-h-[80px]"
                value={formData.description_short}
                onChange={(e) => setFormData({...formData, description_short: e.target.value})}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-bold text-slate-700">Qisqa tavsif (RU)</label>
              </div>
              <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 outline-none min-h-[80px]"
                value={formData.description_short_ru}
                onChange={(e) => setFormData({...formData, description_short_ru: e.target.value})}
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Yopish</button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
};
