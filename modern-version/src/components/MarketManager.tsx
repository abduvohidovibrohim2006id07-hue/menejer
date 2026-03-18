"use client";

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Warehouse {
  id: string;
  name: string;
  stock: number;
}

interface Cabinet {
  id: string;
  name: string;
  api_key: string;
  warehouses: Warehouse[];
}

interface Account {
  id: string;
  email: string;
  cabinets: Cabinet[];
}

interface Market {
  id: string;
  name: string;
  icon: string;
  color: string;
  accounts: Account[];
}

interface MarketManagerProps {
  markets: Market[];
  onRefresh: () => void;
}

export const MarketManager = ({ markets, onRefresh }: MarketManagerProps) => {
  const defaultForm: Market = {
    id: '',
    name: '',
    icon: '',
    color: '#6366f1',
    accounts: []
  };

  const [formData, setFormData] = useState<Market>(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openNewModal = () => {
    setFormData(defaultForm);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      alert("Do'kon ID va Nomi majburiy!");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/markets', formData);
      setFormData(defaultForm);
      setIsEditing(false);
      setIsModalOpen(false);
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu do'konni o'chiramizmi? Bunga bog'langan barcha akkauntlar o'chib ketadi!")) return;
    try {
      await apiClient.delete('/api/markets', id);
      onRefresh();
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    }
  };

  const handleEdit = (m: Market) => {
    // Escaping reference by deep clone
    const cloned = JSON.parse(JSON.stringify(m));
    if (!cloned.accounts) cloned.accounts = [];
    setFormData(cloned);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Nested Add/Remove functions
  const addAccount = () => {
    setFormData(prev => ({
      ...prev,
      accounts: [...prev.accounts, { id: Date.now().toString(), email: '', cabinets: [] }]
    }));
  };

  const updateAccount = (accIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      accs[accIndex] = { ...accs[accIndex], [field]: value };
      return { ...prev, accounts: accs };
    });
  };

  const deleteAccount = (accIndex: number) => {
    setFormData(prev => ({
      ...prev,
      accounts: prev.accounts.filter((_, i) => i !== accIndex)
    }));
  };

  const addCabinet = (accIndex: number) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      accs[accIndex].cabinets.push({ id: Date.now().toString(), name: '', api_key: '', warehouses: [] });
      return { ...prev, accounts: accs };
    });
  };

  const updateCabinet = (accIndex: number, cabIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      const cabs = [...accs[accIndex].cabinets];
      cabs[cabIndex] = { ...cabs[cabIndex], [field]: value };
      accs[accIndex] = { ...accs[accIndex], cabinets: cabs };
      return { ...prev, accounts: accs };
    });
  };

  const deleteCabinet = (accIndex: number, cabIndex: number) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      accs[accIndex].cabinets = accs[accIndex].cabinets.filter((_, i) => i !== cabIndex);
      return { ...prev, accounts: accs };
    });
  };

  const addWarehouse = (accIndex: number, cabIndex: number) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      accs[accIndex].cabinets[cabIndex].warehouses.push({ id: Date.now().toString(), name: '', stock: 0 });
      return { ...prev, accounts: accs };
    });
  };

  const updateWarehouse = (accIndex: number, cabIndex: number, whIndex: number, field: string, value: string | number) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      const cabs = [...accs[accIndex].cabinets];
      const whs = [...cabs[cabIndex].warehouses];
      whs[whIndex] = { ...whs[whIndex], [field]: value };
      cabs[cabIndex] = { ...cabs[cabIndex], warehouses: whs };
      accs[accIndex] = { ...accs[accIndex], cabinets: cabs };
      return { ...prev, accounts: accs };
    });
  };

  const deleteWarehouse = (accIndex: number, cabIndex: number, whIndex: number) => {
    setFormData(prev => {
      const accs = [...prev.accounts];
      const cabs = [...accs[accIndex].cabinets];
      cabs[cabIndex].warehouses = cabs[cabIndex].warehouses.filter((_, i) => i !== whIndex);
      accs[accIndex] = { ...accs[accIndex], cabinets: cabs };
      return { ...prev, accounts: accs };
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER WITH ADD BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Do'konlar (Markets)</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Barcha sotuv platformalarini boshqaring ({markets.length} ta)</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Yangi do'kon qo'shish
        </button>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* MODAL HEADER */}
            <div className="p-6 md:p-8 border-b border-indigo-500 flex justify-between items-center bg-indigo-600 text-white relative">
               <div>
                 <h3 className="text-xl md:text-3xl font-black tracking-tight">
                   {isEditing ? "Do'konni Tahrirlash" : "Yangi Do'kon Yaratish"}
                 </h3>
                 <p className="text-indigo-100 font-medium mt-1">Professional integratsiyalar bilan to'liq boshqaruv</p>
               </div>
               <button 
                 onClick={() => setIsModalOpen(false)} 
                 className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-3xl font-light"
               >
                 &times;
               </button>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 space-y-8">
              {/* Market Base Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white shadow-sm rounded-[24px] border border-slate-200">
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">ID (masalan: uzum)</label>
                   <input 
                     type="text" 
                     disabled={isEditing}
                     placeholder="uzum" 
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-bold transition-all disabled:opacity-50"
                     value={formData.id}
                     onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase()})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">Nomi</label>
                   <input 
                     type="text" 
                     placeholder="Uzum Market" 
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-bold transition-all"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">Ikonka</label>
                   <input 
                     type="text" 
                     placeholder="🛍" 
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-bold transition-all text-xl"
                     value={formData.icon}
                     onChange={(e) => setFormData({...formData, icon: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">Rang</label>
                   <div className="flex bg-slate-50 p-2 border border-slate-200 rounded-2xl h-[58px] items-center gap-2 transition-all">
                     <input 
                       type="color" 
                       className="w-12 h-10 border-0 rounded-xl cursor-pointer"
                       value={formData.color}
                       onChange={(e) => setFormData({...formData, color: e.target.value})}
                     />
                     <span className="font-bold text-xs text-slate-500 uppercase flex-1 text-center">{formData.color}</span>
                   </div>
                </div>
              </div>

        {/* NESTED FIELDS: Accounts -> Cabinets -> Warehouses */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-slate-700 text-lg flex items-center gap-2">📧 Do'kon Akkauntlari</h4>
            <button 
              onClick={addAccount}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Akkaunt qo'shish
            </button>
          </div>

          {formData.accounts.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 bg-slate-50 rounded-[24px]">
               <p className="text-slate-400 font-medium text-sm">Hali akkauntlar qo'shilmagan.</p>
            </div>
          )}

          {formData.accounts.map((acc, aIdx) => (
            <div key={acc.id || aIdx} className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative pt-4">
              {/* Account Header */}
              <button 
                onClick={() => deleteAccount(aIdx)} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-xl font-black"
                title="Akkauntni o'chirish"
              >&times;</button>
              
              <div className="px-6 pb-4">
                <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 ml-2">Akkaunt Email / Login'i</label>
                <input 
                  type="text" 
                  placeholder="shop@misol.uz" 
                  className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-bold outline-none"
                  value={acc.email}
                  onChange={(e) => updateAccount(aIdx, 'email', e.target.value)}
                />
              </div>

              {/* Cabinets Section */}
              <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-600 text-sm flex items-center gap-2">⚙️ Kabinetlar (Api integratsiya)</h5>
                  <button 
                    onClick={() => addCabinet(aIdx)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl font-bold text-[10px] transition-colors shadow-sm"
                  >
                    + Kabinet qo'shish
                  </button>
                </div>

                {acc.cabinets.length === 0 && (
                  <p className="text-slate-400 font-medium text-[11px] italic">Ushbu akkauntda kabinet o'rnatilmagan</p>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {acc.cabinets.map((cab, cIdx) => (
                    <div key={cab.id || cIdx} className="bg-white p-5 rounded-[20px] border border-slate-200 relative shadow-sm">
                      <button 
                        onClick={() => deleteCabinet(aIdx, cIdx)} 
                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors text-lg"
                      >&times;</button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8 mb-4">
                         <div>
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1">Kabinet ID</label>
                           <input 
                             type="text" placeholder="cabinet_uzum_1" 
                             className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                             value={cab.id} onChange={(e) => updateCabinet(aIdx, cIdx, 'id', e.target.value)}
                           />
                         </div>
                         <div>
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1">Kabinet Nomi</label>
                           <input 
                             type="text" placeholder="Asosiy Kabinet" 
                             className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                             value={cab.name} onChange={(e) => updateCabinet(aIdx, cIdx, 'name', e.target.value)}
                           />
                         </div>
                         <div>
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1">Api Key (Maxfiy)*</label>
                           <input 
                             type="password" placeholder="••••••••••••••••" 
                             className="w-full p-2.5 text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl font-mono tracking-widest"
                             value={cab.api_key} onChange={(e) => updateCabinet(aIdx, cIdx, 'api_key', e.target.value)}
                           />
                         </div>
                      </div>

                      {/* Warehouses Section */}
                      <div className="pl-4 border-l-2 border-indigo-100 space-y-3">
                         <div className="flex items-center justify-between pt-2">
                           <h6 className="font-bold text-slate-500 text-[11px] flex items-center gap-1.5 uppercase tracking-widest">📦 Omborlar (Skladlar)</h6>
                           <button 
                             onClick={() => addWarehouse(aIdx, cIdx)}
                             className="text-[9px] px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md font-black uppercase transition-colors tracking-widest"
                           >
                             + Qo'shish
                           </button>
                         </div>
                         
                         <div className="space-y-2">
                           {cab.warehouses.length === 0 && (
                             <p className="text-slate-400 font-medium text-[10px] italic">Omborlar yo'q</p>
                           )}
                           
                           {cab.warehouses.map((wh, wIdx) => (
                             <div key={wh.id || wIdx} className="flex flex-col sm:flex-row gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                               <input 
                                 type="text" placeholder="Ombor ID (masalan: 1243)" 
                                 className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold"
                                 value={wh.id} onChange={(e) => updateWarehouse(aIdx, cIdx, wIdx, 'id', e.target.value)}
                               />
                               <input 
                                 type="text" placeholder="Nomi (masalan: MChJ ombor)" 
                                 className="flex-[2] w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-bold"
                                 value={wh.name} onChange={(e) => updateWarehouse(aIdx, cIdx, wIdx, 'name', e.target.value)}
                               />
                               <div className="flex items-center gap-2 w-full sm:w-auto">
                                 <span className="text-[10px] font-black text-slate-400 ml-1">QOLDIQ:</span>
                                 <input 
                                   type="number" placeholder="0" 
                                   className="w-20 bg-amber-50 border border-amber-200 text-amber-800 text-center rounded-lg p-2 text-[11px] font-black"
                                   value={wh.stock} onChange={(e) => updateWarehouse(aIdx, cIdx, wIdx, 'stock', parseFloat(e.target.value) || 0)}
                                 />
                                 <button 
                                   onClick={() => deleteWarehouse(aIdx, cIdx, wIdx)} 
                                   className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                 >🗑</button>
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
            
      {/* MODAL FOOTER */}
      <div className="p-6 md:p-8 border-t border-slate-100 flex justify-end gap-4 bg-white">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-8 py-4 font-black text-slate-500 hover:bg-slate-100 rounded-[20px] transition-all"
              >
                Bekor qilish
              </button>
              <button 
                 onClick={handleSave}
                 disabled={loading}
                 className="px-10 py-4 bg-indigo-600 text-white font-black rounded-[20px] hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-600/30 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                 {loading ? "Saqlanmoqda..." : "Yaratilgan do'konni Saqlash!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARKETS LIST */}
      
      {markets.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
           <p className="text-xl text-slate-300 font-black italic">Hozircha hech qanday do'kon qo'shilmagan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((m) => {
            // Stats calculation
            const accCount = m.accounts?.length || 0;
            const cabCount = m.accounts?.reduce((acc, curr) => acc + (curr.cabinets?.length || 0), 0) || 0;
            const whCount = m.accounts?.reduce((acc, curr) => acc + curr.cabinets?.reduce((cabAcc, cab) => cabAcc + (cab.warehouses?.length || 0), 0), 0) || 0;
            
            return (
              <div key={m.id} className="p-6 bg-white border border-slate-100 rounded-[28px] hover:border-indigo-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none" style={{ backgroundColor: m.color, opacity: 0.05 }} />
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl"
                    style={{ backgroundColor: m.color, boxShadow: `0 10px 25px -5px ${m.color}60` }}
                  >
                    {m.icon || m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-lg truncate">{m.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {m.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                   <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                     <p className="text-xl font-black text-slate-700">{accCount}</p>
                     <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Akkaunt</p>
                   </div>
                   <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                     <p className="text-xl font-black text-slate-700">{cabCount}</p>
                     <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Kabinet</p>
                   </div>
                   <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                     <p className="text-xl font-black text-slate-700">{whCount}</p>
                     <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Ombor</p>
                   </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-slate-50 relative z-10">
                  <button onClick={() => handleEdit(m)} className="flex-[3] py-3 bg-indigo-50 text-indigo-700 font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-xs">🛠 O'zgartirish</button>
                  <button onClick={() => handleDelete(m.id)} className="flex-1 py-3 bg-red-50 text-red-500 font-black rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="O'chirish">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
