"use client";

import React, { useState, useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal = ({ isOpen, onClose, onSuccess }: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const headers = [
      'ID', 'Guruh SKU', 'SKU', 'SKU Uzum', 'SKU Yandex', 'Shtrixkod', 
      'Kategoriya', 'Brend', 'Model', 'Rang', 'Nomi', 'Nomi RU', 
      'Narx', 'Chakana Narx', 'Status', 'Sotuv bozorlari', 
      'Rasm havolalari', 'Video havolasi', 'Qisqa Tavsif', 'To\'liq Tavsif', 
      'Qisqa Tavsif RU', 'To\'liq Tavsif RU', 'Uzunligi (mm)', 'Kengligi (mm)', 
      'Balandligi (mm)', 'Vazni (gr)'
    ];
    
    // Sample row
    const data = [
      headers,
      [
        'PROD-001', 'GROUP-A', 'SKU-001', 'UZUM-001', 'YANDEX-001', '2026000001',
        'Elektronika', 'Samsung', 'S24 Ultra', 'Titanium', 'Smartfon', 'Смартфон',
        '15000000', '16000000', 'active', 'uzum,yandex',
        'https://example.com/img1.jpg', '', 'Yaxshi smartfon', 'Batafsil ma\'lumot...',
        'Хороший смартфон', 'Подробная информация...', '160', '75', '8', '200'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shablon");
    
    XLSX.writeFile(workbook, "mahsulotlar_import_shabloni.xlsx");
    toast.success("Shablon yuklab olindi");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        toast.error("Faqat Excel (.xlsx, .xls) fayllari qabul qilinadi");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Iltimos, faylni tanlang");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`${data.count} ta mahsulot muvaffaqiyatli import qilindi!`);
        onSuccess();
        onClose();
      } else {
        toast.error("Xatolik: " + (data.message || data.error));
      }
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Excel Import</h3>
              <p className="text-xs text-slate-500 font-bold">Mahsulotlarni ommaviy yuklash</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
            disabled={importing}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Download size={16} className="text-indigo-600" />
              </div>
              <p className="text-xs font-bold text-indigo-800">Shablon hali yo'qmi?</p>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            >
              Yuklab olish
            </button>
          </div>

          {/* Upload Area */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
              dragActive ? 'border-indigo-500 bg-indigo-50/50' : 
              file ? 'border-emerald-500 bg-emerald-50/30' : 
              'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              accept=".xlsx, .xls"
            />
            
            <div className={`p-4 rounded-2xl ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
            </div>
            
            <div className="text-center">
              {file ? (
                <>
                  <p className="text-sm font-black text-slate-900 truncate max-w-[250px]">{file.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Fayl tayyor ✅</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-[10px] text-rose-500 font-bold hover:underline"
                  >
                    Boshqa fayl tanlash
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-slate-700">Faylni bura tashlang yoki tanlang</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Faqat .xlsx yoki .xls</p>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              disabled={importing}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
            >
              Bekor qilish
            </button>
            <button 
              onClick={handleImport}
              disabled={importing || !file}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Yuklanmoqda...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Ma'lumotlarni yuklash</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <AlertCircle size={14} className="text-slate-400" />
          <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
            Diqqat: ID si bir xil bo'lgan mahsulotlar yangilanadi. Nomi, Brend, Model va Rangi bir xil bo'lgan yangi mahsulotlar "Karantin"ga tushadi.
          </p>
        </div>
      </div>
    </div>
  );
};
