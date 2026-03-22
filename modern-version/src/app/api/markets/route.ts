import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';

export const dynamic = 'force-dynamic';

// FETCH MARKETS
export const GET = withGateway(async () => {
  const snapshot = await db.collection('markets').get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
});

// CREATE/UPDATE MARKET
export const POST = withGateway(async (req) => {
  const data = await req.json();
  const { id, ...rest } = data;
  
  if (!id) throw { message: 'ID (slug) majburiy', status: 400 };

  await db.collection('markets').doc(id.toString()).set({
    ...rest,
    updated_at: new Date().toISOString(),
  }, { merge: true });

  return { success: true };
});

// DELETE MARKET
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('markets').doc(id.toString()).delete();
  return { success: true };
});
