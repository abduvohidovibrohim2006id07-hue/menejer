import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

export const useProductsFiltering = (allProducts: any[]) => {
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  
  const {
    selectedCategory, searchQuery, brandFilter, colorFilter,
    minPrice, maxPrice, statusFilter, selectedMarkets, sortBy
  } = useAppStore();

  const filterSignature = useMemo(() => [
    selectedCategory, searchQuery, brandFilter, colorFilter,
    minPrice, maxPrice, statusFilter, selectedMarkets, sortBy
  ].join('|'), [selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets, sortBy]);

  const lastFilterSignature = useRef(filterSignature);

  useEffect(() => {
    // 300ms qotishsiz filtrlash taymeri (Debounce)
    const timer = setTimeout(() => {
      let result = Array.isArray(allProducts) ? [...allProducts] : [];
      
      if (selectedCategory !== "Barchasi") {
        result = result.filter((p: any) => p.category === selectedCategory);
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter((p: any) => {
          const searchPool = [
            p.name || '',
            p.name_ru || '',
            p.brand || '',
            p.model || '',
            p.color || '',
            p.barcode || '',
            p.id?.toString() || ''
          ].map(val => val.toLowerCase());

          return searchPool.some(val => val.includes(q));
        });
      }

      if (brandFilter) {
        const bf = brandFilter.toLowerCase();
        result = result.filter((p: any) => p.brand?.toLowerCase().includes(bf));
      }

      if (colorFilter) {
        const cf = colorFilter.toLowerCase();
        result = result.filter((p: any) => p.color?.toLowerCase().includes(cf));
      }

      if (minPrice) {
        result = result.filter((p: any) => Number(p.price) >= Number(minPrice));
      }

      if (maxPrice) {
        result = result.filter((p: any) => Number(p.price) <= Number(maxPrice));
      }

      if (statusFilter !== "all") {
        result = result.filter((p: any) => (p.status || 'active') === statusFilter);
      }

      if (selectedMarkets.length > 0) {
        result = result.filter((p: any) => {
          const prodMarkets = p.marketplaces || [];
          if (prodMarkets.length === 0) return true;
          return prodMarkets.some((m: string) => selectedMarkets.includes(m));
        });
      } else {
        result = result.filter((p: any) => (p.marketplaces || []).length === 0);
      }
      
      // Sorting
      if (sortBy === 'newest') {
        result.sort((a: any, b: any) => {
          const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return Number(b.id) - Number(a.id);
        });
      } else if (sortBy === 'oldest') {
        result.sort((a: any, b: any) => {
          const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return Number(a.id) - Number(b.id);
        });
      } else if (sortBy === 'name-asc') {
        result.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      } else if (sortBy === 'name-desc') {
        result.sort((a: any, b: any) => (b.name || '').localeCompare(a.name || ''));
      }

      setFilteredProducts(result);
      
      // ONLY reset visible count if the actual filter parameters changed
      if (lastFilterSignature.current !== filterSignature) {
        setVisibleCount(12);
        lastFilterSignature.current = filterSignature;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [allProducts, filterSignature, selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets, sortBy]);

  return { filteredProducts, visibleCount, setVisibleCount };
};
