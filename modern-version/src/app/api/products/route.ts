import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'products';

// FETCH PRODUCTS
export const GET = withGateway(async () => {
  const cached = getCache(CACHE_KEY, TTL.PRODUCTS);
  if (cached) return cached;

  const data = await getProducts();
  setCache(CACHE_KEY, data);
  return data;
});

// CREATE/UPDATE PRODUCT
export const POST = withGateway(async (req) => {
  const data = await req.json();
  const { id, ...rest } = data;

  if (!id) throw { message: 'ID majburiy', status: 400 };

  let status = rest.status || 'active';

  const brand = (rest.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const model = (rest.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const color = (rest.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  // Dublikat tekshirish: cache dan, agar yo'q bo'lsa Firestore dan
  if (brand && model && color) {
    let products = getCache(CACHE_KEY, TTL.PRODUCTS);
    if (!products) {
      const snapshot = await db.collection('products').get();
      products = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }

    const isDuplicate = products.some((p: any) => {
      if (p.id === id.toString()) return false;
      const dBrand = (p.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      const dModel = (p.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      const dColor = (p.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      return dBrand === brand && dModel === model && dColor === color;
    });

    if (isDuplicate) status = 'quarantine';
  }

  await db.collection('products').doc(id.toString()).set({
    ...rest,
    status,
    updated_at: new Date().toISOString(),
  }, { merge: true });

  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true, status };
});

// DELETE PRODUCT
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('products').doc(id.toString()).delete();
  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true };
});
