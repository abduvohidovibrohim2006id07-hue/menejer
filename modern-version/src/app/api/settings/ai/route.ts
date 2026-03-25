import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_AI_CONFIG = {
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
    prompt: 'Matn asosida professional va sotuvchi (marketing) JSON tavsif yozing. \nQOIDALAR: \n1. Qisqa tavsif ("short") - MAKSIMAL 350 ta belgi. \n2. To\'liq tavsif ("full") - MINIMAL 1000, MAKSIMAL 5000 ta belgi. \n3. Tavsif shunday bo\'lsinki, mijozda hech qanday savol qolmasin va sotib olishga kuchli qiziqish uyg\'otsin. \nFormat: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}'
  },
  'generate_from_image': {
    model: 'openai/gpt-oss-120b',
    prompt: 'Vizual tahlil natijasiga ko\'ra professional va mukammal marketing tavsifi yozing. \nQOIDALAR: \n1. Qisqa tavsif ("short") - MAKSIMAL 350 ta belgi. \n2. To\'liq tavsif ("full") - MINIMAL 1000, MAKSIMAL 5000 ta belgi. \n3. To\'liq tavsifda mahsulotning barcha xususiyatlarini yoritib bering, mijozda qiziqish uyg\'otsin. \nJAVOB FAQAT TOZA JSON BO\'LSIN.'
  }
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('id', 'ai_config')
      .single();
    
    if (error || !data) {
      return NextResponse.json(DEFAULT_AI_CONFIG);
    }
    return NextResponse.json(data.value);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const settings = await req.json();
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'ai_config', value: settings });
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
