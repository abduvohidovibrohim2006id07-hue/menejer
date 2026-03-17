"use client";

import React, { useState } from 'react';

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
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat })
    });
    setNewCat('');
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    onRefresh();
  };

  const handleEdit = async (id: string, oldName: string) => {
    const newName = prompt("Yangi nom:", oldName);
    if (!newName || newName === oldName) return;
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newName })
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800">Kategoriyalar</h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Yangi kategoriya..." 
            className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <button 
            onClick={handleAdd}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            + Qo'shish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="p-5 bg-white border border-slate-200 rounded-2xl flex justify-between items-center hover:border-indigo-300 transition-colors shadow-sm group">
            <span className="font-bold text-slate-700">{cat.name}</span>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(cat.id, cat.name)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">✏️</button>
              <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
