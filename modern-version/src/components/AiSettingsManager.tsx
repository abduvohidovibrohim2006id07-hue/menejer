"use client";

import React, { useState, useEffect } from 'react';

export const AiSettingsManager = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const actions = {
    'translate_uz_ru': 'Uzbek -> Rus (Nomi/Tavsif)',
    'translate_ru_uz': 'Rus -> Uzbek (Nomi/Tavsif)',
    'generate_full': 'Matndan to\'liq ma\'lumot yaratish',
    'generate_from_image': 'Rasmdan AI ma\'lumot olyatish (Vision)',
  };

  const models = [
    { id: 'openai/gpt-oss-120b', label: '🚀 OpenAI GPT-OSS 120B (Eng aqlli)', category: 'Flagship' },
    { id: 'llama-3.3-70b-versatile', label: '🦙 Llama 3.3 70B (Versatile)', category: 'Versatile' },
    { id: 'llama-3.2-11b-vision-preview', label: '👁️ Llama 3.2 Vision (Rasm ko\'radigan)', category: 'Vision' },
    { id: 'deepseek-r1-distill-llama-70b', label: '🧠 DeepSeek R1 (Mantiqiy)', category: 'Reasoning' },
    { id: 'llama-3.1-8b-instant', label: '⚡ Llama 3.1 8B (Tezkor)', category: 'Instant' },
  ];

  useEffect(() => {
    fetch('/api/settings/ai')
      .then(res => res.json())
      .then(data => {
        setSettings(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      alert("AI Sozlamalari muvaffaqiyatli saqlandi!");
    } catch (e) {
      alert("Xatolik yuz berdi!");
    }
    setSaving(false);
  };

  const updateSetting = (actionId: string, field: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [actionId]: {
        ...(prev[actionId] || {}),
        [field]: value
      }
    }));
  };

  if (loading) return (
    <div className="py-32 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">AI Yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">AI Master Settings</h3>
          <p className="text-slate-500 font-medium mt-1 italic">Groq modellari, Vision tahlili va Sistema promtlarini boshqarish markazi</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : "💾 O'zgarishlarni saqlash"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(actions).map(([id, label]) => (
          <div key={id} className="group bg-white border border-slate-100 rounded-[40px] p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  {id.includes('image') ? '👁️' : id.includes('translate') ? '🌍' : '✨'}
                </div>
                <h4 className="font-black text-slate-800 text-xl tracking-tight">{label}</h4>
              </div>
              <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">{id}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">AI Modeli</label>
              <div className="relative">
                <select 
                  className="w-full p-5 bg-slate-50/80 border border-slate-200 rounded-[20px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-bold text-slate-900 appearance-none transition-all cursor-pointer"
                  value={settings[id]?.model || ''}
                  onChange={(e) => updateSetting(id, 'model', e.target.value)}
                >
                  <option value="" disabled>Modelni tanlang...</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id} className="py-2">{m.label}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  ↓
                </div>
              </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sistema Promti (System Instructions)</label>
                <span className="text-[10px] font-bold text-indigo-400">Customizable</span>
              </div>
              <textarea 
                className="w-full p-6 bg-slate-50/80 border border-slate-200 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white font-medium text-slate-900 min-h-[160px] flex-1 resize-none transition-all leading-relaxed placeholder:text-slate-300"
                placeholder="AI uchun maxsus ko'rsatmalar yozing (masalan: Har doim muloyim bo'l, texnik tillardan foydalan...)"
                value={settings[id]?.prompt || ''}
                onChange={(e) => updateSetting(id, 'prompt', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
