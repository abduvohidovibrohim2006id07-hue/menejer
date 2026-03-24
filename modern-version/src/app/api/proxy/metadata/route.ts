import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); 

    const customCookie = process.env.YANDEX_COOKIE || '';

    // UZUM MARKET STRATEGY
    if (url.includes('uzum.uz')) {
      const idMatch = url.match(/-(\d+)(?:\?|$)/) || url.match(/\/product\/(\d+)/);
      if (idMatch) {
         const productId = idMatch[1];
         const apiRes = await fetch(`https://api.uzum.uz/api/v2/product/${productId}`, {
            signal: controller.signal,
            headers: {
              'x-authorization': 'Basic dXp1bS1tYXJrZXQ6Ym96YXItYXBpLXNlY3JldA==',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://uzum.uz/',
              'Cookie': customCookie
            }
         });
         if (apiRes.ok) {
            const data = await apiRes.json();
            const p = data.payload?.data || data.payload;
            if (p) {
               const firstSku = p.skuList?.[0] || {};
               const firstPhoto = p.photos?.[0]?.photo;
               const imageUrl = firstPhoto?.["720"]?.high || firstPhoto?.["800"]?.high || firstPhoto?.["540"]?.high;
               const finalImageUrl = imageUrl?.includes('original.jpg') ? imageUrl : 
                                    (p.photos?.[0]?.photoKey ? `https://images.uzum.uz/${p.photos[0].photoKey}/original.jpg` : imageUrl);
               clearTimeout(timeoutId);
               return NextResponse.json({
                 title: p.title, image: finalImageUrl,
                 price: firstSku.purchasePrice || firstSku.fullPrice,
                 fullPrice: firstSku.fullPrice, rating: p.rating,
                 reviewsAmount: p.reviewsAmount, ordersAmount: p.ordersAmount,
                 deliveryDate: firstSku.stock?.deliveryTitle?.match(/\d+-\w+/)?.[0] || firstSku.stock?.deliveryTitle,
                 seller: { title: p.seller?.title, rating: p.seller?.rating },
                 shop: 'Uzum Market'
               });
            }
         }
      }
    }

    // YANDEX & GENERIC STRATEGY
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
        'Cookie': customCookie
      }
    });

    if (!response.ok) return NextResponse.json({ error: `Blocked (Status: ${response.status})` }, { status: 500 });

    const html = await response.text();
    clearTimeout(timeoutId);

    // Advanced Extraction based on HAR analysis
    if (url.includes('yandex')) {
        // Look for __PRELOADED_STATE__ or similar JSON blocks
        const stateMatch = html.match(/__PRELOADED_STATE__\s*=\s*({.+?});/) || 
                           html.match(/window\.init\s*=\s*({.+?});/) ||
                           html.match(/["']productServiceSnippets["']:\s*({.+?})\s*,\s*["']meta["']/);
        
        if (stateMatch) {
            try {
                const rawContent = stateMatch[1];
                const state = JSON.parse(rawContent);
                
                // Strategy: Find any object that looks like an offer or product snippet
                const offers = state.entities?.offer || state.productServiceSnippets || {};
                const firstId = Object.keys(offers)[0];
                const item = offers[firstId]?.productSnippet?.productPayload || offers[firstId];

                if (item) {
                    return NextResponse.json({
                        title: item.titles?.raw || item.title || item.name,
                        image: item.pictures?.[0]?.url || item.image,
                        price: item.prices?.value || item.price,
                        fullPrice: item.prices?.discount?.oldPrice || item.prices?.full || item.fullPrice,
                        rating: item.rating?.value || item.rating,
                        reviewsAmount: item.rating?.count || item.reviewsAmount,
                        shop: 'Yandex Market',
                        source: 'extracted_json'
                    });
                }
            } catch (e) {
                console.error("Yandex extraction error:", e);
            }
        }
    }

    // Generic metadata fallback
    const getMeta = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) 
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
        return m ? m[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const image = getMeta('og:image');
    let price = null;
    const pMatch = html.match(/"price":(\d+)/) || html.match(/"currentPrice":(\d+)/);
    if (pMatch) price = Number(pMatch[1]);

    return NextResponse.json({
      title: title?.trim(), image, price,
      shop: url.includes('uzum') ? 'Uzum Market' : url.includes('yandex') ? 'Yandex Market' : 'Raqobatchi'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.name === 'AbortError' ? 'Timeout' : error.message }, { status: 500 });
  }
}
