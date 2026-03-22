import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';

export const dynamic = 'force-dynamic';

// FETCH PRODUCTS
export const GET = withGateway(async () => {
  return await getProducts();
});

// CREATE/UPDATE PRODUCT
export const POST = withGateway(async (req) => {
  const data = await req.json();
  const { id, ...rest } = data;
  
  if (!id) throw { message: 'ID majburiy', status: 400 };

  // Dublikatni tekshirish (Brand, Model, Color)
  let status = rest.status || 'active';
  
  const brand = (rest.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const model = (rest.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const color = (rest.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  
  if (brand && model && color) {
    const productsSnapshot = await db.collection('products').get();
    const isDuplicate = productsSnapshot.docs.some((doc: any) => {
      if (doc.id === id.toString()) return false;
      const d = doc.data();
      const dBrand = (d.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      const dModel = (d.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      const dColor = (d.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');
      return dBrand === brand && dModel === model && dColor === color;
    });

    if (isDuplicate) {
      status = 'quarantine';
    }
  }

  await db.collection('products').doc(id.toString()).set({
    ...rest,
    status, // Yangilangan status
    updated_at: new Date().toISOString(),
  }, { merge: true });

  return { success: true, status };
});

// DELETE PRODUCT
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('products').doc(id.toString()).delete();
  return { success: true };
});
