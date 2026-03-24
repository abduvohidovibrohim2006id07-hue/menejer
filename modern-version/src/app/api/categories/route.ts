import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'categories';

export const GET = withGateway(async () => {
  // Cache dan tekshir
  const cached = getCache(CACHE_KEY, TTL.CATEGORIES);
  if (cached) return cached;

  // Firestore dan o'qi
  const snapshot = await db.collection('categories').get();
  const data = snapshot.docs
    .map((doc: any) => ({ id: doc.id, name: doc.data().name }))
    .filter((c: any) => c.name);

  setCache(CACHE_KEY, data);
  return data;
});

export const POST = withGateway(async (req) => {
  const { name } = await req.json();
  if (!name) throw { message: 'Nomi kiritilishi shart', status: 400 };

  const docRef = await db.collection('categories').add({ name });
  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true, id: docRef.id };
});

export const PUT = withGateway(async (req) => {
  const { id, name } = await req.json();
  if (!id || !name) throw { message: 'ID va Nomi shart', status: 400 };

  await db.collection('categories').doc(id).update({ name });
  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true };
});

export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID shart', status: 400 };

  await db.collection('categories').doc(id).delete();
  invalidateCache(CACHE_KEY); // Cache ni tozala
  return { success: true };
});
