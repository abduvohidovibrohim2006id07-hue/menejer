import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'markets';

// FETCH MARKETS
export const GET = withGateway(async () => {
  // Cache dan tekshir
  const cached = getCache(CACHE_KEY, TTL.MARKETS);
  if (cached) return cached;

  // Firestore dan o'qi
  const snapshot = await db.collection('markets').get();
  const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  setCache(CACHE_KEY, data);
  return data;
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

  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true };
});

// DELETE MARKET
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  await db.collection('markets').doc(id.toString()).delete();
  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true };
});
