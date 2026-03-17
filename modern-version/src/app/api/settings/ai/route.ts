import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const doc = await db.collection('settings').doc('ai_config').get();
    if (!doc.exists) {
      // Return the current active defaults used in the API
      return NextResponse.json({
        'translate_uz_ru': {
          model: 'llama-3.3-70b-versatile',
          prompt: 'Nomi: "{{text}}". Faqat ruscha tarjimasini qaytaring.'
        },
        'translate_ru_uz': {
          model: 'llama-3.3-70b-versatile',
          prompt: 'Nomi: "{{text}}". Faqat o\'zbekcha tarjimasini qaytaring.'
        },
        'generate_full': {
          model: 'openai/gpt-oss-120b',
          prompt: 'Matn asosida professional JSON tavsif yozing. Format: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}'
        },
        'generate_from_image': {
          model: 'openai/gpt-oss-120b',
          prompt: 'Vizual tahlil natijasiga ko\'ra professional tavsif yozing. JAVOB FAQAT JSON BO\'LSIN.'
        }
      });
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
