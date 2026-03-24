import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://uzum.uz/'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
        return NextResponse.json({ 
            error: `Failed to fetch page: ${response.status} ${response.statusText}`,
            status: response.status
        }, { status: 500 });
    }

    const html = await response.text();

    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) 
                 || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const image = getMeta('og:image');
    
    // Attempt to extract Uzum specific price from state or JSON
    let price: number | null = null;
    
    // 1. Try meta tags
    const metaPrice = getMeta('product:price:amount') || getMeta('product:price:amount:value');
    if (metaPrice) price = Number(metaPrice);
    
    // 2. Try to find price in a script tag (common in Uzum)
    if (!price) {
        const scriptMatch = html.match(/"fullPrice":(\d+)/i) || html.match(/"price":(\d+)/i);
        if (scriptMatch) price = Number(scriptMatch[1]);
    }

    // 3. Fallback regex for text matches like "150 000 so'm"
    if (!price) {
      const priceTextMatch = html.match(/(\d[\d\s]*)\s*so['‘]m/i);
      if (priceTextMatch) price = Number(priceTextMatch[1].replace(/\s/g, ''));
    }

    return NextResponse.json({
      title: title?.trim(),
      image: image,
      price: price && price > 0 ? price : null,
      shop: url.includes('uzum') ? 'Uzum Market' : url.includes('olx') ? 'OLX' : ''
    });
  } catch (error: any) {
    console.error("Scraper Error:", error);
    return NextResponse.json({ 
        error: error.name === 'AbortError' ? 'Timeout: Page took too long to respond' : error.message 
    }, { status: 500 });
  }
}
