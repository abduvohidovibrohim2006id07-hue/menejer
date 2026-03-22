import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';

export const dynamic = 'force-dynamic';

export const GET = withGateway(async () => {
  const snapshot = await db.collection('categories').get();
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    name: doc.data().name
  })).filter(c => c.name);
});

export const POST = withGateway(async (req) => {
  const { name } = await req.json();
  if (!name) throw { message: 'Nomi kiritilishi shart', status: 400 };

  const docRef = await db.collection('categories').add({ name });
  return { success: true, id: docRef.id };
});

export const PUT = withGateway(async (req) => {
  const { id, name } = await req.json();
  if (!id || !name) throw { message: 'ID va Nomi shart', status: 400 };

  await db.collection('categories').doc(id).update({ name });
  return { success: true };
});

export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID shart', status: 400 };

  await db.collection('categories').doc(id).delete();
  return { success: true };
});
