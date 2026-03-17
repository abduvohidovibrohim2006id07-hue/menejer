"use client";

import React, { useState } from 'react';

interface MediaUploadProps {
  productId: string;
  onSuccess: () => void;
}

export const MediaUpload = ({ productId, onSuccess }: MediaUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');

  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1440;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Fill background white in case of transparency
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1080, 1440);

        // Calculate proportions to avoid stretching (cover effect)
        const scale = Math.max(1080 / img.naturalWidth, 1440 / img.naturalHeight);
        const nw = img.naturalWidth * scale;
        const nh = img.naturalHeight * scale;
        const cx = (1080 - nw) / 2;
        const cy = (1440 - nh) / 2;

        ctx.drawImage(img, cx, cy, nw, nh);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const processedFile = await processImage(file);
      
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, filename: processedFile.name, contentType: processedFile.type })
      });
      const { uploadUrl } = await res.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: processedFile,
        headers: { 'Content-Type': processedFile.type }
      });

      onSuccess();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setUploading(true);
    try {
      const isVideo = url.toLowerCase().split('?')[0].endsWith('.mp4');
      
      if (isVideo) {
        // Direct pass for videos
        const res = await fetch('/api/products/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, url })
        });
        if (!res.ok) throw new Error("Video URL upload failed");
      } else {
        // Resize for images
        const response = await fetch(url);
        if (!response.ok) throw new Error("URL dan rasmni olib bo'lmadi");
        const blob = await response.blob();
        const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg';
        const file = new File([blob], filename, { type: blob.type });
        const processedFile = await processImage(file);

        const upRes = await fetch('/api/products/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, filename: processedFile.name, contentType: processedFile.type })
        });
        const { uploadUrl } = await upRes.json();

        await fetch(uploadUrl, {
          method: 'PUT',
          body: processedFile,
          headers: { 'Content-Type': processedFile.type }
        });
      }
      
      setUrl('');
      onSuccess();
    } catch (error) {
      console.error("URL Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <div className="h-full min-h-[80px] border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center bg-indigo-50/50 p-4">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        <button 
          onClick={() => setMode('file')}
          className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${mode === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          FAYL
        </button>
        <button 
          onClick={() => setMode('url')}
          className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          URL
        </button>
      </div>

      <div className="flex-1 min-h-[60px] relative border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-300 transition-all bg-slate-50/50 group overflow-hidden">
        {mode === 'file' ? (
          <>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              onChange={handleFileChange}
              accept="image/*,video/*"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
              <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">📁</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Media yuklash</span>
            </div>
          </>
        ) : (
          <form onSubmit={handleUrlSubmit} className="absolute inset-0 flex flex-col p-2">
            <input 
              type="text"
              placeholder="https://..."
              className="w-full h-full bg-transparent text-[11px] font-bold text-slate-900 outline-none px-2 placeholder:text-slate-300"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs shadow-lg hover:bg-indigo-700 active:scale-90 transition-all"
            >
              ➔
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
