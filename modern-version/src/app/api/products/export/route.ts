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
      const regularIds = idList.filter(id => !id.startsWith('group-'));
      const groupSkus = idList.filter(id => id.startsWith('group-')).map(id => id.replace('group-', ''));

      allProducts = allProducts.filter((p: any) => {
        const isRegularMatch = regularIds.includes(p.id.toString());
        const isGroupMatch = p.group_sku && groupSkus.includes(p.group_sku);
        return isRegularMatch || isGroupMatch;
      });
    }
  }

  const rows = allProducts.map((data: any) => {
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

    return [
      data.id,
      data.group_sku || '',
      data.sku || '',
      data.sku_uzum || '',
      data.sku_yandex || '',
      data.barcode ? String(data.barcode) : '',
      data.category || '',
      data.brand || '',
      data.model || '',
      data.color || '',
      data.name || '',
      data.name_ru || '',
      Number(data.price) || 0,
      Number(data.old_price) || 0,
      Number(data.price_retail) || 0,
      data.status || 'active',
      (data.marketplaces || []).join(', '),
      images,
      videos,
      data.description_short || '',
      data.description_full || '',
      data.description_short_ru || '',
      data.description_full_ru || '',
      Number(data.length_mm) || 0,
      Number(data.width_mm) || 0,
      Number(data.height_mm) || 0,
      Number(data.weight_g) || 0,
      competitorsText,
      data.updated_at || '',
    ];
  });

  const headers = [
    'ID', 'Guruh SKU', 'SKU', 'SKU Uzum', 'SKU Yandex', 'Shtrixkod', 
    'Kategoriya', 'Brend', 'Model', 'Rang', 'Nomi', 'Nomi RU', 
    'Narx', 'Eski Narx', 'Chakana Narx', 'Status', 'Sotuv bozorlari', 
    'Rasm havolalari', 'Video havolasi', 'Qisqa Tavsif', 'To\'liq Tavsif', 
    'Qisqa Tavsif RU', 'To\'liq Tavsif RU', 'Uzunligi (mm)', 'Kengligi (mm)', 
    'Balandligi (mm)', 'Vazni (gr)', 'Raqobatchilar', 'Yangilangan sana'
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ustunlar kengligini o'rnatish (Column widths)
  worksheet['!cols'] = [
    { wch: 15 }, // ID
    { wch: 15 }, // Guruh SKU
    { wch: 15 }, // SKU
    { wch: 15 }, // SKU Uzum
    { wch: 15 }, // SKU Yandex
    { wch: 15 }, // Shtrixkod
    { wch: 20 }, // Kategoriya
    { wch: 15 }, // Brend
    { wch: 15 }, // Model
    { wch: 15 }, // Rang
    { wch: 40 }, // Nomi
    { wch: 40 }, // Nomi RU
    { wch: 15 }, // Narx
    { wch: 15 }, // Eski Narx
    { wch: 15 }, // Chakana Narx
    { wch: 12 }, // Status
    { wch: 25 }, // Sotuv bozorlari
    { wch: 50 }, // Rasm havolalari
    { wch: 50 }, // Video havolasi
    { wch: 50 }, // Qisqa Tavsif
    { wch: 50 }, // To'liq Tavsif
    { wch: 50 }, // Qisqa Tavsif RU
    { wch: 50 }, // To'liq Tavsif RU
    { wch: 12 }, // Uzunligi
    { wch: 12 }, // Kengligi
    { wch: 12 }, // Balandligi
    { wch: 12 }, // Vazni
    { wch: 40 }, // Raqobatchilar
    { wch: 25 }, // Yangilangan sana
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
