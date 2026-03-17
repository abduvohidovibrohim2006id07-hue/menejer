import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { id, ...rest } = data;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.collection('products').doc(id.toString()).set({
      ...rest,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.collection('products').doc(id.toString()).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
