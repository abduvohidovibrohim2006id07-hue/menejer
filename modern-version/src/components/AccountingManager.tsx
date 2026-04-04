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
  DollarSign,
  X
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
  const [modalType, setModalType] = useState<'TRANSACTION' | 'BANK_ACCOUNT' | 'CARD' | 'CASH_VAULT' | 'PARTNER' | 'ENTITY' | 'PAYME_IMPORT' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

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
        supabase.from('accounting_transactions').select('*, partner:accounting_partners(*)').order('transaction_date', { ascending: false }).limit(50)
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

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('O\'chirishga ishonchingiz komilmi?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast.error('Xatolik: ' + error.message);
    } else {
      toast.success('Muvaffaqiyatli o\'chirildi');
      fetchData();
    }
  };

  const totalBalance = 
    bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0) + 
    cards.reduce((sum, card) => sum + Number(card.balance), 0) + 
    cashVaults.reduce((sum, vault) => sum + Number(vault.balance), 0);

  const stats = [
    { label: 'Umumiy Balans', value: `${totalBalance.toLocaleString()} UZS`, change: '+12.5%', icon: Wallet, color: 'indigo' },
    { label: 'Haqdorlik', value: `${partners.filter(p => p.total_debt_uzs > 0).reduce((sum, p) => sum + Number(p.total_debt_uzs), 0).toLocaleString()} UZS`, change: '+8.2%', icon: Users, color: 'emerald' },
    { label: 'Qarzdorlik', value: `${Math.abs(partners.filter(p => p.total_debt_uzs < 0).reduce((sum, p) => sum + Number(p.total_debt_uzs), 0)).toLocaleString()} UZS`, change: '-2.4%', icon: TrendingDown, color: 'rose' },
    { label: 'Sof Foyda', value: '26,900,000 UZS', change: '+15.7%', icon: Target, color: 'amber' },
  ];

  const subTabs = [
    { id: 'overview', label: 'Umumiy', icon: PieChart },
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
          <button 
            onClick={() => setModalType('PAYME_IMPORT')}
            className="px-6 py-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
             <Briefcase size={20} />
             <span>Import</span>
          </button>
          <button className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center gap-2 hover:border-indigo-400 transition-all shadow-sm">
            <Download size={20} />
            <span>Eksport</span>
          </button>
          <button 
            onClick={() => { setEditItem(null); setModalType('TRANSACTION'); }}
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

        <div className="flex-1 p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeSubTab === 'overview' && <OverviewView transactions={transactions} partners={partners} />}
              {activeSubTab === 'transactions' && <TransactionsView transactions={transactions} onRefresh={fetchData} onDelete={(id) => handleDelete('accounting_transactions', id)} />}
              {activeSubTab === 'wallets' && (
                <WalletsView 
                  bankAccounts={bankAccounts} 
                  cards={cards} 
                  cashVaults={cashVaults} 
                  onAddBank={() => { setEditItem(null); setModalType('BANK_ACCOUNT'); }}
                  onAddCard={(bankId: string) => { setEditItem({ bank_account_id: bankId }); setModalType('CARD'); }}
                  onAddCash={() => { setEditItem(null); setModalType('CASH_VAULT'); }}
                  onDeleteBank={(id: string) => handleDelete('accounting_bank_accounts', id)}
                  onDeleteCard={(id: string) => handleDelete('accounting_cards', id)}
                  onDeleteCash={(id: string) => handleDelete('accounting_cash_vaults', id)}
                />
              )}
              {activeSubTab === 'partners' && (
                <PartnersView 
                  partners={partners} 
                  onAdd={() => { setEditItem(null); setModalType('PARTNER'); }}
                  onEdit={(item: Partner) => { setEditItem(item); setModalType('PARTNER'); }}
                  onDelete={(id: string) => handleDelete('accounting_partners', id)} 
                />
              )}
              {activeSubTab === 'settings' && (
                <SettingsView 
                  entities={entities} 
                  onAdd={() => { setEditItem(null); setModalType('ENTITY'); }}
                  onEdit={(item: Entity) => { setEditItem(item); setModalType('ENTITY'); }}
                  onDelete={(id: string) => handleDelete('accounting_legal_entities', id)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {modalType === 'TRANSACTION' && (
        <TransactionFormModal 
          isOpen={true} 
          onClose={() => setModalType(null)}
          onSuccess={() => { setModalType(null); fetchData(); }}
          partners={partners}
          cashVaults={cashVaults}
          cards={cards}
          bankAccounts={bankAccounts}
          entities={entities}
        />
      )}

      {modalType === 'BANK_ACCOUNT' && (
        <BankAccountModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          entities={entities}
          editItem={editItem}
        />
      )}

      {modalType === 'CARD' && (
        <CardModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          bankAccounts={bankAccounts}
          editItem={editItem}
        />
      )}

      {modalType === 'CASH_VAULT' && (
        <CashVaultModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          editItem={editItem}
        />
      )}

      {modalType === 'PARTNER' && (
        <PartnerModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          editItem={editItem}
        />
      )}

      {modalType === 'ENTITY' && (
        <EntityModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          editItem={editItem}
        />
      )}

      {modalType === 'PAYME_IMPORT' && (
        <PaymeImportModal 
          onClose={() => setModalType(null)} 
          onSuccess={() => { setModalType(null); fetchData(); }} 
          cards={cards}
        />
      )}
    </div>
  );
};

// --- View Sub-components ---

const OverviewView = ({ transactions, partners }: { transactions: Transaction[], partners: Partner[] }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <History size={20} className="text-indigo-600" /> So'nggi amallar
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
                {tx.is_income ? '+' : '-'} {tx.amount_uzs.toLocaleString()} <span className="text-[10px] opacity-70">UZS</span>
              </p>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center text-slate-400 py-10 font-medium">Hozircha amallar yo'q</p>}
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" /> Qarzdorlik holati
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
                    {p.total_debt_uzs > 0 ? 'Haqdormiz' : 'Qarzmiz'}
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

const TransactionsView = ({ transactions, onDelete }: { transactions: Transaction[], onRefresh: () => void, onDelete: (id: string) => void }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
          <th className="pb-4 pt-0 px-4">Sana</th>
          <th className="pb-4 pt-0 px-4">Turi</th>
          <th className="pb-4 pt-0 px-4">Tavsif / Hamkor</th>
          <th className="pb-4 pt-0 px-4">Hamyon</th>
          <th className="pb-4 pt-0 px-4 text-right">Summa (UZS)</th>
          <th className="pb-4 pt-0 px-4"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {transactions.map((tx) => (
          <tr key={tx.id} className="group hover:bg-slate-50/50 transition-all">
            <td className="py-5 px-4 font-bold text-slate-900 text-sm">
              {new Date(tx.transaction_date).toLocaleDateString()}
              <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </td>
            <td className="py-5 px-4">
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${tx.is_income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {tx.is_income ? 'Kirim' : 'Chiqim'}
              </span>
            </td>
            <td className="py-5 px-4">
              <p className="font-bold text-slate-700 text-sm">{tx.description || '—'}</p>
              <p className="text-[10px] text-slate-400 font-bold">{tx.partner?.name || 'Kontragentsiz'}</p>
            </td>
            <td className="py-5 px-4 font-bold text-slate-500 text-xs">
               <div className="flex items-center gap-1">
                {tx.payment_type === 'CASH' && <Banknote size={14} className="text-amber-500" />}
                {tx.payment_type === 'CARD' && <CreditCard size={14} className="text-blue-500" />}
                {tx.payment_type === 'BANK' && <Building2 size={14} className="text-indigo-500" />}
                {tx.payment_type === 'DEBT' && <Users size={14} className="text-rose-500" />}
                {tx.payment_type}
               </div>
            </td>
            <td className="py-5 px-4 text-right font-black">
              <p className={tx.is_income ? 'text-emerald-600' : 'text-rose-600'}>
                {tx.is_income ? '+' : '-'} {tx.amount_uzs.toLocaleString()}
              </p>
            </td>
            <td className="py-5 px-4 text-right">
              <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface WalletsViewProps {
  bankAccounts: BankAccount[];
  cards: Card[];
  cashVaults: CashVault[];
  onAddBank: () => void;
  onAddCard: (bankId: string) => void;
  onAddCash: () => void;
  onDeleteBank: (id: string) => void;
  onDeleteCard: (id: string) => void;
  onDeleteCash: (id: string) => void;
}

const WalletsView = ({ bankAccounts, cards, cashVaults, onAddBank, onAddCard, onAddCash, onDeleteBank, onDeleteCard, onDeleteCash }: WalletsViewProps) => (
  <div className="space-y-12">
    {/* Cash Section */}
    <section>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Banknote size={24} className="text-amber-500" /> Naqd pul (G'aznalar)
        </h3>
        <button onClick={onAddCash} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
          <Plus size={20} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cashVaults.map((vault) => (
          <div key={vault.id} className="p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Banknote size={20} /></div>
              <button onClick={() => onDeleteCash(vault.id)} className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{vault.name}</p>
            <p className="text-2xl font-black text-slate-900">{vault.balance.toLocaleString()} <span className="text-sm font-bold opacity-50 text-slate-500">UZS</span></p>
          </div>
        ))}
      </div>
    </section>

    {/* Bank Section */}
    <section>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Building2 size={24} className="text-blue-500" /> Bank hisoblari
        </h3>
        <button onClick={onAddBank} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
          <Plus size={20} />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bankAccounts.map((account) => (
          <div key={account.id} className="bg-white border border-slate-200 rounded-[40px] overflow-hidden group border-b-4 border-b-transparent hover:border-b-blue-500 transition-all">
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-900 text-lg">{account.name}</h4>
                  <p className="text-xs text-slate-500 font-bold">{account.bank_name} • {account.account_number}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => onDeleteBank(account.id)} className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-3xl font-black text-blue-600 mb-6">{account.balance.toLocaleString()} <span className="text-sm">UZS</span></p>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bog'langan kartalar</p>
                {cards.filter((c) => c.bank_account_id === account.id).map((card) => (
                  <div key={card.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group/card">
                    <div className="flex items-center gap-3">
                      <CreditCard size={18} className="text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">**** **** **** {card.card_number.slice(-4)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-900 text-xs">{card.balance.toLocaleString()} UZS</p>
                      <button onClick={() => onDeleteCard(card.id)} className="text-slate-300 hover:text-rose-600 opacity-0 group-hover/card:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => onAddCard(account.id)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] hover:border-blue-400 hover:text-blue-500 transition-all"
                >
                  + KARTA QO'SHISH
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

interface PartnersViewProps {
  partners: Partner[];
  onAdd: () => void;
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
}

const PartnersView = ({ partners, onAdd, onEdit, onDelete }: PartnersViewProps) => (
  <div className="space-y-8">
     <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <p className="text-slate-500 font-bold">Jami {partners.length} ta hamkor</p>
        <button onClick={onAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={18} /> Yangi Hamkor
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-[32px] border border-slate-200 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">{p.name[0]}</div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEdit(p)} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 size={16} /></button>
                <button onClick={() => onDelete(p.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={16} /></button>
              </div>
            </div>
            <h4 className="font-black text-slate-900 mb-1">{p.name}</h4>
            <p className="text-xs text-slate-400 mb-4">{p.address || 'Manzil yo\'q'}</p>
            <div className={`p-4 rounded-xl font-black text-sm flex justify-between items-center ${p.total_debt_uzs >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <span>{p.total_debt_uzs >= 0 ? 'Haqdormiz' : 'Qarzmiz'}</span>
              <span>{Math.abs(p.total_debt_uzs).toLocaleString()} UZS</span>
            </div>
          </div>
        ))}
      </div>
  </div>
);

interface SettingsViewProps {
  entities: Entity[];
  onAdd: () => void;
  onEdit: (entity: Entity) => void;
  onDelete: (id: string) => void;
}

const SettingsView = ({ entities, onAdd, onEdit, onDelete }: SettingsViewProps) => (
  <div className="max-w-4xl mx-auto space-y-10">
    <div className="flex justify-between items-center bg-white p-8 border border-slate-200 rounded-[40px] shadow-sm">
      <div>
        <h3 className="text-2xl font-black text-slate-900">Yuridik shaxslar</h3>
        <p className="text-slate-500 font-medium">Barcha bank hisoblari shaxslarga bog'lanadi</p>
      </div>
      <button onClick={onAdd} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
        <Plus size={20} /> Yangi qo'shish
      </button>
    </div>
    <div className="space-y-4">
      {entities.map((e) => (
        <div key={e.id} className="p-6 bg-white border border-slate-200 rounded-[32px] flex justify-between items-center hover:bg-slate-50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><Building2 size={24} /></div>
            <p className="font-black text-slate-900 text-lg">{e.name}</p>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
             <button onClick={() => onEdit(e)} className="p-3 text-slate-300 hover:text-indigo-600"><Edit2 size={20} /></button>
             <button onClick={() => onDelete(e.id)} className="p-3 text-slate-300 hover:text-rose-600"><Trash2 size={20} /></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- Form Modals ---

const ModalWrapper = ({ children, title, description, onClose }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="text-2xl font-black text-slate-900">{title}</h3>
          <p className="text-slate-500 font-bold text-sm">{description}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X size={24} className="text-slate-400" /></button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

const EntityModal = ({ onClose, onSuccess, editItem }: any) => {
  const [name, setName] = useState(editItem?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const data = { name };
    const { error } = editItem 
      ? await supabase.from('accounting_legal_entities').update(data).eq('id', editItem.id)
      : await supabase.from('accounting_legal_entities').insert([data]);
    
    if (error) toast.error(error.message);
    else { toast.success('Saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <ModalWrapper title={editItem ? "Tahrirlash" : "Yangi Shaxs"} description="Yuridik shaxs ma'lumotlari" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input required autoFocus placeholder="Nomi" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Saqlash</button>
      </form>
    </ModalWrapper>
  );
};

const PartnerModal = ({ onClose, onSuccess, editItem }: any) => {
  const [formData, setFormData] = useState({ name: editItem?.name || '', address: editItem?.address || '', phone: editItem?.phone_numbers?.[0] || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const data = { name: formData.name, address: formData.address, phone_numbers: [formData.phone] };
    const { error } = editItem 
      ? await supabase.from('accounting_partners').update(data).eq('id', editItem.id)
      : await supabase.from('accounting_partners').insert([data]);
    
    if (error) toast.error(error.message);
    else { toast.success('Saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <ModalWrapper title="Hamkor" description="Hamkor ma'lumotlari" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="Nomi" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
        <input placeholder="Manzil" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
        <input placeholder="Telefon" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Saqlash</button>
      </form>
    </ModalWrapper>
  );
};

const BankAccountModal = ({ onClose, onSuccess, entities, editItem }: any) => {
  const [formData, setFormData] = useState({ 
    name: editItem?.name || '', 
    bank_name: editItem?.bank_name || '', 
    mfo: editItem?.mfo || '', 
    account_number: editItem?.account_number || '',
    entity_id: editItem?.entity_id || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = editItem 
      ? await supabase.from('accounting_bank_accounts').update(formData).eq('id', editItem.id)
      : await supabase.from('accounting_bank_accounts').insert([formData]);
    
    if (error) toast.error(error.message);
    else { toast.success('Saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <ModalWrapper title="Bank Hisobi" description="Yuridik shaxs hisob raqami" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.entity_id} onChange={(e) => setFormData({...formData, entity_id: e.target.value})}>
          <option value="">Shaxsni tanlang...</option>
          {entities.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input required placeholder="Hisob nomi (masalan: Asosiy)" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
        <input required placeholder="Bank nomi" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <input placeholder="MFO" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.mfo} onChange={(e) => setFormData({...formData, mfo: e.target.value})} />
          <input required placeholder="Hisob raqam" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} />
        </div>
        <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Saqlash</button>
      </form>
    </ModalWrapper>
  );
};

const CardModal = ({ onClose, onSuccess, bankAccounts, editItem }: any) => {
  const [formData, setFormData] = useState({ 
    card_number: editItem?.card_number || '', 
    bank_name: editItem?.bank_name || '', 
    bank_account_id: editItem?.bank_account_id || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = editItem?.id 
      ? await supabase.from('accounting_cards').update(formData).eq('id', editItem.id)
      : await supabase.from('accounting_cards').insert([formData]);
    
    if (error) toast.error(error.message);
    else { toast.success('Saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <ModalWrapper title="Plastik Karta" description="Bank hisobiga bog'langan karta" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.bank_account_id} onChange={(e) => setFormData({...formData, bank_account_id: e.target.value})}>
          <option value="">Hisob tanlang...</option>
          {bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>)}
        </select>
        <input required maxLength={16} placeholder="Karta raqami (16 xonali)" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black tracking-widest text-center text-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.card_number} onChange={(e) => setFormData({...formData, card_number: e.target.value.replace(/\D/g, '')})} />
        <input required placeholder="Karta banki nomi" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} />
        <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Saqlash</button>
      </form>
    </ModalWrapper>
  );
};

const CashVaultModal = ({ onClose, onSuccess, editItem }: any) => {
  const [name, setName] = useState(editItem?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = editItem 
      ? await supabase.from('accounting_cash_vaults').update({ name }).eq('id', editItem.id)
      : await supabase.from('accounting_cash_vaults').insert([{ name }]);
    
    if (error) toast.error(error.message);
    else { toast.success('Saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <ModalWrapper title="Naqd pul g''aznasi" description="Kassa nomi (masalan: Office cash)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input required placeholder="G'azna nomi" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-all outline-none" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Saqlash</button>
      </form>
    </ModalWrapper>
  );
};

const TransactionFormModal = ({ isOpen, onClose, onSuccess, partners, cashVaults, cards, bankAccounts }: any) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '', amount_original: '', currency: 'UZS', exchange_rate: 12850, is_income: false,
    payment_type: 'CASH', partner_id: '', source_id: '', transaction_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const amount_uzs = Number(formData.amount_original) * (formData.currency === 'USD' ? Number(formData.exchange_rate) : 1);
    const data = {
      description: formData.description, amount_original: Number(formData.amount_original), amount_uzs,
      currency: formData.currency, exchange_rate: Number(formData.exchange_rate), is_income: formData.is_income,
      payment_type: formData.payment_type, partner_id: formData.partner_id || null, transaction_date: formData.transaction_date,
      cash_vault_id: formData.payment_type === 'CASH' ? formData.source_id : null,
      card_id: formData.payment_type === 'CARD' ? formData.source_id : null,
      bank_account_id: formData.payment_type === 'BANK' ? formData.source_id : null
    };

    const { error } = await supabase.from('accounting_transactions').insert([data]);
    if (error) toast.error(error.message);
    else { toast.success('Amal muvaffaqiyatli saqlandi'); onSuccess(); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div><h3 className="text-2xl font-black text-slate-900">Yangi moliyaviy amal</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={()=>setFormData({...formData, is_income: false})} className={`py-4 rounded-2xl font-black ${!formData.is_income ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>Chiqim</button>
            <button type="button" onClick={()=>setFormData({...formData, is_income: true})} className={`py-4 rounded-2xl font-black ${formData.is_income ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>Kirim</button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.transaction_date} onChange={(e)=>setFormData({...formData, transaction_date: e.target.value})} />
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button type="button" onClick={()=>setFormData({...formData, currency:'UZS', exchange_rate: 1})} className={`flex-1 py-1 rounded-xl text-xs font-black ${formData.currency==='UZS'?'bg-white text-indigo-600':'text-slate-400'}`}>UZS</button>
              <button type="button" onClick={()=>setFormData({...formData, currency:'USD'})} className={`flex-1 py-1 rounded-xl text-xs font-black ${formData.currency==='USD'?'bg-white text-indigo-600':'text-slate-400'}`}>USD</button>
            </div>
          </div>
          {formData.currency==='USD' && <input type="number" placeholder="Kurs" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.exchange_rate} onChange={(e)=>setFormData({...formData, exchange_rate: Number(e.target.value)})} />}
          <input required type="number" placeholder="Summa" className="w-full px-8 py-6 bg-slate-50 border-2 border-indigo-100 rounded-[24px] font-black text-4xl text-indigo-600 placeholder:text-slate-300 outline-none focus:bg-white transition-all" value={formData.amount_original} onChange={(e)=>setFormData({...formData, amount_original: e.target.value})} />
          <textarea placeholder="Mazmuni..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">To'lov turi</p>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                value={formData.payment_type} 
                onChange={(e) => setFormData({...formData, payment_type: e.target.value as any, source_id: ''})}
              >
                <option value="CASH">💵 Naqd pul (G'azna)</option>
                <option value="CARD">💳 Plastik karta</option>
                <option value="BANK">🏛 Bank hisob raqami</option>
                <option value="DEBT">🤝 Qarz / Haqdorlik</option>
              </select>
            </div>

            {formData.payment_type !== 'DEBT' ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hamyonni tanlang</p>
                <select 
                  required 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                  value={formData.source_id} 
                  onChange={(e) => setFormData({...formData, source_id: e.target.value})}
                >
                  <option value="">Hamyon tanlang...</option>
                  {formData.payment_type === 'CASH' && cashVaults.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  {formData.payment_type === 'CARD' && cards.map((c: any) => <option key={c.id} value={c.id}>**** {c.card_number.slice(-4)}</option>)}
                  {formData.payment_type === 'BANK' && bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hamkor (Qarz beruvchi/oluvchi)</p>
                <select 
                  required 
                  className="w-full px-6 py-4 bg-indigo-50 border border-indigo-200 rounded-2xl font-black text-indigo-600 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                  value={formData.partner_id} 
                  onChange={(e) => setFormData({...formData, partner_id: e.target.value, source_id: e.target.value})}
                >
                  <option value="">Hamkorni tanlang...</option>
                  {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {formData.payment_type !== 'DEBT' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hamkor (Ixtiyoriy)</p>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                value={formData.partner_id} 
                onChange={(e) => setFormData({...formData, partner_id: e.target.value})}
              >
                <option value="">Kontragent (Ixtiyoriy)</option>
                {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <button disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
            {loading ? 'Saqlanmoqda...' : <><Plus size={24} /> SAQLASH</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Payme Import Modal ---

const PaymeImportModal = ({ onClose, onSuccess, cards }: { onClose: () => void, onSuccess: () => void, cards: Card[] }) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target?.result;
      const XLSX = await import('xlsx');
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      setPreview(data.slice(1, 6)); // Preview first 5 rows
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const loadingToast = toast.loading("Excel fayl o'qilmoqda...");
    
    try {
      const XLSX = await import('xlsx');

      // Faylni promise yordamida o'qish
      const data = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const bstr = e.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(ws, { header: 1 }));
        };
        reader.onerror = (e) => reject(new Error("Faylni o'qishda xatolik"));
        reader.readAsBinaryString(file);
      });

      const rows = data.slice(1);
      const transactionsToInsert = rows.map((row: any) => {
        const rawDate = row[0];
        const rawTime = row[1];
        let transactionDate = new Date().toISOString();
        
        if (rawDate && rawTime) {
          const dStr = String(rawDate);
          const parts = dStr.split(/[-.]/); // - yoki . bilan ajratilgan bo'lsa ham ishlaydi
          if (parts.length === 3) {
            // YYYY-MM-DD formatiga keltirish
            transactionDate = `${parts[2]}-${parts[1]}-${parts[0]}T${rawTime}`;
          }
        }

        const type = String(row[2] || '');
        const amount = Number(String(row[5] || '0').replace(/\s/g, '')); // Probellarni olib tashlash
        const cardNumRaw = String(row[9] || '');
        
        const matchedCard = cards.find(c => {
          const cleanStored = c.card_number.replace(/\D/g, '');
          const startStored = cleanStored.slice(0, 6);
          const endStored = cleanStored.slice(-4);
          return cardNumRaw.startsWith(startStored) && cardNumRaw.endsWith(endStored);
        });

        return {
          transaction_date: transactionDate,
          is_income: type.toLowerCase() === 'kirim',
          amount_original: amount,
          amount_uzs: amount,
          currency: 'UZS',
          exchange_rate: 1,
          description: row[11] || row[3] || 'Payme Import',
          payment_type: 'CARD' as const,
          card_id: matchedCard?.id || null,
          payme_category: String(row[6] || ''),
          payme_receiver: String(row[7] || ''),
          payme_details: String(row[8] || ''),
          payme_status: String(row[13] || ''),
          payme_service_point: String(row[14] || ''),
          payme_terminal: String(row[15] || ''),
          payme_provider_name: String(row[3] || ''),
          payme_provider_org_name: String(row[4] || ''),
          payme_receipt_type: String(row[12] || '')
        };
      }).filter(t => !isNaN(t.amount_original) && t.amount_original > 0);

      if (transactionsToInsert.length === 0) {
        throw new Error("Import qilish uchun yaroqli ma'lumot topilmadi");
      }

      const { error } = await supabase.from('accounting_transactions').insert(transactionsToInsert);
      if (error) throw error;

      toast.success(`${transactionsToInsert.length} ta amal muvaffaqiyatli import qilindi`, { id: loadingToast });
      onSuccess();
    } catch (error: any) {
      toast.error('Importda xato: ' + error.message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper title="Payme Excel Import" description="Payme-dan eksport qilingan faylni tanlang" onClose={onClose}>
      <div className="space-y-6">
        <label className="block p-10 border-4 border-dashed border-emerald-100 rounded-[32px] bg-emerald-50/30 text-center cursor-pointer hover:border-emerald-300 transition-all group">
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
          <div className="flex flex-col items-center gap-4">
             <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><Briefcase size={32} /></div>
             <div>
                <p className="text-emerald-700 font-black text-lg">{file ? file.name : 'Faylni tanlang'}</p>
                <p className="text-emerald-500 text-sm font-bold">Yoki bu yerga tashlang</p>
             </div>
          </div>
        </label>

        {preview.length > 0 && (
          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dastlabki 5 qator</p>
             <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden text-[9px] font-bold p-3 overflow-x-auto no-scrollbar max-h-40">
                <table className="w-full">
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-200 last:border-0">
                        {row.slice(0, 5).map((cell: any, j: number) => <td key={j} className="py-1 pr-4 text-slate-600 truncate max-w-[100px]">{String(cell)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-[10px] text-amber-700 font-bold">⚠️ DIQQAT: Excel fayldagi karta raqamlari tizimdagi kartalar bilan 6 ta bosh va 4 ta oxirgi raqamlar bo'yicha moslashtiriladi.</p>
        </div>

        <button 
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Yozilmoqda...' : <><Download size={24} /> IMPORT QILISH</>}
        </button>
      </div>
    </ModalWrapper>
  );
};
