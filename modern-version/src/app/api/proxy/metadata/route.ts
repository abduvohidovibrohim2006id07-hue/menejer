import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second total timeout

    // STRATEGY 1: Specifically for Uzum Market - Use their internal API if we can extract ID
    if (url.includes('uzum.uz')) {
      const idMatch = url.match(/-(\d+)(?:\?|$)/) || url.match(/\/product\/(\d+)/);
      if (idMatch) {
         const productId = idMatch[1];
         const apiUrl = `https://api.uzum.uz/api/v2/product/${productId}`;
         
         try {
            const apiRes = await fetch(apiUrl, {
              signal: controller.signal,
              headers: {
                'x-authorization': 'Basic dXp1bS1tYXJrZXQ6Ym96YXItYXBpLXNlY3JldA==', // Common Uzum public auth
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
              }
            });

            if (apiRes.ok) {
              const data = await apiRes.json();
              const payload = data.payload?.data || data.payload;
              if (payload) {
                clearTimeout(timeoutId);
                return NextResponse.json({
                  title: payload.title,
                  image: payload.photos?.[0]?.url?.high || payload.photos?.[0]?.url,
                  price: payload.sellPrice || payload.fullPrice,
                  shop: 'Uzum Market'
                });
              }
            }
         } catch (e) {
           console.error("Uzum API failed, falling back to scraper", e);
         }
      }
    }

    // STRATEGY 2: Generic Scraper (HTML)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Cloudflare/Anti-bot blocked the request (Status: ${response.status})`);
    }

    const html = await response.text();

    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) 
                 || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const image = getMeta('og:image');
    let price: number | null = null;
    
    const metaPrice = getMeta('product:price:amount') || getMeta('product:price:amount:value');
    if (metaPrice) price = Number(metaPrice);
    
    if (!price) {
        const scriptMatch = html.match(/"fullPrice":(\d+)/i) || html.match(/"price":(\d+)/i);
        if (scriptMatch) price = Number(scriptMatch[1]);
    }

    return NextResponse.json({
      title: title?.trim(),
      image,
      price: price && price > 0 ? price : null,
      shop: url.includes('uzum') ? 'Uzum Market' : url.includes('olx') ? 'OLX' : ''
    });
  } catch (error: any) {
    return NextResponse.json({ 
        error: error.name === 'AbortError' ? 'Timeout: Uzum took too long to respond' : error.message 
    }, { status: 500 });
  }
}
