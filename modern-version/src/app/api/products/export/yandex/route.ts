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

  // 1. Headerlarni tayyorlaymiz
  const headers: any[] = [];
  headers[4]  = 'Mahsulot nomi *';              // E
  headers[5]  = 'Rasmga havola *';             // F
  headers[6]  = 'Mahsulot tavsifi *';          // G
  headers[7]  = 'Bozordagi kategoriya *';      // H
  headers[11] = 'Video havolasi';              // L
  headers[15] = "O'zbek tilidagi nomi lotin *"; // P
  headers[16] = "Lotin tilida o'zbek tilidagi tavsif *"; // Q
  headers[17] = 'Paket bilan vazn, kg';        // R
  headers[18] = "Paket bilan o'lchamlari, sm"; // S
  headers[20] = 'Narxi *';                    // U
  headers[22] = 'Valyuta *';                  // W
  headers[23] = 'Narxi';                      // X

  // 2. Ma'lumotlarni tayyorlaymiz
  const rows = allProducts.map((data: any) => {
    const allMedia = (data.local_images || []) as string[];
    const isVideoFile = (url: string) => {
      const u = url.toLowerCase();
      return u.includes('.mp4') || u.includes('.mov') || u.includes('.avi') || u.includes('.mkv');
    };
    
    // Rasmlar va Videolarni ajratish va vergul bilan birlashtirish
    const images = allMedia.filter((url: string) => !isVideoFile(url)).join(',');
    const videos = allMedia.filter((url: string) => isVideoFile(url)).join(',');

    // Og'irlikni kg ga o'girish (gr / 1000)
    const weightKg = (Number(data.weight_g) || 0) / 1000;
    
    // O'lchamlarni sm ga o'girish (mm / 10) va L/W/H formatiga keltirish
    const lengthCm = (Number(data.length_mm) || 0) / 10;
    const widthCm = (Number(data.width_mm) || 0) / 10;
    const heightCm = (Number(data.height_mm) || 0) / 10;
    const dimensionsCm = `${lengthCm}/${widthCm}/${heightCm}`;

    const row: any[] = [];
    row[4]  = data.name_ru || '';
    row[5]  = images;
    row[6]  = data.description_full_ru || '';
    row[7]  = data.category || '';
    row[11] = videos;
    row[15] = data.name || '';
    row[16] = data.description_full || '';
    row[17] = weightKg;
    row[18] = dimensionsCm;
    row[20] = Number(data.price) || 0;
    row[22] = 'UZS';
    row[23] = Number(data.price_retail) || 0;

    return row;
  });

  // 3. Worksheet yaratamiz
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ustunlar kengligini o'rnatish
  const colWidths = [];
  colWidths[4] = { wch: 40 };  // E
  colWidths[5] = { wch: 50 };  // F
  colWidths[6] = { wch: 50 };  // G
  colWidths[7] = { wch: 25 };  // H
  colWidths[11] = { wch: 30 }; // L
  colWidths[15] = { wch: 40 }; // P
  colWidths[16] = { wch: 50 }; // Q
  colWidths[17] = { wch: 15 }; // R
  colWidths[18] = { wch: 20 }; // S
  colWidths[20] = { wch: 15 }; // U
  colWidths[22] = { wch: 10 }; // W
  colWidths[23] = { wch: 15 }; // X
  worksheet['!cols'] = colWidths;

  // 4. Workbook yaratib, export qilamiz
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Yandex Market");

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="yandex_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
});
