import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); 

    // USE OPTIONAL USER-PROVIDED COOKIE FOR YANDEX/UZUM IF DEFINED
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
              'Cookie': customCookie // Use cookie if provided
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

    // YANDEX & GENERIC STRATEGY (WITH COOKIE SUPPORT)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
        'Cookie': customCookie // THIS IS THE KEY TO BYPASS CAPTCHA
      }
    });

    if (!response.ok) return NextResponse.json({ error: `Blocked (Status: ${response.status})` }, { status: 500 });

    const html = await response.text();
    clearTimeout(timeoutId);

    // Yandex Market: Advanced JSON State Extraction
    if (url.includes('yandex')) {
        const stateMatch = html.match(/__PRELOADED_STATE__\s*=\s*({.+?});/);
        if (stateMatch) {
            try {
                const state = JSON.parse(stateMatch[1]);
                const offers = state.entities?.offer || {};
                const firstOfferId = Object.keys(offers)[0];
                const offer = offers[firstOfferId];
                if (offer) {
                    return NextResponse.json({
                        title: offer.titles?.raw || offer.title,
                        image: offer.pictures?.[0]?.url,
                        price: offer.prices?.value,
                        fullPrice: offer.prices?.discount?.oldPrice || offer.prices?.full,
                        rating: offer.rating?.value,
                        reviewsAmount: offer.rating?.count,
                        shop: 'Yandex Market',
                        source: 'preloaded_state'
                    });
                }
            } catch (e) { console.error("Yandex JSON error:", e); }
        }
    }

    // Fallback Scraper Logic
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
