"use client";

import React, { useState, useEffect } from 'react';

export const AiSettingsManager = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const actions = {
    'translate_uz_ru': 'Uzbek -> Rus (Nomi)',
    'translate_ru_uz': 'Rus -> Uzbek (Nomi)',
    'translate_desc_uz_ru': 'Uzbek -> Rus (Tavsif)',
    'translate_desc_ru_uz': 'Rus -> Uzbek (Tavsif)',
  };

  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it'
  ];

  useEffect(() => {
    fetch('/api/settings/ai')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setSaving(false);
    alert("Saqlandi!");
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

  if (loading) return <div className="py-20 text-center animate-pulse font-bold text-slate-400">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800">AI Sozlamalari</h3>
          <p className="text-slate-500 text-sm">Groq modellari va promtlarni boshqarish</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95"
        >
          {saving ? "Saqlanmoqda..." : "💾 Sozlamalarni saqlash"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(actions).map(([id, label]) => (
          <div key={id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <h4 className="font-black text-indigo-600 text-lg flex items-center gap-2">
              <span className="text-xl">🤖</span> {label}
            </h4>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanlangan Model</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 appearance-none"
                value={settings[id]?.model || models[0]}
                onChange={(e) => updateSetting(id, 'model', e.target.value)}
              >
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sistema Promti</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium min-h-[120px]"
                placeholder="Bu yerga promt yozing..."
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
