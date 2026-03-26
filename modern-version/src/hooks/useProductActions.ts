import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

export const useProductActions = (allProducts: any[], mutateProducts: any, mutateCats?: any, mutateMrkts?: any) => {
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    await Promise.all([
      mutateProducts(),
      mutateCats?.(),
      mutateMrkts?.()
    ]);
    setRefreshing(false);
  }, [mutateProducts, mutateCats, mutateMrkts]);

  const handleUpdate = useCallback(async (id: string, updates: any) => {
    // Optimistic UI update immediately via mutate
    const optimisticData = allProducts.map(p => p.id === id ? { ...p, ...updates } : p);
    await mutateProducts(optimisticData, { revalidate: false });
    
    try {
      await apiClient.post('/api/products', { id, ...updates });
      // Revalidate actual data
      await mutateProducts();
    } catch (e: any) {
      toast.error("Ma'lumotni saqlashda xatolik: " + e.message);
      // Revert if failed
      await mutateProducts();
    }
  }, [allProducts, mutateProducts]);

  const handleDelete = useCallback(async (id: string) => {
    const optimisticData = allProducts.filter(p => p.id !== id);
    await mutateProducts(optimisticData, { revalidate: false });

    try {
      apiClient.delete('/api/products', id).then(() => {
        toast.success("Mahsulot o'chirildi!");
        mutateProducts();
      }).catch(e => {
        console.error("Background delete error:", e);
        toast.error("Mahsulotni o'chirishda xatolik: " + e.message);
        mutateProducts();
      });
    } catch (e: any) {
      console.error(e);
      mutateProducts();
    }
  }, [allProducts, mutateProducts]);

  const handleDuplicate = useCallback(async (product: any) => {
    setRefreshing(true);
    try {
      let nextId = "10001";
      const ids = allProducts
        .map(p => parseInt(String(p.id)) || 0)
        .filter(id => !isNaN(id) && id < 1000000); 
      if (ids.length > 0) {
        nextId = (Math.max(...ids) + 1).toString();
      }

      const clone = { 
        ...product, 
        id: nextId,
        updated_at: new Date().toISOString()
      };
      
      await apiClient.post('/api/products', clone);
      toast.success("Mahsulot nusxalandi!");
      await mutateProducts();
    } catch (e: any) {
      toast.error("Nusxalashda xatolik: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }, [allProducts, mutateProducts]);

  const handleBulkDelete = useCallback(async (selectedIds: Set<string>, clearSelection: () => void) => {
    if (!confirm(`${selectedIds.size} ta mahsulot o'chirilsinmi?`)) return;
    setRefreshing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await apiClient.delete('/api/products', id);
      }
      clearSelection();
      await mutateProducts();
      toast.success(`${selectedIds.size} ta mahsulot o'chirildi!`);
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }, [mutateProducts]);

  return { refreshing, fetchData, handleUpdate, handleDelete, handleDuplicate, handleBulkDelete };
};
