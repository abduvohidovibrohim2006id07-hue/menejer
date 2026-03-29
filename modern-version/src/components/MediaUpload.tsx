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

        // Calculate proportions to avoid stretching (contain effect with white padding)
        const scale = Math.min(1080 / img.naturalWidth, 1440 / img.naturalHeight);
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

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        console.log(`MediaUpload: Processing ${file.name}`);
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
        
        // Refresh after each successful upload to show progress
        onSuccess();
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      alert("Yuklashda xatolik yuz berdi: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) await uploadFiles(files);
    // Reset input to allow re-uploading the same files if needed
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          foundImage = true;
          files.push(new File([file], `pasted-image-${Date.now()}-${i}.jpg`, { type: file.type }));
        }
      }
    }
    
    if (files.length > 0) {
      await uploadFiles(files);
    }
    
    // If it's a URL (text), let the default behavior happen (it will fill the input)
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setUploading(true);
    try {
      const cleanUrl = url.trim();
      const lowerUrl = cleanUrl.toLowerCase();
      console.log("MediaUpload: Processing URL", cleanUrl);

      const isSocialMedia = lowerUrl.includes('youtube.com') || 
                            lowerUrl.includes('youtu.be') || 
                            lowerUrl.includes('instagram.com') || 
                            lowerUrl.includes('tiktok.com');

      if (isSocialMedia) {
        console.log("MediaUpload: Social Media detected");
        // Use the Video Downloader logic
        const res = await fetch('/api/video/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, url: cleanUrl }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Video yuklashda xatolik");

        // After download, we need to confirm it to move from temp to final
        await fetch('/api/video/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, filename: data.filename }),
        });
      } else {
        // Regular URL upload via backend (to avoid CORS)
        const res = await fetch('/api/products/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, url: url.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "URL orqali yuklashda xatolik");
      }
      
      setUrl('');
      onSuccess();
    } catch (error: any) {
      console.error("URL Upload failed", error);
      alert("Xatolik: " + (error.message || "Yuklab bo'lmadi"));
    } finally {
      setUploading(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
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

      <div 
        className={`flex-1 min-h-[60px] relative border-2 border-dashed rounded-2xl transition-all group overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {mode === 'file' ? (
          <>
            <input 
              type="file" 
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              onChange={handleFileChange}
              accept="image/*,video/*"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
              <span className={`text-xl mb-0.5 transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}>
                {isDragging ? '📥' : '📁'}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isDragging ? 'text-indigo-600' : 'text-slate-500'}`}>
                {isDragging ? 'Tashlang...' : 'Media yuklash'}
              </span>
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
              onPaste={handlePaste}
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
