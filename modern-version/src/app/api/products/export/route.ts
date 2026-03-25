import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { withGateway } from '@/lib/api-gateway';
import { getProducts } from '@/lib/data-service';

export const GET = withGateway(async (req) => {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  
  let allProducts = await getProducts();
  
  if (idsParam) {
    const idList = idsParam.split(',').filter(id => id.trim() !== '');
    if (idList.length > 0) {
      allProducts = allProducts.filter((p: any) => idList.includes(p.id));
    }
  }

  const products = allProducts.map((data: any) => {
    const allMedia = (data.local_images || []) as string[];
    
    // Ajratish: Rasmlar va Videolar
    const isVideo = (url: string) => {
      const u = url.toLowerCase();
      return u.includes('.mp4') || u.includes('.mov');
    };
    const images = allMedia.filter((url: string) => !isVideo(url)).join(';');
    const videos = allMedia.filter((url: string) => isVideo(url)).join(';');

    return {
      'ID': data.id,
      'Nomi': data.name || '',
      'Nomi RU': data.name_ru || '',
      'Model': data.model || '',
      'Brend': data.brand || '',
      'Kategoriya': data.category || '',
      'Rang': data.color || '',
      'Narx': data.price || '0',
      'Status': data.status || 'active',
      'Sotuv bozorlari': (data.marketplaces || []).join(', '),
      'Rasm havolalari': images,
      'Video havolalari': videos,
      'Qisqa Tavsif': data.description_short || '',
      'To\'liq Tavsif': data.description_full || '',
      'Qisqa Tavsif RU': data.description_short_ru || '',
      'To\'liq Tavsif RU': data.description_full_ru || '',
      'Uzunligi (mm)': data.length_mm || '0',
      'Kengligi (mm)': data.width_mm || '0',
      'Balandligi (mm)': data.height_mm || '0',
      'Vazni (gr)': data.weight_g || '0',
      'Updated At': data.updated_at || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(products);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mahsulotlar");

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="mahsulotlar_export.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
});
