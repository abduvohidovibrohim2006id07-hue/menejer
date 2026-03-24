import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    // Vercel Hobby has 10s limit. We use 8.5s to be safe.
    const timeoutId = setTimeout(() => controller.abort(), 8500); 

    // STRATEGY 1: Uzum Market Internal API
    if (url.includes('uzum.uz')) {
      const idMatch = url.match(/-(\d+)(?:\?|$)/) || url.match(/\/product\/(\d+)/) || url.match(/product\/(\d+)/);
      if (idMatch) {
         const productId = idMatch[1];
         // Try different API endpoints
         const apiUrls = [
           `https://api.uzum.uz/api/v2/product/${productId}`,
           `https://uzum.uz/api/v2/product/${productId}`
         ];

         for (const apiUrl of apiUrls) {
           try {
              const apiRes = await fetch(apiUrl, {
                signal: controller.signal,
                headers: {
                  'x-authorization': 'Basic dXp1bS1tYXJrZXQ6Ym96YXItYXBpLXNlY3JldA==',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                  'Accept': 'application/json',
                  'Referer': 'https://uzum.uz/'
                }
              });

              if (apiRes.ok) {
                const data = await apiRes.json();
                const p = data.payload?.data || data.payload;
                if (p) {
                   const firstSku = p.skuList?.[0] || {};
                   const firstPhoto = p.photos?.[0]?.photo;
                   const imageUrl = firstPhoto?.["720"]?.high || firstPhoto?.["800"]?.high || firstPhoto?.["540"]?.high || firstPhoto?.["240"]?.high;
                   
                   clearTimeout(timeoutId);
                   return NextResponse.json({
                     title: p.title,
                     image: imageUrl,
                     price: firstSku.purchasePrice || firstSku.fullPrice || p.sellPrice || p.fullPrice,
                     shop: 'Uzum Market',
                     source: 'api'
                   });
                }
              }
           } catch (e) {
             console.log(`API ${apiUrl} failed, trying next...`);
           }
         }
      }
    }

    // STRATEGY 2: Generic HTML Scraper (Mobile headers often have higher limits)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
        return NextResponse.json({ 
          error: `Blocked by target site (Status: ${response.status})`,
          status: response.status 
        }, { status: 500 });
    }

    const html = await response.text();
    clearTimeout(timeoutId);

    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) 
                 || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const image = getMeta('og:image');
    let price: number | null = null;
    
    // Check specific meta tags
    const metaPrice = getMeta('product:price:amount') || getMeta('product:price:amount:value');
    if (metaPrice) price = Number(metaPrice);
    
    if (!price) {
        const scriptMatch = html.match(/"fullPrice":(\d+)/i) || html.match(/"purchasePrice":(\d+)/i) || html.match(/"price":(\d+)/i);
        if (scriptMatch) price = Number(scriptMatch[1]);
    }

    return NextResponse.json({
      title: title?.trim(),
      image,
      price: price && price > 0 ? price : null,
      shop: url.includes('uzum') ? 'Uzum Market' : url.includes('olx') ? 'OLX' : '',
      source: 'html'
    });

  } catch (error: any) {
    console.error("Scraper Critical Error:", error);
    return NextResponse.json({ 
        error: error.name === 'AbortError' ? 'Timeout: Site did not respond within 8s' : error.message 
    }, { status: 500 });
  }
}
