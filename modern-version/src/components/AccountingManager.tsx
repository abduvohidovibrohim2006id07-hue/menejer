"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Target,
  Settings,
  Users,
  CreditCard,
  Building2,
  Trash2,
  Edit2,
  ChevronRight,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Types
type TabType = 'overview' | 'transactions' | 'wallets' | 'partners' | 'settings';

interface Entity {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  entity_id: string;
  name: string;
  bank_name: string;
  mfo: string;
  account_number: string;
  balance: number;
}

interface Card {
  id: string;
  bank_account_id: string;
  card_number: string;
  bank_name: string;
  balance: number;
}

interface CashVault {
  id: string;
  name: string;
  balance: number;
}

interface Partner {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  phone_numbers?: string[];
  total_debt_uzs: number;
}

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  currency: 'UZS' | 'USD';
  exchange_rate: number;
  amount_original: number;
  amount_uzs: number;
  payment_type: 'CASH' | 'CARD' | 'BANK' | 'DEBT';
  is_income: boolean;
  partner_id?: string;
  partner?: Partner;
  cash_vault_id?: string;
  card_id?: string;
  bank_account_id?: string;
  attachment_url?: string;
}

export const AccountingManager = () => {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [entities, setEntities] = useState<Entity[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [cashVaults, setCashVaults] = useState<CashVault[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Modal States
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: entitiesData },
        { data: bankAccountsData },
        { data: cardsData },
        { data: cashVaultsData },
        { data: partnersData },
        { data: transactionsData }
      ] = await Promise.all([
        supabase.from('accounting_legal_entities').select('*').order('name'),
        supabase.from('accounting_bank_accounts').select('*').order('name'),
        supabase.from('accounting_cards').select('*').order('created_at'),
        supabase.from('accounting_cash_vaults').select('*').order('name'),
        supabase.from('accounting_partners').select('*').order('name'),
        supabase.from('accounting_transactions').select('*, partner:accounting_partners(*)').order('transaction_date', { ascending: false }).limit(20)
      ]);

      setEntities(entitiesData || []);
      setBankAccounts(bankAccountsData || []);
      setCards(cardsData || []);
      setCashVaults(cashVaultsData || []);
      setPartners(partnersData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalBalance = 
    bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0) + 
    cards.reduce((sum, card) => sum + Number(card.balance), 0) + 
    cashVaults.reduce((sum, vault) => sum + Number(vault.balance), 0);

  const stats = [
    { label: 'Umumiy Balans', value: `${totalBalance.toLocaleString()} UZS`, change: '+12.5%', icon: Wallet, color: 'indigo' },
    { label: 'Debitorlik (Qarz)', value: `${partners.filter(p => p.total_debt_uzs > 0).reduce((sum, p) => sum + Number(p.total_debt_uzs), 0).toLocaleString()} UZS`, change: '+8.2%', icon: Users, color: 'emerald' },
    { label: 'Kreditorlik (Qarz)', value: `${Math.abs(partners.filter(p => p.total_debt_uzs < 0).reduce((sum, p) => sum + Number(p.total_debt_uzs), 0)).toLocaleString()} UZS`, change: '-2.4%', icon: TrendingDown, color: 'rose' },
    { label: 'Sof Foyda', value: '26,900,000 UZS', change: '+15.7%', icon: Target, color: 'amber' },
  ];

  const subTabs = [
    { id: 'overview', label: 'Umumiy ko\'rinish', icon: PieChart },
    { id: 'transactions', label: 'Amallar', icon: History },
    { id: 'wallets', label: 'Hisoblar', icon: Briefcase },
    { id: 'partners', label: 'Hamkorlar', icon: Users },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">💰 Buxgalteriya</h2>
          <p className="text-slate-500 mt-2 font-medium">Har bir tiyin hisobda — Biznesingiz moliyaviy nazorati</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:border-indigo-400 transition-all shadow-sm">
            <Download size={20} />
            <span>Eksport</span>
          </button>
          <button 
            onClick={() => setShowTransactionModal(true)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={20} />
            <span>Yangi amal</span>
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
        <div className="px-8 pt-8 flex gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as TabType)}
              className={`pb-6 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${
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

        {/* Filters and Search Bar (Only for transactions) */}
        {activeSubTab === 'transactions' && (
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
                <span>Bugun</span>
              </button>
              <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
                <Filter size={18} />
                <span>Filtrlar</span>
              </button>
            </div>
          </div>
        )}

        {/* View Content */}
        <div className="flex-1 p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeSubTab === 'overview' && <OverviewView transactions={transactions} partners={partners} />}
              {activeSubTab === 'transactions' && <TransactionsView transactions={transactions} onRefresh={fetchData} />}
              {activeSubTab === 'wallets' && <WalletsView bankAccounts={bankAccounts} cards={cards} cashVaults={cashVaults} onRefresh={fetchData} />}
              {activeSubTab === 'partners' && <PartnersView partners={partners} onRefresh={fetchData} />}
              {activeSubTab === 'settings' && <SettingsView entities={entities} onRefresh={fetchData} />}
            </>
          )}
        </div>
      </div>

      {/* Transaction Modal Placeholder */}
      {showTransactionModal && (
        <TransactionFormModal 
          isOpen={showTransactionModal} 
          onClose={() => setShowTransactionModal(false)}
          onSuccess={() => {
            setShowTransactionModal(false);
            fetchData();
          }}
          partners={partners}
          cashVaults={cashVaults}
          cards={cards}
          bankAccounts={bankAccounts}
          entities={entities}
        />
      )}
    </div>
  );
};

// Sub-components for better organization

const OverviewView = ({ transactions, partners }: { transactions: Transaction[], partners: Partner[] }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Recent Activity */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <History size={20} className="text-indigo-600" />
          So'nggi amallar
        </h3>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${tx.is_income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {tx.is_income ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{tx.description || 'Tavsif yo\'q'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {new Date(tx.transaction_date).toLocaleDateString()} • {tx.payment_type}
                  </p>
                </div>
              </div>
              <p className={`font-black ${tx.is_income ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.is_income ? '+' : '-'} {tx.amount_uzs.toLocaleString()} UZS
              </p>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center text-slate-400 py-10 font-medium">Hozircha amallar yo'q</p>}
        </div>
      </div>

      {/* Partner Debts */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          Hamkorlar qarzdorligi
        </h3>
        <div className="space-y-4">
          {partners.filter(p => Math.abs(p.total_debt_uzs) > 0).slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black">
                  {p.name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {p.total_debt_uzs > 0 ? 'Ulardan haqdorlik' : 'Ularga qarzmiz'}
                  </p>
                </div>
              </div>
              <p className={`font-black ${p.total_debt_uzs > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Math.abs(p.total_debt_uzs).toLocaleString()} UZS
              </p>
            </div>
          ))}
          {partners.length === 0 && <p className="text-center text-slate-400 py-10 font-medium">Hamkorlar ro'yxati bo'sh</p>}
        </div>
      </div>
    </div>
  </div>
);

const TransactionsView = ({ transactions, onRefresh }: { transactions: Transaction[], onRefresh: () => void }) => {
  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu amalni o\'chirishga ishonchingiz komilmi?')) return;
    const { error } = await supabase.from('accounting_transactions').delete().eq('id', id);
    if (error) toast.error('Xatolik yuz berdi');
    else {
      toast.success('Amal o\'chirildi');
      onRefresh();
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <th className="pb-4 pt-0 px-4">Sana / Vaqt</th>
            <th className="pb-4 pt-0 px-4">Turi</th>
            <th className="pb-4 pt-0 px-4">Tavsif / Hamkor</th>
            <th className="pb-4 pt-0 px-4">To'lov turi</th>
            <th className="pb-4 pt-0 px-4 text-right">Summa (UZS)</th>
            <th className="pb-4 pt-0 px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {transactions.map((tx) => (
            <tr key={tx.id} className="group hover:bg-slate-50/50 transition-all">
              <td className="py-5 px-4">
                <p className="font-bold text-slate-900">{new Date(tx.transaction_date).toLocaleDateString()}</p>
                <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </td>
              <td className="py-5 px-4">
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  tx.is_income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {tx.is_income ? 'Kirim' : 'Chiqim'}
                </span>
              </td>
              <td className="py-5 px-4">
                <p className="font-bold text-slate-700">{tx.description || '—'}</p>
                <p className="text-xs text-slate-400 font-medium">{tx.partner?.name || 'Kategoriyasiz'}</p>
              </td>
              <td className="py-5 px-4">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tight">
                  {tx.payment_type === 'CASH' && <Banknote size={14} className="text-amber-500" />}
                  {tx.payment_type === 'CARD' && <CreditCard size={14} className="text-blue-500" />}
                  {tx.payment_type === 'BANK' && <Building2 size={14} className="text-indigo-500" />}
                  {tx.payment_type === 'DEBT' && <Users size={14} className="text-rose-500" />}
                  {tx.payment_type}
                </div>
              </td>
              <td className="py-5 px-4 text-right">
                <p className={`font-black ${tx.is_income ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.is_income ? '+' : '-'} {tx.amount_uzs.toLocaleString()}
                </p>
                {tx.currency === 'USD' && (
                  <p className="text-[10px] text-slate-400 font-bold">
                    ({tx.amount_original.toLocaleString()} $)
                  </p>
                )}
              </td>
              <td className="py-5 px-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(tx.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="py-20 text-center text-slate-400 font-medium">Hozircha amallar mavjud emas</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
};

const WalletsView = ({ bankAccounts, cards, cashVaults, onRefresh }: { bankAccounts: BankAccount[], cards: Card[], cashVaults: CashVault[], onRefresh: () => void }) => {
  return (
    <div className="space-y-10">
      {/* Cash Wallets */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Banknote size={24} /></div>
            Naqd pul hamyonlari
          </h3>
          <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-amber-400 transition-all shadow-sm">
            <Plus size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cashVaults.map(vault => (
            <div key={vault.id} className="p-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[32px] text-white shadow-xl shadow-amber-100 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">{vault.name}</p>
                <h4 className="text-3xl font-black mb-8">{vault.balance.toLocaleString()} <span className="text-xl font-bold opacity-80">UZS</span></h4>
                <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/10 backdrop-blur-md">
                    <ArrowRightLeft size={16} /> O'tkazma
                  </button>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-150 transition-transform duration-700">
                <Banknote size={200} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bank Accounts & Cards */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={24} /></div>
            Bank hisoblari va Kartalar
          </h3>
          <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-blue-400 transition-all shadow-sm">
            <Plus size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bankAccounts.map(account => (
            <div key={account.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden group">
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">{account.name}</h4>
                    <p className="text-xs text-slate-500 font-bold">{account.bank_name} • {account.account_number}</p>
                  </div>
                  <p className="text-xl font-black text-blue-600">{account.balance.toLocaleString()} UZS</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Bog'langan kartalar</p>
                {cards.filter(c => c.bank_account_id === account.id).map(card => (
                  <div key={card.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <CreditCard size={18} className="text-slate-400" />
                      <p className="text-sm font-bold text-slate-700 tracking-wider">
                        **** **** **** {card.card_number.slice(-4) || '—'}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{card.balance.toLocaleString()} UZS</p>
                  </div>
                ))}
                <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-400 hover:text-blue-500 transition-all">
                  + Karta qo'shish
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
};

const PartnersView = ({ partners, onRefresh }: { partners: Partner[], onRefresh: () => void }) => {
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('accounting_partners').insert([{
      name: formData.name,
      address: formData.address,
      phone_numbers: formData.phone ? [formData.phone] : []
    }]);
    if (error) toast.error('Xatolik yuz berdi');
    else {
      toast.success('Hamkor qo\'shildi');
      setShowAddPartner(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <p className="text-slate-500 font-bold">Jami {partners.length} ta hamkor</p>
        <button 
          onClick={() => setShowAddPartner(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Yangi Hamkor
        </button>
      </div>

      {showAddPartner && (
        <form onSubmit={handleAdd} className="p-8 bg-white border-2 border-indigo-100 rounded-[32px] grid grid-cols-1 md:grid-cols-3 gap-4 animate-in zoom-in-95 duration-200">
          <input 
            required
            placeholder="Nomi" 
            className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <input 
            placeholder="Manzil" 
            className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
          <div className="flex gap-2">
            <input 
              placeholder="Telefon" 
              className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            <button type="submit" className="px-8 bg-indigo-600 text-white rounded-2xl font-black">Saqlash</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map(partner => (
          <div key={partner.id} className="bg-white p-6 rounded-[32px] border border-slate-200 hover:shadow-xl transition-all group border-b-4 border-b-transparent hover:border-b-indigo-500">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                {partner.name[0]}
              </div>
              <div className="flex gap-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:text-indigo-600"><Edit2 size={18} /></button>
                <button className="p-2 hover:text-rose-600"><Trash2 size={18} /></button>
              </div>
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-1">{partner.name}</h4>
            <p className="text-xs text-slate-400 font-bold mb-6 overflow-hidden text-ellipsis whitespace-nowrap">
              {partner.address || 'Manzil kiritilmagan'}
            </p>
            <div className={`p-4 rounded-2xl border ${partner.total_debt_uzs >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
              <div className="flex justify-between items-end">
                <p className={`font-black text-lg ${partner.total_debt_uzs >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {partner.total_debt_uzs >= 0 ? 'Haqdormiz' : 'Qarzmiz'}
                </p>
                <p className="font-black text-slate-900">
                  {Math.abs(partner.total_debt_uzs).toLocaleString()} <span className="text-xs opacity-60">UZS</span>
                </p>
              </div>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p className="col-span-full py-20 text-center text-slate-400 font-medium bg-slate-50 rounded-[40px]">Hamkorlar ro'yxati hozircha bo'sh</p>}
      </div>
    </div>
  )
};

const SettingsView = ({ entities, onRefresh }: { entities: Entity[], onRefresh: () => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('accounting_legal_entities').insert([{ name }]);
    if (error) toast.error('Xatolik yuz berdi');
    else {
      toast.success('Yuridik shaxs qo\'shildi');
      setName('');
      setShowAdd(false);
      onRefresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Yuridik shaxslar</h3>
            <p className="text-slate-500 font-medium">Barcha bank hisoblari shaxslarga biriktiriladi</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Yangi qo'shish
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="mb-8 p-8 bg-slate-50 rounded-[32px] border-2 border-indigo-100 flex gap-4 animate-in slide-in-from-top-4 duration-300">
            <input 
              required
              autoFocus
              placeholder="Yuridik shaxs nomi (masalan: ООО 'Menejer Group')" 
              className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button type="submit" className="px-10 bg-indigo-600 text-white rounded-2xl font-black">Saqlash</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-6 text-slate-400 font-bold">Bekor qilish</button>
          </form>
        )}

        <div className="bg-white rounded-[32px] border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
          {entities.map(entity => (
            <div key={entity.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><Building2 size={24} /></div>
                <div>
                  <p className="font-black text-slate-900 text-lg">{entity.name}</p>
                  <p className="text-xs text-slate-400 font-bold">ID: {entity.id.slice(0,8)}...</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={20} /></button>
                <button className="p-3 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
          {entities.length === 0 && <div className="p-20 text-center text-slate-400 font-medium">Yuridik shaxslar kiritilmagan</div>}
        </div>
      </section>
    </div>
  )
};

// --- Transaction Modal Component ---

const TransactionFormModal = ({ 
  isOpen, onClose, onSuccess, partners, cashVaults, cards, bankAccounts, entities 
}: { 
  isOpen: boolean, onClose: () => void, onSuccess: () => void,
  partners: Partner[], cashVaults: CashVault[], cards: Card[], bankAccounts: BankAccount[], entities: Entity[]
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount_original: '',
    currency: 'UZS',
    exchange_rate: 1,
    is_income: false,
    payment_type: 'CASH',
    partner_id: '',
    source_id: '', // Unified source ID
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const amount_uzs = Number(formData.amount_original) * (formData.currency === 'USD' ? Number(formData.exchange_rate) : 1);
    
    // Preparation for source update
    let cash_id = null;
    let card_id = null;
    let bank_id = null;

    if (formData.payment_type === 'CASH') cash_id = formData.source_id || (cashVaults[0]?.id);
    if (formData.payment_type === 'CARD') card_id = formData.source_id;
    if (formData.payment_type === 'BANK') bank_id = formData.source_id;

    try {
      // 1. Insert Transaction
      const { data: tx, error: txError } = await supabase.from('accounting_transactions').insert([{
        description: formData.description,
        amount_original: Number(formData.amount_original),
        amount_uzs,
        currency: formData.currency,
        exchange_rate: Number(formData.exchange_rate),
        is_income: formData.is_income,
        payment_type: formData.payment_type,
        partner_id: formData.partner_id || null,
        cash_vault_id: cash_id,
        card_id,
        bank_account_id: bank_id,
        transaction_date: formData.transaction_date
      }]).select().single();

      if (txError) throw txError;

      // 2. Update Balances (Simpler version for now, better to use DB functions/triggers later)
      const multiplier = formData.is_income ? 1 : -1;

      if (cash_id) {
        await supabase.rpc('increment_accounting_balance', { 
          table_name: 'accounting_cash_vaults', row_id: cash_id, amount: amount_uzs * multiplier 
        });
      } else if (card_id) {
        await supabase.rpc('increment_accounting_balance', { 
          table_name: 'accounting_cards', row_id: card_id, amount: amount_uzs * multiplier 
        });
      } else if (bank_id) {
        await supabase.rpc('increment_accounting_balance', { 
          table_name: 'accounting_bank_accounts', row_id: bank_id, amount: amount_uzs * multiplier 
        });
      }

      // 3. Update Partner Debt
      if (formData.partner_id || formData.payment_type === 'DEBT') {
        const partner_id = formData.partner_id || formData.source_id; // If debt chosen as payment type
        if (partner_id) {
           await supabase.rpc('increment_accounting_balance', { 
            table_name: 'accounting_partners', row_id: partner_id, amount: amount_uzs * (formData.is_income ? 1 : -1), column_name: 'total_debt_uzs'
          });
        }
      }

      toast.success('Amal muvaffaqiyatli saqlandi');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error('Xatolik: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Yangi moliyaviy amal</h3>
            <p className="text-slate-500 font-bold text-sm">Amal tafsilotlarini kiriting</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-colors">
            <Plus size={24} className="rotate-45 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Income / Expense Switcher */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => setFormData({...formData, is_income: false})}
              className={`py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                !formData.is_income ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <TrendingDown size={20} /> Chiqim
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, is_income: true})}
              className={`py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
                formData.is_income ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <TrendingUp size={20} /> Kirim
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Sana</label>
              <input 
                type="date"
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={formData.transaction_date}
                onChange={e => setFormData({...formData, transaction_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Valyuta</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, currency: 'UZS', exchange_rate: 1})}
                  className={`py-4 rounded-2xl font-black border transition-all ${formData.currency === 'UZS' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}
                >UZS</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, currency: 'USD'})}
                  className={`py-4 rounded-2xl font-black border transition-all ${formData.currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border-slate-200'}`}
                >USD</button>
              </div>
            </div>
          </div>

          {formData.currency === 'USD' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Kurs (1 $ = ? UZS)</label>
              <input 
                type="number"
                placeholder="12,800"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={formData.exchange_rate}
                onChange={e => setFormData({...formData, exchange_rate: Number(e.target.value)})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Summa ({formData.currency})</label>
            <input 
              type="number"
              required
              placeholder="0.00"
              className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-500 font-black text-3xl text-indigo-600"
              value={formData.amount_original}
              onChange={e => setFormData({...formData, amount_original: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Tavsif</label>
            <textarea 
              placeholder="Amal mazmuni..."
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-24 resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">To'lov turi</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={formData.payment_type}
                onChange={e => setFormData({...formData, payment_type: e.target.value, source_id: ''})}
              >
                <option value="CASH">💵 Naqd pul</option>
                <option value="CARD">💳 Plastik karta</option>
                <option value="BANK">🏛 Bank (Hisob raqam)</option>
                <option value="DEBT">🤝 Qarz (Hamkordan)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Hamyon / Hisob</label>
              <select 
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                value={formData.source_id}
                onChange={e => setFormData({...formData, source_id: e.target.value})}
              >
                <option value="">Tanlang...</option>
                {formData.payment_type === 'CASH' && cashVaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                {formData.payment_type === 'CARD' && cards.map(c => <option key={c.id} value={c.id}>**** {c.card_number.slice(-4)} ({c.bank_name})</option>)}
                {formData.payment_type === 'BANK' && bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
                {formData.payment_type === 'DEBT' && partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Hamkor (Ixtiyoriy)</label>
            <select 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              value={formData.partner_id}
              onChange={e => setFormData({...formData, partner_id: e.target.value})}
            >
              <option value="">Hamkor tanlanmagan</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 flex gap-4">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >Bekor qilish</button>
          <button 
            disabled={loading}
            onClick={handleSubmit}
            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
          >
            {loading ? 'Saqlanmoqda...' : <><Plus size={20} /> Saqlash</>}
          </button>
        </div>
      </div>
    </div>
  )
}
