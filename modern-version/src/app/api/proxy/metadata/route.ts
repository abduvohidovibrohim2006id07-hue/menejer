import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch page');
    const html = await response.text();

    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^">]+)"`, 'i')) 
                 || html.match(new RegExp(`<meta[^>]+content="([^">]+)"[^>]+(?:property|name)="${prop}"`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const image = getMeta('og:image');
    
    // Specifically target Uzum and common prices (e.g. 150000)
    let price = getMeta('product:price:amount') || getMeta('product:price:amount:value');
    
    if (!price) {
      // Look for common price patterns in text (e.g. "150 000 so'm")
      const priceInText = html.match(/(\d[\d\s]*)\s*so['‘]m/i);
      if (priceInText) price = priceInText[1].replace(/\s/g, '');
    }

    return NextResponse.json({
      title: title?.trim(),
      image,
      price: price ? Number(price) : null,
      shop: url.includes('uzum') ? 'Uzum Market' : url.includes('olx') ? 'OLX' : ''
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
