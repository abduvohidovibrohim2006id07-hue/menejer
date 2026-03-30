"use client";

import React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { MediaUpload } from './MediaUpload';
import { PriceCalculatorModal } from './PriceCalculatorModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CompetitorsModal } from './CompetitorsModal';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  name_ru?: string;
  price: string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  description_short?: string;
  description_short_ru?: string;
  description_full?: string;
  description_full_ru?: string;
  local_images?: string[];
  sku?: string;
  status?: 'active' | 'quarantine' | 'archive';
  marketplaces?: string[];
  price_retail?: string;
  length_mm?: string | number;
  width_mm?: string | number;
  height_mm?: string | number;
  weight_g?: string | number;
  competitors?: { shopName: string; url: string }[];
  isGroup?: boolean;
  group_sku?: string;
  members?: any[];
  gridImages?: string[];
}

interface ProductCardProps {
  product: Product;
  markets?: any[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onRefresh: () => void;
  onDuplicate?: (p: Product) => void;
  selected: boolean;
  onSelectToggle: (id: string) => void;
}

export const ProductCard = React.memo(({ product, markets = [], onEdit, onDelete, onUpdate, onRefresh, onDuplicate, selected, onSelectToggle }: ProductCardProps) => {
  const { setFilter } = useAppStore();
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [confirmDeleteImg, setConfirmDeleteImg] = React.useState<string | null>(null);
  const [imageValidations, setImageValidations] = React.useState<Record<string, { w: number, h: number, isValid: boolean }>>({});
  const [fixing, setFixing] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deletingImg, setDeletingImg] = React.useState<string | null>(null);
  const [showPriceCalc, setShowPriceCalc] = React.useState(false);
  const [showCompetitors, setShowCompetitors] = React.useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);

