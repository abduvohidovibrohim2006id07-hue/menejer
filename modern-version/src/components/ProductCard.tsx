"use client";

import React from 'react';
import { MediaUpload } from './MediaUpload';

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  description_short?: string;
  local_images?: string[];
  sku?: string;
  status?: 'active' | 'quarantine' | 'archive';
  marketplaces?: string[];
}

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  selected: boolean;
  onSelectToggle: (id: string) => void;
}

export const ProductCard = ({ product, onEdit, onDelete, onRefresh, selected, onSelectToggle }: ProductCardProps) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [confirmDeleteImg, setConfirmDeleteImg] = React.useState<string | null>(null);

  const scrollGallery = (direction: number) => {
    const gallery = document.getElementById(`gallery-${product.id}`);
    if (gallery) {
      gallery.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  const handleDeleteImg = async (filename: string) => {
    try {
      await fetch('/api/products/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, filename })
      });
      setConfirmDeleteImg(null);
      onRefresh(); 
    } catch (e) {
      console.error(e);
    }
  };

  const [confirmDeleteProduct, setConfirmDeleteProduct] = React.useState(false);

  return (
    <div className={`bg-white rounded-3xl p-6 border transition-all flex flex-col md:flex-row gap-8 items-stretch group/card relative ${selected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg bg-indigo-50/10' : 'border-slate-200 shadow-sm hover:shadow-xl'}`}>
      {/* PRODUCT DELETE OVERLAY */}
      {confirmDeleteProduct && (
        <div className="absolute inset-0 z-[45] bg-red-600/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-200">
          <span className="text-6xl mb-6">🗑️</span>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Mahsulotni o'chiramizmi?</h3>
          <p className="text-white/80 font-medium mb-8">Ushbu amalni ortga qaytarib bo'lmaydi.</p>
          <div className="flex gap-4 w-full max-w-sm">
            <button 
              onClick={() => {
                onDelete(product.id);
                setConfirmDeleteProduct(false);
              }}
              className="flex-1 py-4 bg-white text-red-600 font-black rounded-2xl hover:bg-slate-100 active:scale-95 transition-all shadow-xl"
            >
              HA, O'CHIRILSIN
            </button>
            <button 
              onClick={() => setConfirmDeleteProduct(false)}
              className="flex-1 py-4 bg-transparent text-white border-2 border-white/30 font-black rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
            >
              YO'Q, QOLSIN
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
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setPreviewUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all z-[110]"
            onClick={() => setPreviewUrl(null)}
          >
            ✕
          </button>
          
          <div 
            className="relative max-w-5xl w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {previewUrl.toLowerCase().endsWith('.mp4') ? (
              <video 
                src={previewUrl} 
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                controls
                autoPlay
              />
            ) : (
              <img 
                src={previewUrl} 
                alt="" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Left: Gallery Section */}
      <div className="relative group w-full md:w-[350px] shrink-0">
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
              const filename = img.split('/').pop() || '';
              const isVideo = img.toLowerCase().endsWith('.mp4');
              return (
                <div 
                  key={idx} 
                  className="flex-none w-full aspect-[4/5] md:w-[300px] md:h-[350px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 snap-start relative group/item shadow-sm cursor-zoom-in"
                  onClick={() => !confirmDeleteImg && setPreviewUrl(img)}
                >
                  {isVideo ? (
                    <video 
                      src={img} 
                      className="w-full h-full object-cover"
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                    />
                  ) : (
                    <img 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform group-hover/item:scale-110 duration-500"
                    />
                  )}
                  
                  {/* CONFIRM DELETE OVERLAY */}
                  {confirmDeleteImg === filename && (
                    <div className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                      <p className="text-white font-black text-sm uppercase tracking-widest mb-4">Rostdan ham o'chirilsinmi?</p>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => handleDeleteImg(filename)}
                          className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all text-xs"
                        >
                          HA, O'CHIR
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteImg(null)}
                          className="flex-1 py-3 bg-white/20 text-white font-black rounded-xl hover:bg-white/30 active:scale-95 transition-all text-xs border border-white/10"
                        >
                          YO'Q
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
      </div>

      {/* Right: Content Section */}
      <div className="flex-1 flex flex-col justify-between py-2">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 group-hover/card:text-indigo-600 transition-colors">
                {product.category} {product.brand} {product.model} {product.color}
              </h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                  📁 {product.category}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-indigo-50 text-indigo-500 rounded-lg">
                  🆔 {product.id}
                </span>
                
                {/* Operational Status Badge */}
                {product.status === 'active' && <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg shadow-sm border border-emerald-200">✅ FAOL</span>}
                {product.status === 'quarantine' && <span className="text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-lg shadow-sm border border-amber-200">⚠️ KARANTIN</span>}
                {product.status === 'archive' && <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-700 rounded-lg shadow-sm border border-slate-200">📁 ARXIV</span>}
                
                {/* Marketplace Presence */}
                {product.marketplaces && product.marketplaces.length > 0 && (
                  <div className="flex gap-2 items-center bg-slate-50/50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                    {product.marketplaces.includes('uzum') && (
                      <div title="Uzum Market" className="w-5 h-5 bg-[#7000FF] rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-white/20">U</div>
                    )}
                    {product.marketplaces.includes('yandex') && (
                      <div title="Yandex Market" className="w-5 h-5 bg-[#FFCC00] rounded-md flex items-center justify-center text-[10px] font-black text-black shadow-sm ring-1 ring-black/10">Y</div>
                    )}
                    {product.marketplaces.includes('olx') && (
                      <div title="OLX" className="w-5 h-5 bg-[#002f34] rounded-md flex items-center justify-center text-[8px] font-black text-[#23e5db] shadow-sm ring-1 ring-white/10 uppercase">olx</div>
                    )}
                    {product.marketplaces.includes('wildberries') && (
                      <div title="Wildberries" className="w-5 h-5 bg-[#cb11ab] rounded-md flex items-center justify-center text-[8px] font-black text-white shadow-sm ring-1 ring-white/10 uppercase">wb</div>
                    )}
                    {product.marketplaces.includes('instagram') && (
                      <div title="Instagram" className="w-5 h-5 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-md flex items-center justify-center text-[10px] text-white shadow-sm ring-1 ring-white/20">📸</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <span className="bg-emerald-50 text-emerald-600 text-2xl font-black px-6 py-3 rounded-2xl block shadow-sm border border-emerald-100/50">
                {Number(product.price).toLocaleString()} so'm
              </span>
            </div>
          </div>

          <p className="text-slate-500 leading-relaxed mb-6 text-sm">
            {product.description_short || "Tavsif mavjud emas. Mahsulot haqida batafsil ma'lumot olish uchun tahrirlash bo'limiga o'ting."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t border-slate-100">
          <div className="col-span-1">
            <MediaUpload productId={product.id} onSuccess={onRefresh} />
          </div>
          <button 
            onClick={() => onEdit(product)}
            className="col-span-1 py-4 px-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            ✏️ Tahrirlash
          </button>
          <button 
            onClick={() => setConfirmDeleteProduct(true)}
            className="col-span-1 py-4 px-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🗑️ O'chirish
          </button>
        </div>
      </div>
    </div>
  );
};
