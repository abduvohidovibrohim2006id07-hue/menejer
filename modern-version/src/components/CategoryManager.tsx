"use client";

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onRefresh: () => void;
}

export const CategoryManager = ({ categories, onRefresh }: CategoryManagerProps) => {
  const [newCat, setNewCat] = useState('');

  const handleAdd = async () => {
    if (!newCat) return;
    try {
      await apiClient.post('/api/categories', { name: newCat });
      setNewCat('');
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await apiClient.delete('/api/categories', id);
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  const handleEdit = async (id: string, oldName: string) => {
    const newName = prompt("Yangi nom:", oldName);
    if (!newName || newName === oldName) return;
    try {
      await apiClient.put('/api/categories', { id, name: newName });
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
           <h3 className="text-3xl font-black text-slate-800 tracking-tight">Kategoriyalar</h3>
           <p className="text-slate-500 font-medium">Barcha kategoriyalarni shu yerdan boshqarishingiz mumkin</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <input 
            type="text" 
            placeholder="Yangi kategoriya nomi..." 
            className="flex-1 md:w-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-bold text-slate-900 transition-all"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <button 
            onClick={handleAdd}
            className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
          >
            <span>+</span> Qo'shish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="p-6 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="font-black text-slate-700 text-lg tracking-tight truncate mr-4">{cat.name}</span>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => handleEdit(cat.id, cat.name)} className="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Tahrirlash">✏️</button>
              <button onClick={() => handleDelete(cat.id)} className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="O'chirish">🗑️</button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
           <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
              <p className="text-slate-400 font-bold italic">Hozircha hech qanday kategoriya yo'q</p>
           </div>
        )}
      </div>
    </div>
  );
};