  // Sahifa yangilanganda URL dan o'qib ochish
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('competitors') === product.id) {
      setShowCompetitors(true);
    }
  }, [product.id]);

  const openCompetitorsModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCompetitors(true);
    const url = new URL(window.location.href);
    url.searchParams.set('competitors', product.id);
    window.history.replaceState({}, '', url);
  };

  const closeCompetitorsModal = () => {
    setShowCompetitors(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('competitors');
    window.history.replaceState({}, '', url);
  };

  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1440;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1080, 1440);
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

  const handleFixImage = async (imgUrl: string) => {
    setFixing(imgUrl);
    try {
      const filename = imgUrl.split('/').pop() || 'image.jpg';
      
      // Fetch through proxy to avoid CORS and get blob for processing
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(imgUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Rasmni yuklab bo'lmadi");
      
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      
      // Process localy (Resize to 1080x1440 with white padding)
      const processedFile = await processImage(file);

      const upRes = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, filename: processedFile.name, contentType: processedFile.type })
      });
      const { uploadUrl } = await upRes.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: processedFile,
        headers: { 'Content-Type': processedFile.type }
      });

      await fetch('/api/products/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, filename })
      });

      onRefresh();
    } catch (e: any) {
      console.error("Fix image error:", e);
      alert("Xatolik: " + e.message);
    } finally {
      setFixing(null);
    }
  };

  const handleImageLoad = (url: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const isValid = w === 1080 && h === 1440;
    setImageValidations(prev => ({
      ...prev,
      [url]: { w, h, isValid }
    }));
  };

  const scrollGallery = (direction: number) => {
    const gallery = document.getElementById(`gallery-${product.id}`);
    if (gallery) {
      gallery.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  const handleDeleteImg = async (filename: string) => {
    setDeletingImg(filename);
    setConfirmDeleteImg(null);
    
    try {
      // Smooth delay for animation to finish (matching duration-500)
      await new Promise(r => setTimeout(r, 500));
      
      // OPTIMISTIC UI: Remove image from local state first if possible, but 
      // since it's derived from S3 in getProducts, local state update is tricky.
      // We'll just rely on the background delete + refresh.

      // Perform deletion
      fetch('/api/products/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, filename })
      }).then(() => {
        onRefresh();
      }).catch(e => {
        console.error("Delete image error:", e);
        alert("Rasmni o'chirishda xatolik");
      }).finally(() => {
        setDeletingImg(null);
      });

    } catch (e: any) {
      console.error(e);
      setDeletingImg(null);
      alert("Xatolik: " + e.message);
    }
  };

  const [confirmDeleteProduct, setConfirmDeleteProduct] = React.useState(false);

  const handleDownloadAllMedia = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.local_images || product.local_images.length === 0) {
      alert("Yuklab olish uchun media fayllar yo'q!");
      return;
    }

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      // Create a valid folder name based on product brand and model
      const _brand = product.brand ? product.brand.trim() : "";
      const _model = product.model ? product.model.trim() : "";
      const generatedName = `${_brand} ${_model}`.trim() || product.category || "Media";
      const sfFolderName = generatedName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const folder = zip.folder(sfFolderName);
      if (!folder) throw new Error("Papka yaratishda xatolik");

      const promises = product.local_images.map(async (url, idx) => {
        try {
          // Fetch the file through the proxy to avoid CORS
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error();
          
          const blob = await response.blob();
          const ext = url.includes('.mp4') ? 'mp4' : url.includes('.mov') ? 'mov' : 'jpg';
          const filename = `${sfFolderName}_${idx + 1}.${ext}`;
          
          folder.file(filename, blob);
        } catch (err) {
          console.error(`Fayl yuklashda xatolik: ${url}`, err);
        }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${sfFolderName}.zip`);

    } catch (e: any) {
      alert("Yuklashda xatolik: " + e.message);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // LIGHTBOX NAVIGATION
  const currentIndex = product.local_images?.indexOf(previewUrl || '') ?? -1;
  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.local_images && currentIndex < product.local_images.length - 1) {
      setPreviewUrl(product.local_images[currentIndex + 1]);
    }
  };
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.local_images && currentIndex > 0) {
      setPreviewUrl(product.local_images[currentIndex - 1]);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMoreMenu && !target.closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewUrl) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setPreviewUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewUrl, currentIndex]);

  const calculateScore = (p: any) => {
    let s = 0;
    const media = p.local_images || [];
    const isVideo = (url: string) => url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov');
    const videos = media.filter((url: string) => isVideo(url));
    const images = media.filter((url: string) => !isVideo(url));

    if (p.name) s += 5;
    if (p.brand) s += 5;
    if (p.model) s += 5;
    if (p.category) s += 5;
    if (p.color) s += 5;
    if (p.price) s += 5;

    if (p.description_short && p.description_short.length > 10) s += 5;
    if (p.description_short_ru && p.description_short_ru.length > 10) s += 5;
    if (p.description_full && p.description_full.length > 50) s += 5;
    if (p.description_full_ru && p.description_full_ru.length > 50) s += 5;

    if (images.length >= 3) s += 15;
    else if (images.length > 0) s += 5;
    if (videos.length >= 1) s += 15;

    if (Number(p.length_mm) > 0) s += 5;
    if (Number(p.width_mm) > 0) s += 5;
    if (Number(p.height_mm) > 0) s += 5;
    if (Number(p.weight_g) > 0) s += 5;

    return Math.min(100, s);
  };

  const getProductScore = () => {
    if (product.isGroup && product.members) {
      const total = product.members.reduce((acc, m) => acc + calculateScore(m), 0);
      return Math.round(total / product.members.length);
    }
    return calculateScore(product);
  };

  const score = getProductScore();
  const scoreColor = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-indigo-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`bg-white rounded-[32px] p-6 border transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col md:flex-row gap-8 items-stretch group/card relative ${selected ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl bg-indigo-50/10' : 'border-slate-100 shadow-sm hover:shadow-xl'} ${isDeleting ? 'scale-0 rotate-[10deg] opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
      {/* DELETING INDICATOR LOG */}
      {isDeleting && (
        <div className="absolute top-4 left-4 z-[60] bg-red-600 text-white px-4 py-2 rounded-full font-black text-[10px] animate-pulse shadow-lg flex items-center gap-2">
           <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
           O&apos;CHIRILMOQDA...
        </div>
      )}

      {/* PRODUCT DELETE OVERLAY */}
      {confirmDeleteProduct && (
        <div className="absolute inset-0 z-[45] bg-red-600/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-200">
          <span className="text-6xl mb-6">🗑️</span>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Mahsulotni o&apos;chiramizmi?</h3>
          <p className="text-white/80 font-medium mb-8">Ushbu amalni ortga qaytarib bo&apos;lmaydi.</p>
          <div className="flex gap-4 w-full max-w-sm">
            <button 
              onClick={() => {
                setIsDeleting(true);
                setConfirmDeleteProduct(false);
                setTimeout(() => onDelete(product.id), 500);
              }}
              className="flex-1 py-4 bg-white text-red-600 font-black rounded-2xl hover:bg-slate-100 active:scale-95 transition-all shadow-xl"
            >
              HA, O&apos;CHIRILSIN
            </button>
            <button 
              onClick={() => setConfirmDeleteProduct(false)}
              className="flex-1 py-4 bg-transparent text-white border-2 border-white/30 font-black rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
            >
              YO&apos;Q, QOLSIN
            </button>
          </div>
        </div>
      )}
      {/* SELECTION CHECKBOX (Floating) */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onSelectToggle(product.id);
        }}
        className={`absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer z-30 transition-all ${selected ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg' : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'}`}
      >
        <span className="text-xs font-black">✓</span>
      </div>

      {/* Media Preview Modal (Lightbox) */}
      {previewUrl && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setPreviewUrl(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all z-[110]"
            onClick={() => setPreviewUrl(null)}
          >
            ✕
          </button>

          {/* Prev Button */}
          {currentIndex > 0 && (
            <button 
              className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-3xl transition-all z-[110]"
              onClick={handlePrev}
            >
              &#10094;
            </button>
          )}

          {/* Next Button */}
          {product.local_images && currentIndex < product.local_images.length - 1 && (
            <button 
              className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-3xl transition-all z-[110]"
              onClick={handleNext}
            >
              &#10095;
            </button>
          )}
          
          <div 
            className="relative max-w-screen-2xl w-full h-full flex items-center justify-center p-2 md:p-6"
            onClick={e => e.stopPropagation()}
          >
            {previewUrl.toLowerCase().includes('.mp4') || previewUrl.toLowerCase().includes('.mov') ? (
              <video 
                src={previewUrl} 
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                controls
              />
            ) : (
              <>
                <img 
                  src={previewUrl} 
                  alt="" 
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  key={previewUrl} 
                  onLoad={(e) => handleImageLoad(previewUrl, e)}
                />

                {/* DIMENSION WARNING IN LIGHTBOX */}
                {imageValidations[previewUrl] && !imageValidations[previewUrl].isValid && (
                  <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 z-[120] bg-red-600/95 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/20 shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between gap-6 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <span className="text-sm font-black text-white uppercase tracking-widest">Noto&apos;g&apos;ri o&apos;lcham!</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFixImage(previewUrl);
                        }}
                        disabled={fixing === previewUrl}
                        className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-100 transition-all shadow-sm active:scale-90 flex items-center gap-2 disabled:opacity-50"
                      >
                        {fixing === previewUrl ? "⏳ Kuting..." : "🛠️ TO'G'IRLASH"}
                      </button>
                    </div>
                    <p className="text-sm text-white/90 font-medium leading-relaxed bg-black/10 p-3 rounded-xl border border-white/10">
                      Standard: <span className="font-black text-white">1080x1440</span><br/>
                      Fayldagi: <span className="font-black text-red-200">{imageValidations[previewUrl].w} x {imageValidations[previewUrl].h}</span>
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* INDEX COUNTER */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-2 rounded-full text-white/50 text-xs font-black tracking-widest">
              {currentIndex + 1} / {product.local_images?.length}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Left: Gallery Section */}
      <div className="relative group w-full md:w-[350px] shrink-0">
        {product.isGroup ? (
          <div className="w-full aspect-[3/4] md:w-[300px] md:h-[400px] grid grid-cols-2 grid-rows-2 gap-1 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200">
            {product.gridImages && product.gridImages.length > 0 ? (
              product.gridImages.map((img, idx) => (
                <div key={idx} className="relative w-full h-full bg-white">
                  <Image src={img} alt="" fill className="object-cover" sizes="150px" />
                </div>
              ))
            ) : (
              <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-300 font-bold italic">Rasm Yo'q</div>
            )}
            {/* If less than 4, fill with empty but stylized slots */}
            {product.gridImages && product.gridImages.length < 4 && Array.from({ length: 4 - product.gridImages.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50 flex items-center justify-center">
                 <span className="text-[10px] text-slate-200 font-black">BO'SH</span>
              </div>
            ))}
            
            <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none"></div>
            <div className="absolute top-3 left-3 bg-indigo-600 text-white px-3 py-1 rounded-full font-black text-[10px] shadow-lg">
               {product.members?.length} TA MAHSULOT
            </div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => scrollGallery(-1)}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-800 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
            >
              &#10094;
            </button>
            
            <div 
              id={`gallery-${product.id}`}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x p-1"
            >
              {product.local_images && product.local_images.length > 0 ? (
                product.local_images.map((img, idx) => {
                  const filename = img.split('/').pop()?.split('?')[0] || '';
                  const isVideo = img.toLowerCase().includes('.mp4') || img.toLowerCase().includes('.mov');
                  const isDeletingThis = deletingImg === filename;
                  return (
                    <div 
                      key={idx} 
                      className={`flex-none w-full aspect-[3/4] md:w-[300px] md:h-[400px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 snap-start relative group/item shadow-sm cursor-zoom-in transition-all duration-500 ease-in-out ${isDeletingThis ? 'scale-50 opacity-0 rotate-12 blur-lg pointer-events-none' : 'scale-100 opacity-100'}`}
                      onClick={() => !confirmDeleteImg && !isDeletingThis && setPreviewUrl(img)}
                    >
                      {isDeletingThis && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                          <div className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-[9px] animate-bounce shadow-xl uppercase tracking-tighter">
                            O&apos;chirilmoqda...
                          </div>
                        </div>
                      )}
                      {isVideo ? (
                        <video 
                          src={img} 
                          className="w-full h-full object-cover"
                          loop 
                          muted 
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                          onMouseLeave={(e) => { e.currentTarget.pause(); }}
                        />
                      ) : (
                        <Image 
                          src={img} 
                          alt="" 
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          className="object-cover transition-transform group-hover/item:scale-110 duration-500"
                        />
                      )}
                      
                      {/* CONFIRM DELETE OVERLAY */}
                      {confirmDeleteImg === filename && (
                        <div className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                          <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Rostdan ham o&apos;chirilsinmi?</p>
                          <div className="flex gap-3 w-full">
                            <button 
                              onClick={() => handleDeleteImg(filename)}
                              className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all text-xs"
                            >
                              HA, O&apos;CHIR
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteImg(null)}
                              className="flex-1 py-3 bg-white/20 text-white font-black rounded-xl hover:bg-white/30 active:scale-95 transition-all text-xs border border-white/10"
                            >
                              YO&apos;Q
                            </button>
                          </div>
                        </div>
                      )}
    
                      <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(product.category + ' ' + (product.brand || '') + ' ' + (product.model || ''))}&tbm=isch`} 
                          target="_blank" 
                          className="w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🔍
                        </a>
                        <a 
                          href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(img)}`} 
                          target="_blank" 
                          className="w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📷
                        </a>
                      </div>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity flex justify-end p-2 pointer-events-none">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteImg(filename);
                          }}
                          className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-lg pointer-events-auto hover:bg-red-700 active:scale-90 transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-[350px] py-10 flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 font-medium">
                  Rasm yoki video yuklanmagan
                </div>
              )}
            </div>
    
            <button 
              onClick={() => scrollGallery(1)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-800 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
            >
              &#10095;
            </button>
          </>
        )}
      </div>

      {/* Right: Content Section */}
      <div className="flex-1 flex flex-col justify-between py-2">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 group-hover/card:text-indigo-600 transition-colors">
                {product.category} {product.brand} {product.model} {product.color}
              </h2>

              <div className="mt-4 flex items-center gap-3">
                 <div className={`${scoreColor} text-white px-6 py-2 rounded-2xl text-lg font-black shadow-lg flex items-center gap-4 border-2 border-white/20`}>
                    <span className="tracking-tighter">{score} <span className="text-xs opacity-80">%</span></span>
                    <div className="w-24 h-2 bg-white/30 rounded-full overflow-hidden hidden sm:block">
                       <div className="h-full bg-white shadow-[0_0_10px_white]" style={{ width: `${score}%` }}></div>
                    </div>
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                    Kartochka<br/>To&apos;liqligi
                 </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                  📁 {product.category}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-indigo-50 text-indigo-500 rounded-lg">
                  🆔 {product.id}
                </span>

                {(product.status === 'active' || !product.status) && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                    ✅ FAOL
                  </span>
                )}
                {product.status === 'quarantine' && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
                    ⚠️ KARANTIN
                  </span>
                )}
                {product.status === 'archive' && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-slate-200 text-slate-700 rounded-lg">
                    📁 ARXIV
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              {!product.isGroup && (
                <>
                  <span className="bg-emerald-50 text-emerald-600 text-2xl font-black px-6 py-3 rounded-2xl block shadow-sm border border-emerald-100/50">
                    {Number(product.price).toLocaleString()} so&apos;m
                  </span>
                  {product.price_retail && (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                       Chakana: <span className="text-slate-600">{Number(product.price_retail).toLocaleString()} so&apos;m</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-full mb-1">Sotuvda:</span>
            {product.marketplaces && product.marketplaces.length > 0 ? (
              product.marketplaces.map((mid: string) => {
                const config = (markets || []).find(m => m.id === mid);
                const isInstagram = mid === 'instagram';
                
                return (
                  <div key={mid} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                    {config ? (
                      <>
                        <div 
                          className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shadow-sm"
                          style={{ 
                            backgroundColor: config.color !== 'gradient' ? config.color : undefined,
                            background: isInstagram || config.color === 'gradient' ? 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)' : undefined,
                            color: config.textColor || 'white'
                          }}
                        >
                          {config.icon || config.short || config.name.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-slate-600">{config.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{mid}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-[10px] font-bold text-slate-300 italic">Hech qayerda sotuvda emas</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-6 border-t border-slate-100">
          {product.isGroup ? (
            <div className="col-span-2">
               <button
                  onClick={() => setFilter('groupFilter', product.group_sku)}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
               >
                  <span className="text-xl">👀</span>
                  <span>GURUHNI KO&apos;RISH</span>
               </button>
            </div>
          ) : (
            <>
              <div className="col-span-1 flex gap-2">
                <div className="flex-[0.6]">
                  <MediaUpload productId={product.id} onSuccess={onRefresh} />
                </div>
                <button
                  onClick={handleDownloadAllMedia}
                  disabled={isDownloadingAll || !product.local_images || product.local_images.length === 0}
                  className={`flex-[0.4] py-3 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed transition-all active:scale-95 ${isDownloadingAll ? 'bg-indigo-50 border-indigo-200 text-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                >
                   {isDownloadingAll ? (
                      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                   ) : (
                      <>
                        <span className="text-xl">📥</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-center px-1 leading-tight">BARCHASINI<br/>YUKLASH</span>
                      </>
                   )}
                </button>
              </div>

              <div className="col-span-1 flex flex-col gap-3">
                <button 
                  onClick={() => onEdit(product)}
                  className="w-full py-4 px-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  ✏️ Tahrirlash
                </button>
                
                <div className="relative more-menu-container">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreMenu(!showMoreMenu);
                    }}
                    className="w-full py-4 px-4 bg-slate-50 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-100"
                  >
                    <span>⚙️</span> Batafsil
                  </button>

              {showMoreMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-3 right-0 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden"
                >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPriceCalc(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-slate-50"
                    >
                      <span className="text-lg">🧮</span>
                      <span className="font-bold text-slate-600">Narx hisoblash</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        openCompetitorsModal(e);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-red-50 flex items-center gap-3 transition-colors border-b border-slate-50"
                    >
                      <span className="text-lg">📊</span>
                      <span className="font-bold text-slate-600">Raqobat {product.competitors?.length ? `(${product.competitors.length})` : ''}</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDuplicate) onDuplicate(product);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-slate-50"
                    >
                      <span className="text-lg">📋</span>
                      <span className="font-bold text-slate-600">Nusxalash</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteProduct(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600 border-b border-slate-50"
                    >
                      <span className="text-lg">🗑️</span>
                      <span className="font-bold">O&apos;chirish</span>
                    </button>
                    {(product as any).group_sku && !product.isGroup && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const loadId = toast.loading("Guruhdan chiqarilmoqda...");
                          try {
                            await apiClient.post('/api/products', { id: product.id, group_sku: null });
                            toast.success("Mahsulot guruhdan chiqarildi!", { id: loadId });
                            onRefresh();
                          } catch (err: any) {
                            toast.error(err.message, { id: loadId });
                          }
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-5 py-4 hover:bg-amber-50 flex items-center gap-3 transition-colors text-amber-600 font-bold"
                      >
                         <span className="text-lg">🔓</span>
                         <span>Guruhdan chiqarish</span>
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
            </>
          )}
        </div>
          {showPriceCalc && (
            <PriceCalculatorModal 
              isOpen={showPriceCalc} 
              onClose={() => setShowPriceCalc(false)} 
              initialPrice={product.price}
              initialCost={product.price_retail}
              productName={`${product.category} ${product.brand || ''} ${product.model || ''}`}
            />
          )}
          {showCompetitors && (
            <CompetitorsModal 
              isOpen={showCompetitors}
              onClose={closeCompetitorsModal}
              competitors={product.competitors || []}
              onUpdate={(next) => onUpdate(product.id, { competitors: next })}
              productName={`${product.category} ${product.brand || ''} ${product.model || ''}`}
              currentProduct={{
                price: Number(product.price) || 0,
                image: product.local_images?.[0] || '',
                title: `${product.category} ${product.brand || ''} ${product.model || ''}`.trim()
              }}
              marketplaces={product.marketplaces || []}
              markets={markets}
              warehouseData={(product as any).warehouse_data || {}}
            />
          )}
        </div>
      </div>
    );
});
