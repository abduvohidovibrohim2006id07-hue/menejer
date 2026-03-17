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
    let visualDescription = "";

    if (action === 'generate_from_image') {
      const images = context?.images || [];
      const imageUrl = images[0]; 

      if (!imageUrl) {
        return NextResponse.json({ error: 'Rasm topilmadi.' }, { status: 400 });
      }
      
      try {
        console.log("[AI LOG] Step 1: Vision analysis starting for:", imageUrl);
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error("Rasmni serverdan yuklab bo'lmadi.");
        
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
        console.log("[AI LOG] Vision Result:", visualDescription);
        
        if (!visualDescription || visualDescription.length < 5) {
          console.error("[AI LOG] Vision failed or returned empty.");
          return NextResponse.json({ error: "Vizual AI rasmni taniy olmadi." }, { status: 400 });
        }
      } catch (vError: any) {
        console.error("[AI LOG] Vision Error:", vError);
        return NextResponse.json({ error: `Vizual tahlil xatosi: ${vError.message}` }, { status: 400 });
      }

      // Step 2: Reasoning
      model = config.model || 'openai/gpt-oss-120b';
      console.log("[AI LOG] Step 2: Generating description using:", model);
      
      messages = [
        { role: 'system', content: 'Siz mahsulotlar bo\'yicha tahlilchisiz. JAVOB FAQAT JSON BO\'LSIN.' },
        { role: 'user', content: `Vizual tahlil: ${visualDescription}. 
          ILTIMOS, ushbu mahsulot haqida professional tavsif yozing.
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
            prompt = `Nomi: "${text}". Faqat ruscha tarjimasini qaytaring.`;
            break;
          case 'translate_ru_uz':
            model = 'llama-3.3-70b-versatile';
            prompt = `Nomi: "${text}". Faqat o'zbekcha tarjimasini qaytaring.`;
            break;
          case 'generate_full':
            model = 'openai/gpt-oss-120b';
            prompt = `Professional JSON tavsif yozing: ${JSON.stringify(context || {})}.\nFormat JSON: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}`;
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

    console.log("[AI LOG] Requesting Groq with model:", model);
    const body: any = {
      model,
      messages,
      temperature: 0.2,
    };
    if (responseFormat) {
      body.response_format = responseFormat;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("[AI LOG] Groq Raw Response Status:", response.status);
    
    if (data.error) {
      console.error("[AI LOG] Groq API Error:", data.error);
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    let resultText = data.choices?.[0]?.message?.content || "";
    console.log("[AI LOG] Groq Result Preview:", resultText.substring(0, 100) + "...");

    try {
      if (responseFormat?.type === 'json_object' || action === 'generate_from_image' || action === 'generate_full') {
        const jsonStr = resultText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return NextResponse.json({ 
          result: parsed,
          debug: { visualDescription, raw: resultText }
        });
      }
      return NextResponse.json({ 
        result: resultText,
        debug: { visualDescription }
      });
    } catch (e) {
       console.error("[AI LOG] JSON Parse Error:", e);
       return NextResponse.json({ 
         result: resultText, 
         error: "JSON formatda xatolik",
         debug: { visualDescription, raw: resultText }
       });
    }
  } catch (error: any) {
    console.error("[AI LOG] Global Router Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
