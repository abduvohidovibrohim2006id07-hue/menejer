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
      return u.includes('.mp4') || u.includes('.mov') || u.includes('.avi') || u.includes('.mkv');
    };
    const images = allMedia.filter((url: string) => !isVideo(url)).join(';');
    const videos = allMedia.filter((url: string) => isVideo(url)).join(';');

    // Raqobatchilar qisqacha ko'rinishi
    const competitorsText = (data.competitors || [])
      .map((c: any) => `${c.shopName || 'Noma\'lum'}: ${c.url || '-'}`)
      .join('\n');

    return {
      'ID': data.id,
      'SKU': data.sku || '',
      'Kategoriya': data.category || '',
      'Brend': data.brand || '',
      'Model': data.model || '',
      'Rang': data.color || '',
      'Nomi': data.name || '',
      'Nomi RU': data.name_ru || '',
      'Narx': Number(data.price) || 0,
      'Chakana Narx': Number(data.price_retail) || 0,
      'Status': data.status || 'active',
      'Sotuv bozorlari': (data.marketplaces || []).join(', '),
      'Rasm havolalari': images,
      'Video havolalari': videos,
      'Qisqa Tavsif': data.description_short || '',
      'To\'liq Tavsif': data.description_full || '',
      'Qisqa Tavsif RU': data.description_short_ru || '',
      'To\'liq Tavsif RU': data.description_full_ru || '',
      'Uzunligi (mm)': Number(data.length_mm) || 0,
      'Kengligi (mm)': Number(data.width_mm) || 0,
      'Balandligi (mm)': Number(data.height_mm) || 0,
      'Vazni (gr)': Number(data.weight_g) || 0,
      'Raqobatchilar': competitorsText,
      'Updated At': data.updated_at || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(products);

  // Ustunlar kengligini o'rnatish (Column widths)
  worksheet['!cols'] = [
    { wch: 15 }, // ID
    { wch: 15 }, // SKU
    { wch: 20 }, // Kategoriya
    { wch: 15 }, // Brend
    { wch: 15 }, // Model
    { wch: 15 }, // Rang
    { wch: 40 }, // Nomi
    { wch: 40 }, // Nomi RU
    { wch: 15 }, // Narx
    { wch: 15 }, // Chakana Narx
    { wch: 12 }, // Status
    { wch: 25 }, // Sotuv bozorlari
    { wch: 50 }, // Rasm havolalari
    { wch: 50 }, // Video havolalari
    { wch: 50 }, // Qisqa Tavsif
    { wch: 50 }, // To'liq Tavsif
    { wch: 50 }, // Qisqa Tavsif RU
    { wch: 50 }, // To'liq Tavsif RU
    { wch: 12 }, // Uzunligi
    { wch: 12 }, // Kengligi
    { wch: 12 }, // Balandligi
    { wch: 12 }, // Vazni
    { wch: 40 }, // Raqobatchilar
    { wch: 25 }, // Updated At
  ];

  // Auto-filter qo'shish
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  // Yuqori qatorni muzlatish (Freeze Panes)
  worksheet['!views'] = [
    { state: 'frozen', ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mahsulotlar");

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="mahsulotlar_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
});
