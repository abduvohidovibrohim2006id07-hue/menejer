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
    const videoText = row['Video havolalari'] || '';
    
    const imagesArray = rasmText.split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    const videosArray = videoText.split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    
    const local_images = [...imagesArray, ...videosArray];

    let rowStatus = row['Status'] || 'active';

    // Duplicate check
    if (brand && model && color) {
      const isDuplicate = (allExistingProducts || []).some((p: any) => {
        if (p.id === id) return false;
        return normalize(p.brand) === brand && normalize(p.model) === model && normalize(p.color) === color;
      });

      if (isDuplicate) {
        rowStatus = 'quarantine';
      }
    }

    productsToUpsert.push({
      id: id,
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
    });
  }

  if (productsToUpsert.length > 0) {
    const { error } = await supabase
      .from('products')
      .upsert(productsToUpsert, { onConflict: 'id' });
    
    if (error) throw { message: error.message, status: 500 };
  }

  return { success: true, count: productsToUpsert.length };
});
