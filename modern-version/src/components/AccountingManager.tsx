"use client";

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Calendar,
  Filter,
  Download,
  Search,
  MoreVertical,
  Banknote,
  Briefcase,
  History,
  Target
} from 'lucide-react';

export const AccountingManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const stats = [
    { label: 'Umumiy Balans', value: '124,500,000 UZS', change: '+12.5%', icon: Wallet, color: 'indigo' },
    { label: 'Kirim (Oy)', value: '45,200,000 UZS', change: '+8.2%', icon: TrendingUp, color: 'emerald' },
    { label: 'Chiqim (Oy)', value: '18,300,000 UZS', change: '-2.4%', icon: TrendingDown, color: 'rose' },
    { label: 'Sof Foyda', value: '26,900,000 UZS', change: '+15.7%', icon: Target, color: 'amber' },
  ];

  const subTabs = [
    { id: 'overview', label: 'Umumiy ko\'rinish', icon: PieChart },
    { id: 'transactions', label: 'Operatsiyalar', icon: History },
    { id: 'wallets', label: 'Hamyonlar', icon: Briefcase },
    { id: 'reports', label: 'Hisobotlar', icon: Banknote },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Buxgalteriya</h2>
          <p className="text-slate-500 mt-2 font-medium">Har bir tiyin hisobda — Biznesingiz moliyaviy nazorati</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:border-indigo-400 transition-all shadow-sm">
            <Download size={20} />
            <span>Eksport</span>
          </button>
          <button className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus size={20} />
            <span>Yangi amallar</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Sub-navigation */}
        <div className="px-8 pt-8 flex gap-8 border-b border-slate-100">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`pb-6 text-sm font-bold flex items-center gap-2 transition-all relative ${
                activeSubTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeSubTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full animate-in slide-in-from-bottom-1" />
              )}
            </button>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-8 flex flex-col md:flex-row gap-4 border-b border-slate-50 bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Tranzaksiyalarni qidirish..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
              <Calendar size={18} />
              <span>Yanvar, 2024</span>
            </button>
            <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
              <Filter size={18} />
              <span>Filtrlar</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 p-8">
          {activeSubTab === 'overview' && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600 mb-6">
                <PieChart size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Moliyaviy tahlilga xush kelibsiz</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-10 font-medium">
                Bu bo'limda sizning biznesingizdagi barcha moliyaviy oqimlar universal va aqlli jadvallar orqali boshqariladi.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                  <h4 className="font-black text-slate-900 mb-2 text-lg">💰 Smart Jadvallar</h4>
                  <p className="text-slate-500 text-sm">Har bir operatsiya real vaqt rejimida hisoblab boriladi va tahlil qilinadi.</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                  <h4 className="font-black text-slate-900 mb-2 text-lg">📊 Avtomatik Hisobot</h4>
                  <p className="text-slate-500 text-sm">Daromad va xarajatlar avtomatik ravishda kategoriyalarga ajratiladi.</p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="pb-4 pt-0 px-4">Sana</th>
                    <th className="pb-4 pt-0 px-4">Kategoriya</th>
                    <th className="pb-4 pt-0 px-4">Tavsif</th>
                    <th className="pb-4 pt-0 px-4">Hamyon</th>
                    <th className="pb-4 pt-0 px-4 text-right">Summa</th>
                    <th className="pb-4 pt-0 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                      <td className="py-5 px-4">
                        <p className="font-bold text-slate-900">12 Yanvar</p>
                        <p className="text-[10px] text-slate-400 font-medium">14:30</p>
                      </td>
                      <td className="py-5 px-4">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Logistika</span>
                      </td>
                      <td className="py-5 px-4">
                        <p className="font-bold text-slate-700">Yuk tashish xarajatlari (Kargo)</p>
                      </td>
                      <td className="py-5 px-4 font-bold text-slate-500">Ipak Yuli Bank</td>
                      <td className="py-5 px-4 text-right">
                        <span className="text-rose-600 font-black">- 1,250,000 UZS</span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
