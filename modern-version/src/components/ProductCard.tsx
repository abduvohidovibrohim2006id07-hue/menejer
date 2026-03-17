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
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col gap-5 h-full group/card">
      <div className="flex justify-between items-start pb-5 border-b border-slate-50">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 group-hover/card:text-indigo-600 transition-colors">
            {product.category} {product.brand} {product.model} {product.color}
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
              📁 {product.category}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-indigo-50 text-indigo-500 rounded-lg">
              🆔 {product.id}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="bg-emerald-50 text-emerald-600 text-lg font-black px-4 py-2 rounded-2xl block">
            {Number(product.price).toLocaleString()} so'm
          </span>
        </div>
      </div>

      <div className="text-sm text-slate-500 line-clamp-2 italic">
        {product.description_short || "Tavsif mavjud emas"}
      </div>

      <div className="relative group">
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
                <div key={idx} className="flex-none w-[220px] h-[280px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 snap-start relative group/item shadow-sm">
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform group-hover/item:scale-110 duration-500"
                  />
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
            <div className="w-full py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 font-medium">
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

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <MediaUpload productId={product.id} onSuccess={() => window.location.reload()} />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <button 
            onClick={() => onEdit(product)}
            className="py-3 px-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            ✏️ Tahrirlash
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="py-3 px-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🗑️ O'chirish
          </button>
        </div>
      </div>
    </div>
  );
};
