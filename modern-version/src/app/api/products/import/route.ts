import { withGateway } from '@/lib/api-gateway';
import { supabase } from '@/lib/supabase';
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

  // Fetch existing products for duplicate check
  const { data: allExistingProducts } = await supabase
    .from('products')
    .select('id, brand, model, color');

  const normalize = (val: any) => (val || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  const productsToUpsert: any[] = [];

  for (const row of data) {
    const id = row['ID']?.toString();
    if (!id) continue;

    const brand = normalize(row['Brend']);
    const model = normalize(row['Model']);
    const color = normalize(row['Rang']);

    // Media links processing
    const rasmText = row['Rasm havolalari'] || '';
    const videoText = row['Video havolasi'] || row['Video havolalari'] || '';
    
    const imagesArray = rasmText.toString().split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    const videosArray = videoText.toString().split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    
    // local_images is not stored in DB directly anymore, but we can keep it here for the upsert 
    // if the DB schema still has it or if we want to trigger some server-side logic.
    // However, looking at products/route.ts, we usually delete it before upsert.
    // But for import, let's keep it if they are providing new links.
    const local_images = [...imagesArray, ...videosArray];

    let rowStatus = row['Status'] || 'active';

    // Duplicate check
    if (brand && model && color) {
      const isDuplicate = (allExistingProducts || []).some((p: any) => {
        if (p.id.toString() === id.toString()) return false;
        return normalize(p.brand) === brand && normalize(p.model) === model && normalize(p.color) === color;
      });

      if (isDuplicate) {
        rowStatus = 'quarantine';
      }
    }

    const toUpsert: any = {
      id: id,
      name: row['Nomi'] || '',
      name_ru: row['Nomi RU'] || '',
      model: row['Model'] || '',
      brand: row['Brend'] || '',
      category: row['Kategoriya'] || '',
      color: row['Rang'] || '',
      price: Number(row['Narx']) || 0,
      price_retail: Number(row['Chakana Narx']) || Number(row['Narx']) || 0,
      status: rowStatus,
      marketplaces: (row['Sotuv bozorlari'] || '').toString().split(',').map((m: string) => m.trim()).filter((m: string) => m !== ''),
      description_short: row['Qisqa Tavsif'] || '',
      description_full: row['To\'liq Tavsif'] || '',
      description_short_ru: row['Qisqa Tavsif RU'] || '',
      description_full_ru: row['To\'liq Tavsif RU'] || '',
      length_mm: Number(row['Uzunligi (mm)']) || 0,
      width_mm: Number(row['Kengligi (mm)']) || 0,
      height_mm: Number(row['Balandligi (mm)']) || 0,
      weight_g: Number(row['Vazni (gr)']) || 0,
      barcode: row['Shtrixkod'] || row['Barcode'] || null,
      sku: row['SKU'] || null,
      sku_uzum: row['SKU Uzum'] || null,
      sku_yandex: row['SKU Yandex'] || null,
      group_sku: row['Guruh SKU'] || row['Group SKU'] || null,
      updated_at: new Date().toISOString(),
    };

    // Clean up empty strings for unique fields to prevent constraint violations
    ['barcode', 'sku', 'sku_uzum', 'sku_yandex', 'group_sku'].forEach(field => {
       if (toUpsert[field] === '') toUpsert[field] = null;
    });

    productsToUpsert.push(toUpsert);
  }

  if (productsToUpsert.length > 0) {
    const { error } = await supabase
      .from('products')
      .upsert(productsToUpsert, { onConflict: 'id' });
    
    if (error) throw { message: error.message, status: 500 };
  }

  return { success: true, count: productsToUpsert.length };
});

