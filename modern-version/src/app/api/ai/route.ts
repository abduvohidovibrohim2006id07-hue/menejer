import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';

export const POST = withGateway(async (req) => {
  const { action, text, context } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) throw { message: 'Groq API key topilmadi', status: 500 };

  const settingsDoc = await db.collection('settings').doc('ai_config').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  const config = settings?.[action] || {};

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
            prompt = `Matn: "${text}". Faqat ruscha tarjimasini qaytaring.`;
            break;
          case 'translate_ru_uz':
            model = 'llama-3.3-70b-versatile';
            prompt = `Matn: "${text}". Faqat o'zbekcha tarjimasini qaytaring.`;
            break;
          case 'generate_full':
            model = 'openai/gpt-oss-120b';
            prompt = `Professional va sotuvchi (marketing) JSON tavsif yozing: ${JSON.stringify(context || {})}.
              QOIDALAR:
              1. Qisqa tavsif ("short") - MAKSIMAL 350 ta belgidan oshmasligi shart.
              2. To'liq tavsif ("full") - MINIMAL 1000, MAKSIMAL 5000 ta belgi bo'lishi shart.
              3. Tavsif mukammal bo'lsin, mijozda hech qanday savol qolmasin.
              Format JSON: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}`;
            responseFormat = { type: 'json_object' };
            break;
          default:
            prompt = text;
        }
      } else {
        prompt = `${prompt}\n\nGID (Yo'nalish): \n1. "short" - MAKS 350 ta belgi. \n2. "full" - MIN 1000 ta, MAKS 5000 ta belgi. \nData: ${text || JSON.stringify(context || {})}`;
      }
      messages = [{ role: 'user', content: prompt }];
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
