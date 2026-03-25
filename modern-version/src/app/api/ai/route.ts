import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withGateway } from '@/lib/api-gateway';

export const POST = withGateway(async (req) => {
  const { action, text, context } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) throw { message: 'Groq API key topilmadi', status: 500 };

  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('id', 'ai_config')
    .single();

  const config = (settings?.value as any)?.[action] || {};

  let model = config.model || 'openai/gpt-oss-120b';
  let messages: any[] = [];
  let responseFormat: any = undefined;
  let visualDescription = "";

    if (action === 'generate_from_image') {
      const allMedia = context?.images || [];
      const imageUrl = allMedia.find((url: string) => !url.toLowerCase().endsWith('.mp4'));

      if (!imageUrl) throw { message: 'AI tahlili uchun rasm topilmadi. Faqat rasmlar tahlil qilinadi.', status: 400 };
      
      // Step 1: Vision
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) throw { message: "Rasmni serverdan yuklab bo'lmadi.", status: 400 };
      
      const arrayBuffer = await imgResponse.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

      const visionPrompt = `Ushbu rasmdagi mahsulotni identifikatsiya qiling. 
        Bazadagi ma'lumot: Brend: ${context?.brand || "No'malum"}, Model: ${context?.model || "No'malum"}. 
        Rasmga qarab ushbu ma'lumotlarni tasdiqlang yoki aniqrog'ini ayting (rang, brend, model).`;

      const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      const visionData = await visionResponse.json();
      visualDescription = visionData.choices?.[0]?.message?.content || "";
      
      if (!visualDescription || visualDescription.length < 5) {
         throw { message: "Vizual AI rasmni taniy olmadi.", status: 400 };
      }

      // Step 2: Reasoning
      model = config.model || 'openai/gpt-oss-120b';
      messages = [
        { role: 'system', content: 'Siz mahsulotlar bo\'yicha professional marketing tahlilchisiz. JAVOB FAQAT JSON BO\'LSIN.' },
        { role: 'user', content: `Vizual tahlil natijasi: ${visualDescription}. 
          ILTIMOS, ushbu mahsulot haqida juda mukammal va professional sotuvchi tavsif yozing.
          QOIDALAR:
          1. Qisqa tavsif ("short") - MAKSIMAL 350 ta belgidan oshmasligi shart.
          2. To'liq tavsif ("full") - MINIMAL 1000, MAKSIMAL 5000 ta belgi bo'lishi shart.
          3. To'liq tavsifda mahsulot haqida mukammal fikr berib, mijozda kuchli qiziqish uyg'oting va hech qanday savol qoldirmang.
          JSON formatda qaytaring:
          { "uz": { "name": "...", "short": "...", "full": "..." }, "ru": { "name": "...", "short": "...", "full": "..." }, "brand": "...", "model": "...", "color": "...", "category": "..." }` 
        }
      ];
      responseFormat = { type: 'json_object' };
    } else {
      let prompt = config.prompt || '';
      if (!prompt) {
        switch (action) {
          case 'translate_uz_ru':
            model = 'llama-3.3-70b-versatile';
            prompt = `Matn: "${text}". Faqat ruscha tarjimasini qaytaring. Hech qanday sarlavha va tushuntirishsiz.`;
            break;
          case 'translate_ru_uz':
            model = 'llama-3.3-70b-versatile';
            prompt = `Matn: "${text}". Faqat o'zbekcha tarjimasini qaytaring. Hech qanday sarlavha va tushuntirishsiz.`;
            break;
          case 'generate_short':
            model = 'llama-3.3-70b-versatile';
            prompt = `Ushbu mahsulot uchun jozibali marketing qisqa tavsifini yozing. Ma'lumotlar: ${JSON.stringify(context || {})}. Qo'shimcha ma'lumot: ${text}. TIL: O'zbekcha. QOIDA: Maksimal 350 ta belgi. FAQAT matnni o'zini qaytaring.`;
            break;
          case 'generate_short_ru':
            model = 'llama-3.3-70b-versatile';
            prompt = `Напишите привлекательное маркетинговое краткое описание. Данные: ${JSON.stringify(context || {})}. Дополнительно: ${text}. ЯЗЫК: Русский. ПРАВИЛО: Максимум 350 символов. Верните ТОЛЬКО чистый текст.`;
            break;
          case 'generate_full':
            model = 'openai/gpt-oss-120b';
            prompt = `Ushbu mahsulot haqida professional marketing tavsifi yozing. Ma'lumotlar: ${JSON.stringify(context || {})}. Qo'shimcha ma'lumot: ${text}. TIL: O'zbekcha. Uzunlik: 2000-2500 belgi. FAQAT matnni qaytaring.`;
            break;
          case 'generate_full_ru':
            model = 'openai/gpt-oss-120b';
            prompt = `Напишите подробное профессиональное маркетинговое описание товара. Данные: ${JSON.stringify(context || {})}. Дополнительно: ${text}. ЯЗЫК: Русский. Длина: 2000-2500 символов. Верните ТОЛЬКО текст.`;
            break;
          case 'guess_packaging_dimensions':
            model = 'llama-3.3-70b-versatile';
            responseFormat = { type: 'json_object' };
            prompt = `Ushbu mahsulotning QADOG'I (packaging) taxminiy o'lchamlari va vaznini aniqlang. 
              Ma'lumotlar: ${JSON.stringify(context || {})}. 
              QOIDA: 
              1. O'lchamlar MM (millimetr) da bo'lsin. 
              2. Vazn GR (gramm) da bo'lsin. 
              3. Bu aynan mahsulotning o'zi emas, balki qadog'i (karobkasi) o'lchami bo'lishi kerak.
              JAVOB FAQAT JSON BO'LSIN:
              { "length_mm": 0, "width_mm": 0, "height_mm": 0, "weight_g": 0 }
              Faqat raqamlarni yozing.`;
            break;
          default:
            prompt = text;
        }
      } else {
        prompt = `${prompt}\n\nQOIDALAR: FAQAT natijani qaytaring. Hech qanday "GID", "Yo'nalish", sarlavha yoki tushuntirish yozmang. Faqat matn bo'lsin.\nMa'lumotlar: ${text || JSON.stringify(context || {})}`;
      }
      messages = [
        { role: 'system', content: 'Siz faqat so\'ralgan matnni qaytaradigan AI yordamchisiz. HECH QANDAY sarlavha, "Gid", "Natija:" kabi so\'zlar qo\'shmang. Faqat toza matn qaytaring.' },
        { role: 'user', content: prompt }
      ];
    }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: responseFormat,
    }),
  });

  const data = await groqResponse.json();
  if (data.error) throw { message: data.error.message, status: 400 };

  const resultText = data.choices?.[0]?.message?.content || "";

  if (responseFormat?.type === 'json_object' || action === 'generate_from_image' || action === 'generate_full') {
    try {
      const jsonStr = resultText.replace(/```json|```/g, '').trim();
      return { 
        result: JSON.parse(jsonStr),
        debug: { visualDescription, raw: resultText }
      };
    } catch (e) {
      return { 
        result: resultText,
        error: "JSON formatda xatolik",
        debug: { visualDescription, raw: resultText }
      };
    }
  }

  return { 
    result: resultText,
    debug: { visualDescription }
  };
});
