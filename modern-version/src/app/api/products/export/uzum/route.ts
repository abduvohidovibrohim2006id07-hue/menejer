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

  // 1. Headerlarni (ustun nomlarini) tayyorlaymiz
  const headers: any[] = [];
  headers[0]  = 'Название товара RU*';
  headers[2]  = 'Название товара UZ*';
  headers[6]  = 'Бренд*';
  headers[7]  = 'Модель';
  headers[9]  = 'Описание товара RU*';
  headers[10] = 'Описание товара UZ*';
  headers[11] = 'Краткое описание RU*';
  headers[12] = 'Краткое описание UZ*';
  headers[19] = 'Ссылки на фото*';
  headers[22] = 'Цвет';
  headers[24] = 'Цена продажи (som)*';
  headers[26] = 'Вес (г)*';
  headers[27] = 'Высота (мм)*';
  headers[28] = 'Ширина (мм)*';
  headers[29] = 'Длина (мм)*';

  // 2. Ma'lumotlarni tayyorlaymiz
  const rows = allProducts.map((data: any) => {
    const images = (data.local_images || [])
      .filter((url: string) => {
        const u = url.toLowerCase();
        return !u.includes('.mp4') && !u.includes('.mov') && !u.includes('.avi') && !u.includes('.mkv');
      })
      .join(';');

    const row: any[] = [];
    row[0]  = data.name_ru || '';
    row[2]  = data.name || '';
    row[6]  = data.brand || '';
    row[7]  = data.model || '';
    row[9]  = data.description_full_ru || '';
    row[10] = data.description_full || '';
    row[11] = data.description_short_ru || '';
    row[12] = data.description_short || '';
    row[19] = images;
    row[22] = data.color || '';
    row[24] = Number(data.price_retail) || Number(data.price) || 0;
    row[26] = Number(data.weight_g) || 0;
    row[27] = Number(data.height_mm) || 0;
    row[28] = Number(data.width_mm) || 0;
    row[29] = Number(data.length_mm) || 0;
    return row;
  });

  // 3. Worksheet yaratamiz (Header + Ma'lumotlar)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Ustunlar kengligini o'rnatish
  worksheet['!cols'] = [
    { wch: 40 }, // A
    { wch: 10 }, // B
    { wch: 40 }, // C
    { wch: 10 }, // D
    { wch: 10 }, // E
    { wch: 10 }, // F
    { wch: 20 }, // G
    { wch: 20 }, // H
    { wch: 10 }, // I
    { wch: 50 }, // J
    { wch: 50 }, // K
    { wch: 40 }, // L
    { wch: 40 }, // M
  ];
  
  // T (19) va boshqa muhim ustunlar kengligi
  const colWidths = worksheet['!cols'] || [];
  colWidths[19] = { wch: 60 }; // T
  colWidths[22] = { wch: 15 }; // W
  colWidths[24] = { wch: 15 }; // Y
  colWidths[26] = { wch: 10 }; // AA
  worksheet['!cols'] = colWidths;

  // 4. Workbook-ni yaratib, buffer-ga yozamiz
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="uzum_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
});
