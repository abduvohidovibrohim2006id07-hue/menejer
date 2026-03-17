import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API key not found' }, { status: 500 });
    }

    let model = 'openai/gpt-oss-120b';
    let messages: any[] = [];
    let responseFormat: any = undefined;

    if (action === 'generate_from_image') {
      const images = context?.images || [];
      const imageUrl = images[0]; 

      if (!imageUrl) {
        return NextResponse.json({ error: 'No image found for analysis' }, { status: 400 });
      }

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
                { type: 'text', text: "O'zbek tilida ushbu rasmdagi mahsulot haqida batafsil ma'lumot bering: nomi, brendi, modeli, rangi va asosiy xususiyatlari." },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      const visionData = await visionResponse.json();
      const visualDescription = visionData.choices?.[0]?.message?.content || "Tasvirni aniqlab bo'lmadi";

      // Step 2: Full JSON Generation using Flagship 120B model on Groq
      model = 'openai/gpt-oss-120b';
      messages = [
        {
          role: 'system',
          content: 'Siz mahsulotlar bo\'yicha mutaxassissiz. Berilgan ma\'lumotlar asosida mahsulot uchun professional va sotuvchi tavsiflar tayyorlang. JAVOB FAQAT JSON FORMATIDA BO\'LSIN.'
        },
        {
          role: 'user',
          content: `Visual tahlil natijasi: ${visualDescription}.

Quyidagi qolipda JSON qaytaring:
{
  "uz": { "name": "...", "short": "...", "full": "..." },
  "ru": { "name": "...", "short": "...", "full": "..." },
  "brand": "...",
  "model": "...",
  "color": "...",
  "category": "..."
}`
        }
      ];
      responseFormat = { type: 'json_object' };
    } else {
      let prompt = '';
      switch (action) {
        case 'translate_uz_ru':
          model = 'llama-3.3-70b-versatile';
          prompt = `Translate the following product name from Uzbek to Russian. Return ONLY the translated text. Text: ${text}`;
          break;
        case 'translate_ru_uz':
          model = 'llama-3.3-70b-versatile';
          prompt = `Translate the following product name from Russian to Uzbek. Return ONLY the translated text. Text: ${text}`;
          break;
        case 'translate_desc_uz_ru':
          model = 'llama-3.3-70b-versatile';
          prompt = `Translate the following product description from Uzbek to Russian. Return ONLY the translated text. Text: ${text}`;
          break;
        case 'generate_full':
          model = 'openai/gpt-oss-120b';
          prompt = `Generate a professional product description in Uzbek and Russian based on name: ${context?.name}, brand: ${context?.brand}, model: ${context?.model}. Output format JSON: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}`;
          responseFormat = { type: 'json_object' };
          break;
        default:
          model = 'llama-3.3-70b-versatile';
          prompt = text;
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
    const resultText = data.choices[0].message.content;

    try {
      const isJson = action === 'generate_full' || action === 'generate_from_image';
      return NextResponse.json({ result: isJson ? JSON.parse(resultText) : resultText });
    } catch (e) {
       return NextResponse.json({ result: resultText });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
