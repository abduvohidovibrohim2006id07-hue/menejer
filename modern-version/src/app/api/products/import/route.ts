import { withGateway } from '@/lib/api-gateway';
import { db } from '@/lib/firebase-admin';
import * as XLSX from 'xlsx';

export const POST = withGateway(async (req) => {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) throw { message: 'Fayl topilmadi', status: 400 };

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  if (!data || data.length === 0) throw { message: 'Excel bo\'sh yoki noto\'g\'ri format', status: 400 };

  // Mapping columns to Firestore fields
  const batch = db.batch();
  let count = 0;

  // Dublikatlarni tekshirish uchun barcha mahsulotlarni bir marta olib kelamiz
  const productsSnapshot = await db.collection('products').get();
  const allExistingProducts = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as any
  }));

  const normalize = (val: any) => (val || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  for (const row of data) {
    const id = row['ID']?.toString();
    if (!id) continue;

    const brand = normalize(row['Brend']);
    const model = normalize(row['Model']);
    const color = normalize(row['Rang']);

    // Media havolalarini qayta ishlash
    const rasmText = row['Rasm havolalari'] || '';
    const videoText = row['Video havolalari'] || '';
    
    const imagesArray = rasmText.split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    const videosArray = videoText.split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    
    // Barchasini birlashtirish
    const local_images = [...imagesArray, ...videosArray];

    let rowStatus = row['Status'] || 'active';

    // Dublikatni tekshirish
    if (brand && model && color) {
      const isDuplicate = allExistingProducts.some(p => {
        if (p.id === id) return false;
        return normalize(p.brand) === brand && normalize(p.model) === model && normalize(p.color) === color;
      });

      if (isDuplicate) {
        rowStatus = 'quarantine';
      }
    }

    const productData: any = {
      name: row['Nomi'] || '',
      name_ru: row['Nomi RU'] || '',
      model: row['Model'] || '',
      brand: row['Brend'] || '',
      category: row['Kategoriya'] || '',
      color: row['Rang'] || '',
      price: row['Narx']?.toString() || '0',
      status: rowStatus,
      marketplaces: (row['Sotuv bozorlari'] || '').split(',').map((m: string) => m.trim()).filter((m: string) => m !== ''),
      description_short: row['Qisqa Tavsif'] || '',
      description_full: row['To\'liq Tavsif'] || '',
      description_short_ru: row['Qisqa Tavsif RU'] || '',
      description_full_ru: row['To\'liq Tavsif RU'] || '',
      length_mm: row['Uzunligi (mm)']?.toString() || '0',
      width_mm: row['Kengligi (mm)']?.toString() || '0',
      height_mm: row['Balandligi (mm)']?.toString() || '0',
      weight_g: row['Vazni (gr)']?.toString() || '0',
      local_images: local_images,
      updated_at: new Date().toISOString(),
    };

    const docRef = db.collection('products').doc(id);
    batch.set(docRef, productData, { merge: true });
    count++;

    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  await batch.commit();

  return { success: true, count };
});
