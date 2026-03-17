import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API key not found' }, { status: 500 });
    }

    const settingsDoc = await db.collection('settings').doc('ai_config').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const config = settings?.[action] || {};

    let model = config.model || 'openai/gpt-oss-120b';
    let messages: any[] = [];
    let responseFormat: any = undefined;

    if (action === 'generate_from_image') {
      const images = context?.images || [];
      const imageUrl = images[0]; 

      if (!imageUrl) {
        return NextResponse.json({ error: 'Rasm topilmadi.' }, { status: 400 });
      }

      let visualDescription = "";
      
      try {
        console.log("Fetching image for vision analysis:", imageUrl);
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error("Rasmni serverdan yuklab bo'lmadi.");
        
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

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
                  { type: 'text', text: "Ushbu rasmdagi mahsulotni identifikatsiya qiling (nomi, brendi, rangi). Faqat ko'rgan narsangizni yozing." },
                  { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
                ]
              }
            ],
            temperature: 0.1,
          }),
        });

        const visionData = await visionResponse.json();
        visualDescription = visionData.choices?.[0]?.message?.content || "";
        
        // AGAR VISION JAVOBI YO'Q BO'LSA - TO'XTATAMIZ (User talabi)
        if (!visualDescription || visualDescription.length < 5) {
          return NextResponse.json({ error: "Vizual AI rasmni taniy olmadi. Hech narsa yozilmadi." }, { status: 400 });
        }
        
        console.log("Vision analysis successful.");
      } catch (vError: any) {
        console.error("Vision Analysis Failed:", vError);
        return NextResponse.json({ error: `Vizual tahlil xatosi: ${vError.message}. Hech narsa yozilmadi.` }, { status: 400 });
      }

      // Step 2: Reasoning using flagship model - ONLY if Vision succeeded
      model = config.model || 'openai/gpt-oss-120b';
      const systemPrompt = `Siz mahsulotlar bo'yicha tahlilchisiz. JAVOB FAQAT TOZA JSON BO'LSIN.`;
      const userPrompt = config.prompt || `Vizual tahlil natijasi: ${visualDescription}. Ushbu ma'lumotlar asosida professional marketing tavsiflarini JSON formatda tayyorlang.`;

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + `\nFormat: { "uz": { "name": "...", "short": "...", "full": "..." }, "ru": { "name": "...", "short": "...", "full": "..." }, "brand": "...", "model": "...", "color": "...", "category": "..." }` }
      ];
      responseFormat = { type: 'json_object' };
    }
 else {
      let prompt = config.prompt || '';
      if (!prompt) {
        switch (action) {
          case 'translate_uz_ru':
            model = 'llama-3.3-70b-versatile';
            prompt = `Nomi: "${text}". Faqat ruscha tarjimasini qaytaring.`;
            break;
          case 'translate_ru_uz':
            model = 'llama-3.3-70b-versatile';
            prompt = `Nomi: "${text}". Faqat o'zbekcha tarjimasini qaytaring.`;
            break;
          case 'generate_full':
            model = 'openai/gpt-oss-120b';
            prompt = `JSON formatda tavsif yozing: ${JSON.stringify(context || {})}. Hech qachon "N/A" ishlatmang.`;
            responseFormat = { type: 'json_object' };
            break;
          default:
            prompt = text;
        }
      } else {
        prompt = `${prompt}\n\nData: ${text || JSON.stringify(context || {})}`;
      }
      messages = [{ role: 'user', content: prompt }];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7, // Kreativlikni oshirish uchun
        response_format: responseFormat,
      }),
    });

    const data = await response.json();
    let resultText = data.choices?.[0]?.message?.content || "";

    try {
      const isJson = action === 'generate_full' || action === 'generate_from_image' || responseFormat?.type === 'json_object';
      if (isJson) {
        const jsonStr = resultText.replace(/```json|```/g, '').trim();
        return NextResponse.json({ result: JSON.parse(jsonStr) });
      }
      return NextResponse.json({ result: resultText });
    } catch (e) {
       return NextResponse.json({ result: resultText });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
