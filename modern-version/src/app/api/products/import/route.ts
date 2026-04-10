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

  // Fetch all existing products to determine max ID and for duplicate checks
  const { data: allExistingProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, brand, model, color');
  
  if (fetchError) throw { message: fetchError.message, status: 500 };

  // Determine starting numeric ID
  const existingIds = (allExistingProducts || [])
    .map(p => parseInt(String(p.id)) || 0)
    .filter(id => !isNaN(id) && id > 0 && id < 1000000000); // Filter out massive IDs (like Uzum 17-digit IDs)
  
  let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 10001;

  const normalize = (val: any) => (val || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  const productsToUpsert: any[] = [];
  const today = new Date();
  const datePart = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD

  for (const row of data) {
    let id = row['ID']?.toString().trim();
    
    // Auto-generate ID if missing or "new"
    if (!id || id.toLowerCase() === 'yangi' || id.toLowerCase() === 'new') {
      id = nextId.toString();
      nextId++;
    }

    const brand = normalize(row['Brend']);
    const model = normalize(row['Model']);
    const color = normalize(row['Rang']);

    const rawBrand = (row['Brend'] || '').toString().trim().toUpperCase();
    const rawModel = (row['Model'] || '').toString().trim().toUpperCase();
    const rawColor = (row['Rang'] || '').toString().trim().toUpperCase();

    // Media links processing
    const rasmText = row['Rasm havolalari'] || '';
    const videoText = row['Video havolasi'] || row['Video havolalari'] || '';
    
    const imagesArray = rasmText.toString().split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
    const videosArray = videoText.toString().split(';').map((u: string) => u.trim()).filter((u: string) => u !== '');
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

    // Auto-generate Barcode if missing
    let barcode = row['Shtrixkod'] || row['Barcode'];
    if (!barcode && id) {
      let idPart = "";
      if (/^\d+$/.test(id)) {
        idPart = id.length > 5 ? id.slice(-5) : id.padStart(5, '0');
      } else {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
          hash = ((hash << 5) - hash) + id.charCodeAt(i);
          hash |= 0; 
        }
        idPart = Math.abs(hash % 100000).toString().padStart(5, '0');
      }
      barcode = `20${datePart}${idPart}`;
    }

    // Auto-generate SKUs if missing
    let skuUzum = row['SKU Uzum'] || null;
    if (!skuUzum && rawBrand && rawModel) {
      skuUzum = (rawBrand + rawModel + rawColor).replace(/[^A-Z0-9]/g, '');
    }

    let skuYandex = row['SKU Yandex'] || null;
    if (!skuYandex && rawBrand && rawModel) {
      skuYandex = `${rawBrand}-${rawModel}`;
      if (rawColor) skuYandex += `-${rawColor}`;
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
      barcode: barcode || null,
      sku: row['SKU'] || null,
      sku_uzum: skuUzum,
      sku_yandex: skuYandex,
      group_sku: row['Guruh SKU'] || row['Group SKU'] || null,
      updated_at: new Date().toISOString(),
    };

    // Clean up empty strings for unique fields
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
