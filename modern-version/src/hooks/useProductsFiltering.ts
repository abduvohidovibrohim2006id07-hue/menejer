import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

export const useProductsFiltering = (allProducts: any[]) => {
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  
  const {
    selectedCategory, searchQuery, brandFilter, colorFilter,
    minPrice, maxPrice, statusFilter, selectedMarkets, sortBy,
    groupFilter
  } = useAppStore();

  const filterSignature = useMemo(() => [
    selectedCategory, searchQuery, brandFilter, colorFilter,
    minPrice, maxPrice, statusFilter, selectedMarkets, sortBy, groupFilter
  ].join('|'), [selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets, sortBy, groupFilter]);

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
            p.sku_uzum || '',
            p.sku_yandex || '',
            p.group_sku || '',
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
      
      // 4. Grouping Logic (Final Step)
      if (groupFilter) {
        // We are inside a specific group view
        result = result.filter((p: any) => p.group_sku === groupFilter);
      } else {
        // Group items that have a group_sku
        const groupedMap = new Map<string, any[]>();
        const finalResults: any[] = [];
        
        result.forEach((p: any) => {
          if (p.group_sku) {
            if (!groupedMap.has(p.group_sku)) groupedMap.set(p.group_sku, []);
            groupedMap.get(p.group_sku)!.push(p);
          } else {
            finalResults.push(p);
          }
        });
        
        // Convert groups to virtual group cards
        groupedMap.forEach((members, groupSku) => {
          // Create a Virtual Group Product
          const first = members[0];
          
          // Logic for 2x2 grid: Take first image of up to 4 different products
          const gridImages = members
            .map(m => m.local_images && m.local_images.length > 0 ? m.local_images[0] : null)
            .filter(Boolean)
            .slice(0, 4);

          const virtualGroup = {
            id: `group-${groupSku}`,
            group_sku: groupSku,
            isGroup: true,
            name: `${first.category || 'Mahsulotlar'} Guruhi`,
            brand: first.brand,
            model: first.model, // Optional, maybe just show category
            category: first.category,
            status: first.status,
            members: members,
            created_at: first.created_at,
            updated_at: first.updated_at,
            gridImages: gridImages
          };
          finalResults.push(virtualGroup);
        });
        
        result = finalResults;
      }

      // 5. Sorting (apply to final results)
      if (sortBy === 'newest') {
        result.sort((a: any, b: any) => {
          const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
          if (timeA !== timeB) return timeB - timeA;
          // Secondary fallback to ID if dates are exactly the same
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
      } else if (sortBy === 'oldest') {
        result.sort((a: any, b: any) => {
          const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
          const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return (Number(a.id) || 0) - (Number(b.id) || 0);
        });
      }
 else if (sortBy === 'name-asc') {
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
  }, [allProducts, filterSignature, selectedCategory, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets, sortBy, groupFilter]);

  // Dinamik kategoriyalarni hisoblash (Faqat mavjud mahsulotlar bor kategoriyalar)
  const activeCategories = useMemo(() => {
    let base = Array.isArray(allProducts) ? [...allProducts] : [];

    // Apply filters (EXCEPT selectedCategory) to see what categories are available in current context
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      base = base.filter((p: any) => {
        const pool = [p.name || '', p.name_ru || '', p.brand || '', p.model || '', p.category || '', p.id?.toString() || ''].map(v => v.toLowerCase());
        return pool.some(v => v.includes(q));
      });
    }

    if (statusFilter !== "all") {
      base = base.filter((p: any) => (p.status || 'active') === statusFilter);
    }

    if (selectedMarkets.length > 0) {
      base = base.filter((p: any) => (p.marketplaces || []).some((m: string) => selectedMarkets.includes(m)));
    } else {
      base = base.filter((p: any) => (p.marketplaces || []).length === 0);
    }

    if (brandFilter) base = base.filter((p: any) => p.brand?.toLowerCase().includes(brandFilter.toLowerCase()));
    if (colorFilter) base = base.filter((p: any) => p.color?.toLowerCase().includes(colorFilter.toLowerCase()));
    if (minPrice) base = base.filter((p: any) => Number(p.price) >= Number(minPrice));
    if (maxPrice) base = base.filter((p: any) => Number(p.price) <= Number(maxPrice));

    const catCounts: Record<string, number> = {};
    base.forEach(p => { 
      if (p.category) {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      }
    });

    return Object.entries(catCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, searchQuery, brandFilter, colorFilter, minPrice, maxPrice, statusFilter, selectedMarkets]);

  return { filteredProducts, visibleCount, setVisibleCount, activeCategories };
};


