import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

export const GroupModal = ({ isOpen, onClose, selectedIds, onSuccess }: GroupModalProps) => {
  const [groupSku, setGroupSku] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill groupSku if any of the selected IDs are virtual groups
  React.useEffect(() => {
    if (isOpen) {
      const gId = Array.from(selectedIds).find(id => id.startsWith('group-'));
      if (gId) {
        setGroupSku(gId.replace('group-', ''));
      } else {
        setGroupSku('');
      }
    }
  }, [isOpen, selectedIds]);

  const handleGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSku = groupSku.trim().toUpperCase();
    if (!finalSku) {
      toast.error("Guruh SKU kodini kiriting!");
      return;
    }

    setLoading(true);
    try {
      // Filter out virtual group IDs, we only want to update real products
      const realIds = Array.from(selectedIds).filter(id => !id.startsWith('group-'));
      
      for (const id of realIds) {
        await apiClient.post('/api/products', { id, group_sku: finalSku });
      }

      toast.success(realIds.length > 0 ? "Muvaffaqiyatli guruhlandi!" : "Guruh SKU kodi yangilandi!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <h3 className="text-xl font-black">Mahsulotlarni guruhlash</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-2xl">&times;</button>
        </div>
        
        <form onSubmit={handleGroup} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Guruh SKU KODI*</label>
            <input 
              type="text"
              required
              placeholder="Masalan: VGR-640-GRUP-1"
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              value={groupSku}
              onChange={(e) => setGroupSku(e.target.value.toUpperCase())}
            />
            <p className="mt-2 text-[10px] text-slate-400 font-medium">Ushbu kod tanlangan {selectedIds.size} ta mahsulotga guruh kodi sifatida biriktiriladi.</p>
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-4 font-black text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? "Saqlanmoqda..." : "Guruhlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
