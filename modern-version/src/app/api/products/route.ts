import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';

// FETCH PRODUCTS
export const GET = withGateway(async () => {
  return await getProducts();
});

// CREATE/UPDATE PRODUCT
export const POST = withGateway(async (req) => {
  const data = await req.json();
  const { id, ...rest } = data;
  
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('products').doc(id.toString()).set({
    ...rest,
    updated_at: new Date().toISOString(),
  }, { merge: true });

  return { success: true };
});

// DELETE PRODUCT
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('products').doc(id.toString()).delete();
  return { success: true };
});
