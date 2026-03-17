import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, text, context } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API key not found' }, { status: 500 });
    }

    let prompt = '';
    let model = 'llama-3.3-70b-versatile';

    switch (action) {
      case 'translate_uz_ru':
        prompt = `Translate the following product name from Uzbek to Russian. Return ONLY the translated text. Text: ${text}`;
        break;
      case 'translate_ru_uz':
        prompt = `Translate the following product name from Russian to Uzbek. Return ONLY the translated text. Text: ${text}`;
        break;
      case 'translate_desc_uz_ru':
        prompt = `Translate the following product description from Uzbek to Russian. Return ONLY the translated text. Text: ${text}`;
        break;
      case 'generate_full':
        prompt = `Generate a professional product description in Uzbek and Russian based on name: ${context.name}, brand: ${context.brand}, model: ${context.model}. Output format JSON: {"uz": {"name": "...", "short": "...", "full": "..."}, "ru": {"name": "...", "short": "...", "full": "..."}}`;
        break;
      default:
        prompt = text;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: action === 'generate_full' ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json();
    const result = data.choices[0].message.content.strip?.() || data.choices[0].message.content;

    return NextResponse.json({ result: action === 'generate_full' ? JSON.parse(result) : result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
