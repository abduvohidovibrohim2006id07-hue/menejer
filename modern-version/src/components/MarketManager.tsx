"use client";

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Market {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface MarketManagerProps {
  markets: Market[];
  onRefresh: () => void;
}

export const MarketManager = ({ markets, onRefresh }: MarketManagerProps) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '',
    color: '#6366f1'
  });

  const handleAdd = async () => {
    if (!formData.id || !formData.name) return;
    try {
      await apiClient.post('/api/markets', formData);
      setFormData({ id: '', name: '', icon: '', color: '#6366f1' });
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu do'konni o'chiramizmi?")) return;
    try {
      await apiClient.delete('/api/markets', id);
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  const handleEdit = async (m: Market) => {
    setFormData({ id: m.id, name: m.name, icon: m.icon, color: m.color });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="mb-6">
           <h3 className="text-3xl font-black text-slate-800 tracking-tight">Do'konlar Sozlamalari (Markets)</h3>
           <p className="text-slate-500 font-medium">Sotuv platformalarini shu yerda boshqaring</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            type="text" 
            placeholder="ID (slug) masalan: uzum" 
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
            value={formData.id}
            onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase()})}
          />
          <input 
            type="text" 
            placeholder="Do'kon nomi" 
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <input 
            type="text" 
            placeholder="Ikonka (Emoji yoki harf)" 
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
            value={formData.icon}
            onChange={(e) => setFormData({...formData, icon: e.target.value})}
          />
          <div className="flex gap-3">
            <input 
              type="color" 
              className="w-16 h-full p-1 bg-white border border-slate-200 rounded-2xl cursor-pointer shadow-sm"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
            />
            <button 
              onClick={handleAdd}
              className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100"
            >
              Saqlash
            </button>
          </div>
        </div>
      </div>

      {markets.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
           <p className="text-xl text-slate-300 font-black italic">Hozircha hech qanday do'kon qo'shilmagan</p>
           <p className="text-sm text-slate-400 font-medium mt-2">Yuqoridagi formadan foydalanib yangi do'kon qo'shishingiz mumkin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markets.map((m) => (
            <div key={m.id} className="p-6 bg-white border border-slate-100 rounded-[28px] hover:border-indigo-200 hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg"
                  style={{ backgroundColor: m.color }}
                >
                  {m.icon || m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 truncate">{m.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.id}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <button onClick={() => handleEdit(m)} className="flex-1 py-2.5 bg-slate-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-xs">✏️ Tahrirlash</button>
                <button onClick={() => handleDelete(m.id)} className="flex-1 py-2.5 bg-slate-50 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors text-xs">🗑️ O'chirish</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
