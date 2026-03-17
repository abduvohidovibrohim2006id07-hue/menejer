import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const doc = await db.collection('settings').doc('ai_config').get();
    if (!doc.exists) {
      // Default settings if none exist
      return NextResponse.json({});
    }
    return NextResponse.json(doc.data());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const settings = await req.json();
    await db.collection('settings').doc('ai_config').set(settings, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
