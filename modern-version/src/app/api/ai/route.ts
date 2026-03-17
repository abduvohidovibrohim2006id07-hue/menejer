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
        return NextResponse.json({ error: 'Rasm topilmadi. Avval rasm yuklang.' }, { status: 400 });
      }

      let visualDescription = "";
      
      try {
        // Step 1: Visual Analysis using Llama-3.2-Vision
        const visionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.2-11b-vision-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: "Ushbu mahsulotni tahlil qiling. Brendi, modeli, rangi va barcha texnik xususiyatlarini aniqlang." },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]
              }
            ],
            temperature: 0.1,
          }),
        });

        const visionData = await visionResponse.json();
        visualDescription = visionData.choices?.[0]?.message?.content || "";
        
        if (!visualDescription && visionData.error) {
          console.error("Vision Error:", visionData.error);
          visualDescription = "Tasvirni tahlil qilib bo'lmadi (URL xatosi yoki limit).";
        }
      } catch (vError) {
        visualDescription = "Vision tizimi bilan bog'lanib bo'lmadi.";
      }

      // Step 2: Reasoning using flagship model
      model = config.model || 'openai/gpt-oss-120b';
      const systemPrompt = "Siz tajribali marketing mutaxassisi va mahsulotlar bo'yicha tahlilchisiz. JAVOB FAQAT JSON FORMATIDA BO'LSIN.";
      const userPrompt = config.prompt || `Quyidagi ma'lumotlar asosida mahsulot uchun professional va sotuvchi tavsiflar tayyorlang.\n\nVizual tahlil natijasi: ${visualDescription}\n\nMavjud ma'lumotlar: ${JSON.stringify(context || {})}\n\nMUHIM: JAVOB FAQAT SHU FORMATDA BO'LSIN (JSON):\n{\n  "uz": { "name": "Mahsulot nomi", "short": "Qisqa tavsif (1 qator)", "full": "Batafsil tavsif" },\n  "ru": { "name": "Название товара", "short": "Краткое описание", "full": "Полное описание" },\n  "brand": "Brand",\n  "model": "Model",\n  "color": "Color",\n  "category": "Category"\n}`;

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      responseFormat = { type: 'json_object' };
    } else {
      let prompt = config.prompt || '';
      if (!prompt) {
        switch (action) {
          case 'translate_uz_ru':
            model = 'llama-3.3-70b-versatile';
            prompt = `Nomi: "${text}". Faqat ruscha tarjimasini qaytaring. Ortiqcha gap kerak emas.`;
            break;
          case 'translate_ru_uz':
            model = 'llama-3.3-70b-versatile';
            prompt = `Nomi: "${text}". Faqat o'zbekcha tarjimasini qaytaring. Ortiqcha gap kerak emas.`;
            break;
          case 'generate_full':
            model = 'openai/gpt-oss-120b';
            prompt = `Quyidagilar bo'yicha JSON formatda tavsif yozing: Nomi: ${context?.name}, Brend: ${context?.brand}, Model: ${context?.model}.\nFormat: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}`;
            responseFormat = { type: 'json_object' };
            break;
          default:
            prompt = text;
        }
      } else {
        prompt = `${prompt}\n\nMavjud ma'lumot: ${text || JSON.stringify(context || {})}`;
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
        temperature: 0.1,
        response_format: responseFormat,
      }),
    });

    const data = await response.json();
    let resultText = data.choices?.[0]?.message?.content || "";

    // Robust JSON parsing (handles markdown blocks)
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
