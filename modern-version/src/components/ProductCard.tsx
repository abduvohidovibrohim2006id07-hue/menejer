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
}

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductCard = ({ product, onEdit, onDelete }: ProductCardProps) => {
  const scrollGallery = (direction: number) => {
    const gallery = document.getElementById(`gallery-${product.id}`);
    if (gallery) {
      gallery.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  const handleDeleteImg = async (filename: string) => {
    if (!confirm("Rasm o'chirilsinmi?")) return;
    try {
      await fetch('/api/products/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, filename })
      });
      window.location.reload(); // Simple refresh for now
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 items-stretch group/card">
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
              return (
                <div key={idx} className="flex-none w-full aspect-[4/5] md:w-[300px] md:h-[350px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 snap-start relative group/item shadow-sm">
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform group-hover/item:scale-110 duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(product.category + ' ' + (product.brand || '') + ' ' + (product.model || ''))}&tbm=isch`} 
                      target="_blank" 
                      className="w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors"
                    >
                      🔍
                    </a>
                    <a 
                      href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(img)}`} 
                      target="_blank" 
                      className="w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors"
                    >
                      📷
                    </a>
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity flex justify-end p-2 pointer-events-none">
                    <button 
                      onClick={() => handleDeleteImg(filename)}
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
            <MediaUpload productId={product.id} onSuccess={() => window.location.reload()} />
          </div>
          <button 
            onClick={() => onEdit(product)}
            className="col-span-1 py-4 px-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            ✏️ Tahrirlash
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="col-span-1 py-4 px-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🗑️ O'chirish
          </button>
        </div>
      </div>
    </div>
  );
};
