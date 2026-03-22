"use client";

import React, { useState, useEffect } from 'react';

interface PriceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrice?: string;
  productName?: string;
}

export const PriceCalculatorModal = ({ isOpen, onClose, initialPrice = '0', productName = '' }: PriceCalculatorModalProps) => {
  const [sellingPrice, setSellingPrice] = useState<number>(Number(initialPrice) || 0);
  const [productCost, setProductCost] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number>(17);
  const [logisticsFee, setLogisticsFee] = useState<number>(8000);
  
  // Results
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [payout, setPayout] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(0);

  useEffect(() => {
    const comm = Math.round(sellingPrice * (commissionPercent / 100));
    const pay = sellingPrice - comm - logisticsFee;
    const profit = pay - productCost;
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

    setCommissionAmount(comm);
    setPayout(pay);
    setNetProfit(profit);
    setProfitMargin(margin);
  }, [sellingPrice, productCost, commissionPercent, logisticsFee]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div 
        className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black tracking-tight">Narx Hisoblagich</h3>
            <p className="text-indigo-100 text-sm font-medium mt-1 truncate max-w-[400px]">
              {productName || "Mahsulot daromadini hisoblash"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/20 transition-all text-2xl active:scale-90"
          >
            &times;
          </button>
          
          {/* Decorative circles */}
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
          {/* Main Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sotish narxi (so'm)</label>
              <div className="relative group">
                <input 
                  type="number"
                  className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm group-hover:border-indigo-300"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  placeholder="0"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">💰</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asl narxi (Tan narxi)</label>
              <div className="relative group">
                <input 
                  type="number"
                  className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm group-hover:border-indigo-300"
                  value={productCost || ''}
                  onChange={(e) => setProductCost(Number(e.target.value))}
                  placeholder="0"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">🏷️</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Komissiya (%)</label>
              <div className="relative group flex items-center gap-3">
                <input 
                  type="number"
                  className="flex-1 p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm group-hover:border-indigo-300"
                  value={commissionPercent || ''}
                  onChange={(e) => setCommissionPercent(Number(e.target.value))}
                />
                <div className="flex flex-wrap gap-1 max-w-[120px]">
                  {[10, 15, 17, 20].map(val => (
                    <button 
                      key={val}
                      onClick={() => setCommissionPercent(val)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all ${commissionPercent === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logistika xarajati (so'm)</label>
              <div className="relative group">
                <input 
                  type="number"
                  className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm group-hover:border-indigo-300"
                  value={logisticsFee || ''}
                  onChange={(e) => setLogisticsFee(Number(e.target.value))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">🚚</span>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
               <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">UZUM MARKET</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sizga tegadigan summa</p>
                <p className="text-3xl font-black text-slate-900">{payout.toLocaleString()} <span className="text-sm text-slate-400">so'm</span></p>
                <p className="text-[10px] text-slate-400 font-medium">Komissiya: -{commissionAmount.toLocaleString()} ({commissionPercent}%)</p>
                <p className="text-[10px] text-slate-400 font-medium">Logistika: -{logisticsFee.toLocaleString()} so'm</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Suntiy Foyda (Sof)</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-4xl font-black ${netProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString()}
                  </p>
                  <span className="text-sm font-bold text-slate-400">so'm</span>
                </div>
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${netProfit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {profitMargin.toFixed(1)}% MARJA
                </div>
              </div>
            </div>

            {/* Warning Message */}
            {netProfit <= 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                <div className="text-2xl">⚠️</div>
                <p className="text-xs font-bold text-red-700 leading-tight">
                  DIQQAT: Ushbu narxda sotsangiz zarar ko'rasiz! Sotish narxini oshiring yoki xarajatlarni kamaytiring.
                </p>
              </div>
            )}

            {netProfit > 0 && netProfit < sellingPrice * 0.1 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="text-2xl">💡</div>
                <p className="text-xs font-bold text-amber-700 leading-tight">
                  Kichik foyda: Marja 10% dan kam. Reklama xarajatlarini hisobga olsak, deyarli foydasiz bo'lishi mumkin.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 flex justify-center bg-white">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-xl text-sm uppercase tracking-widest"
          >
            Tushunarli
          </button>
        </div>
      </div>
    </div>
  );
};
