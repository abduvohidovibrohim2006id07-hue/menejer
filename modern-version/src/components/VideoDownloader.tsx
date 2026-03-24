"use client";

import React, { useState } from 'react';

export const VideoDownloader = () => {
  const [productId, setProductId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [tempVideo, setTempVideo] = useState<{ url: string, filename: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const formatSecondsToTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const captureTime = (type: 'start' | 'end') => {
    if (videoRef.current) {
      const time = formatSecondsToTime(videoRef.current.currentTime);
      if (type === 'start') setStartTime(time);
      else setEndTime(time);
    }
  };

  const handleDownload = async () => {
    if (!productId || !videoUrl) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    setLoading(true);
    setStatus("Video yuklanmoqda va qayta ishlanmoqda... Kuting.");
    setTempVideo(null);

    try {
      const res = await fetch('/api/video/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId, 
          url: videoUrl.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim()
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuklashda xatolik");

      setTempVideo({ url: data.tempUrl, filename: data.filename });
      setStatus("Video tayyor! Uni tekshirib ko'ring.");
    } catch (e: any) {
      alert("Xatolik: " + e.message);
      setStatus("Xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!tempVideo) return;

    setConfirming(true);
    setStatus("Bulutga yuklanmoqda...");

    try {
      const res = await fetch('/api/video/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, filename: tempVideo.filename }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tasdiqlashda xatolik");

      alert("Video muvaffaqiyatli yuklandi!");
      setTempVideo(null);
      setProductId("");
      setVideoUrl("");
      setStatus("Tayyor! Yangi video yuklashingiz mumkin.");
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center space-y-4">
        <div className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-2">
          Professional vosita
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
          Video Yuklagich <span className="text-indigo-600">Pro</span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium px-4">
          .m3u8 formatidagi videolarni MP4 ga o&apos;girib, ideal sifatda bulutga yuklang.
        </p>
      </header>

      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-slate-200 shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest">Mahsulot ID</label>
            <input 
              type="text"
              placeholder="Masalan: 10013"
              className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-900"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest">Video Link (m3u8, Insta, YT)</label>
            <input 
              type="text"
              placeholder="https://..."
              className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-[20px] md:rounded-[24px] focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-900"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-6 bg-slate-50 rounded-[28px] border border-slate-100">
          <div className="space-y-3">
            <div className="flex justify-between px-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">✂️ Boshlanish vaqti</label>
              <span className="text-[9px] font-bold text-slate-400">format: 00:00:05</span>
            </div>
            <input 
              type="text"
              placeholder="00:00:00"
              className="w-full p-4 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-900"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between px-1">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">🛑 Tugash vaqti</label>
              <span className="text-[9px] font-bold text-slate-400">format: 00:00:15</span>
            </div>
            <input 
              type="text"
              placeholder="To'liq yuklash"
              className="w-full p-4 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-900"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={handleDownload}
          disabled={loading || confirming}
          className={`w-full py-5 md:py-6 rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
              Qayta ishlanmoqda...
            </>
          ) : (
            <>
              <span>🚀</span> Yuklashni boshlash
            </>
          )}
        </button>

        {status && (
          <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-lg">ℹ️</span>
              <p className="text-sm font-bold text-slate-600 leading-tight">{status}</p>
            </div>
            {(startTime || endTime) && (
              <button onClick={() => { setStartTime(""); setEndTime(""); }} className="text-[10px] font-black text-red-500 hover:text-red-700">TOZALASH</button>
            )}
          </div>
        )}
      </div>

      {tempVideo && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-10">
          <header className="flex items-center justify-between px-2">
            <h3 className="text-xl md:text-2xl font-black text-slate-900">Preview (Kesish)</h3>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">Yuklab olindi</span>
          </header>

          <div className="bg-black rounded-[24px] md:rounded-[40px] overflow-hidden shadow-2xl border-2 md:border-4 border-white aspect-video relative group">
            <video 
              ref={videoRef}
              src={tempVideo.url} 
              className="w-full h-full object-contain"
              controls
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={() => captureTime('start')}
               className="py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center gap-2"
             >
               📍 Boshini {startTime ? `(${startTime})` : ""} belgilash
             </button>
             <button 
               onClick={() => captureTime('end')}
               className="py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center gap-2"
             >
               📍 Tugashini {endTime ? `(${endTime})` : ""} belgilash
             </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <button 
              onClick={handleDownload}
              disabled={loading || confirming}
              className="flex-1 py-5 md:py-6 bg-indigo-600 text-white rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? "⏳ Kesilmoqda..." : "✂️ QAYTA KESISH"}
            </button>
            <button 
              onClick={handleConfirm}
              disabled={confirming}
              className={`flex-1 py-5 md:py-6 bg-emerald-600 text-white rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3 ${confirming ? 'opacity-50' : ''}`}
            >
              {confirming ? (
                 <>
                  <div className="w-5 h-5 border-2 border-emerald-300 border-t-white rounded-full animate-spin"></div>
                  Yuklanmoqda...
                 </>
              ) : (
                <>✅ Tasdiqlash va Saqlash</>
              )}
            </button>
            <button 
              onClick={() => setTempVideo(null)}
              disabled={confirming}
              className="px-6 md:px-10 py-5 md:py-6 bg-white text-slate-500 border border-slate-200 rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
            >
              ❌ Bekor qilish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
