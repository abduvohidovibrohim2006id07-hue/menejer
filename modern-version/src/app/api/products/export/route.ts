import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as XLSX from 'xlsx';
import { withGateway } from '@/lib/api-gateway';

export const GET = withGateway(async (req) => {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  
  let query: any = db.collection('products');
  
  if (idsParam) {
    const idList = idsParam.split(',').filter(id => id.trim() !== '');
    if (idList.length > 0) {
      // Note: Firestore 'in' query limit is 30. If more, we handle manually.
      if (idList.length <= 30) {
        query = query.where('__name__', 'in', idList);
      }
    }
  }

  const snapshot = await query.get();
  
  let docs = snapshot.docs;
  if (idsParam) {
    const idList = idsParam.split(',').filter(id => id.trim() !== '');
    if (idList.length > 30) {
      docs = docs.filter((doc: any) => idList.includes(doc.id));
    }
  }

  const products = docs.map((doc: any) => {
    const data = doc.data();
    const allMedia = (data.local_images || []) as string[];
    
    // Ajratish: Rasmlar va Videolar
    const images = allMedia.filter(url => !url.toLowerCase().endsWith('.mp4')).join('; ');
    const videos = allMedia.filter(url => url.toLowerCase().endsWith('.mp4')).join('; ');

    return {
      'ID': doc.id,
      'Nomi': data.name || '',
      'Nomi RU': data.name_ru || '',
      'Model': data.model || '',
      'Brend': data.brand || '',
      'Kategoriya': data.category || '',
      'Rang': data.color || '',
      'Narx': data.price || '0',
      'Rasm havolalari': images,
      'Video havolalari': videos,
      'Qisqa Tavsif': data.description_short || '',
      'To\'liq Tavsif': data.description_full || '',
      'Qisqa Tavsif RU': data.description_short_ru || '',
      'To\'liq Tavsif RU': data.description_full_ru || '',
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
