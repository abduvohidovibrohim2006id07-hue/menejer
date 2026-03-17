"use client";

import React, { useState } from 'react';

interface MediaUploadProps {
  productId: string;
  onSuccess: () => void;
}

export const MediaUpload = ({ productId, onSuccess }: MediaUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get Presigned URL
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, filename: file.name, contentType: file.type })
      });
      const { uploadUrl } = await res.json();

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      onSuccess();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50 group">
      {uploading ? (
        <div className="text-indigo-600 font-bold animate-pulse">Yuklanmoqda...</div>
      ) : (
        <>
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={handleFileChange}
            accept="image/*,video/*"
          />
          <div className="text-slate-500 text-xs font-medium">
            <span className="block text-lg mb-1">📁</span>
            Media yuklash
          </div>
        </>
      )}
    </div>
  );
};
