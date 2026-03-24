"use client";

import React, { useState } from 'react';

interface Competitor {
  shopName: string;
  url: string;
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

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newShop.trim() || !newUrl.trim()) return;
    onUpdate([...competitors, { shopName: newShop.trim(), url: newUrl.trim() }]);
    setNewShop('');
    setNewUrl('');
  };

  const handleDelete = (index: number) => {
    const next = [...competitors];
    next.splice(index, 1);
    onUpdate(next);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div 
        className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-red-600 to-rose-700 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black tracking-tight">Raqobat Tahlili</h3>
            <p className="text-red-100 text-sm font-medium mt-1 truncate max-w-[400px]">
              {productName}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/20 transition-all text-2xl active:scale-90"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
          {/* Add New Competitor */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Yangi raqobatchi qo&apos;shish</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text"
                placeholder="Do'kon nomi..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 transition-all outline-none text-sm font-bold text-slate-900"
                value={newShop}
                onChange={(e) => setNewShop(e.target.value)}
              />
              <input 
                type="text"
                placeholder="Havola (URL)..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 transition-all outline-none text-sm font-bold text-slate-900"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAdd}
              disabled={!newShop.trim() || !newUrl.trim()}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg text-sm uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
            >
              Raqobatchini qo&apos;shish
            </button>
          </div>

          {/* Competitors List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mavjud raqobatchilar ({competitors.length})</h4>
            {competitors.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-medium">
                Hali raqobatchilar qo&apos;shilmagan
              </div>
            ) : (
              <div className="grid gap-3">
                {competitors.map((comp, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-700">{comp.shopName}</span>
                      <a 
                        href={comp.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-indigo-500 font-bold hover:underline truncate max-w-[300px]"
                      >
                        {comp.url}
                      </a>
                    </div>
                    <button 
                      onClick={() => handleDelete(idx)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 flex justify-center bg-white">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-xl text-sm uppercase tracking-widest"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
