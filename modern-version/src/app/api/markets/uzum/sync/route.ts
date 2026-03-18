import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withGateway } from '@/lib/api-gateway';
import { UzumMarketAPI } from '@/lib/markets/uzum-api';
import axios from 'axios';

export const POST = withGateway(async (req) => {
  const { productId, cabinetId } = await req.json();

  if (!productId || !cabinetId) {
    throw { message: 'productId va cabinetId majburiy', status: 400 };
  }

  // 1. Get Product Data
  const productDoc = await db.collection('products').doc(productId.toString()).get();
  if (!productDoc.exists) {
    throw { message: 'Mahsulot topilmadi', status: 404 };
  }
  const productData = productDoc.data() as any;

  // 2. Get Uzum Market Settings
  const marketDoc = await db.collection('markets').doc('uzum').get();
  if (!marketDoc.exists) {
    throw { message: 'Uzum market sozlamalari topilmadi', status: 404 };
  }
  const marketData = marketDoc.data() as any;

  // 3. Find Cabinet and Token
  let bearerToken = '';
  let shopId = '';
  let email = '';
  let password = '';
  
  marketData.accounts?.forEach((acc: any) => {
    acc.cabinets?.forEach((cab: any) => {
      if (cab.id === cabinetId) {
        bearerToken = cab.bearer_token;
        shopId = cab.id;
        email = acc.email;
        password = acc.password;
      }
    });
  });

  // AVTOMATIK TOKEN YANGILASH (Agar token bo'lmasa)
  if (!bearerToken && email && password) {
    console.log('[Sync] Token yo\'q, yangilashga urunish...');
    const { refreshUzumToken } = require('@/lib/markets/uzum-auth');
    bearerToken = await refreshUzumToken(email, password, cabinetId);
  }

  if (!bearerToken) {
    throw { message: 'Bearer token topilmadi va avto-login amalga oshmadi.', status: 401 };
  }

  const uzum = new UzumMarketAPI(bearerToken, shopId);

  // 4. Logic to sync
  // This is a complex part. We need to map our product to Uzum structure.
  // For now, let's just try to update stock and price if Uzum productId exists in warehouse_data
  
  const uzumProductIdKey = `uzum_product_id_${cabinetId}`;
  const uzumProductId = productData.warehouse_data?.[uzumProductIdKey];

  if (!uzumProductId) {
    // If we don't have Uzum Product ID, we might need to search or create
    // For now, let's return a message asking to link the product ID
    return { 
      success: false, 
      message: 'Uzum Product ID topilmadi. Iltimos, avval mahsulotni Uzum ID bilan bog\'lang.' 
    };
  }

  try {
    const uzum = new UzumMarketAPI(bearerToken, shopId);

    // 1. Get current Uzum product if exists
    let uzumProduct: any = null;
    try {
      uzumProduct = await uzum.getProduct(parseInt(uzumProductId));
    } catch (e) {
      console.log('Uzum Product not found or error fetching:', e);
    }

    if (!uzumProduct) {
       throw { message: "Uzum Marketda mahsulot topilmadi. Avval o'sha ID bo'yicha mahsulot mavjudligini tekshiring.", status: 404 };
    }

    // 2. Upload Images to Uzum CDN if we have local images
    // We'll take the first few images from our product
    const productImages = productData.local_images || [];
    const uzumImageKeys: string[] = [];

    for (const imgUrl of productImages.slice(0, 5)) {
      try {
        const imageResp = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageResp.data);
        const uploadResult = await uzum.uploadImage(buffer);
        if (uploadResult?.payload?.key) {
          uzumImageKeys.push(uploadResult.payload.key);
        }
      } catch (imgErr) {
        console.error('Image upload failed for:', imgUrl, imgErr);
      }
    }

    // 3. Prepare editProduct payload
    // We update description and title
    const editPayload = {
      id: parseInt(uzumProductId),
      title: { 
        uz: productData.name || uzumProduct.title.uz, 
        ru: productData.name_ru || uzumProduct.title.ru 
      },
      categoryId: uzumProduct.category?.id,
      description: productData.description_full || uzumProduct.description,
      shortDescription: productData.description_short || uzumProduct.shortDescription,
      vat: "VAT0",
      filterValues: uzumProduct.filters?.map((f: any) => ({
        filterId: f.id,
        filterValueId: f.values?.[0]?.id
      })).filter((f: any) => f.filterValueId) || [],
      // If we uploaded new images, we can update them here
      productImages: uzumImageKeys.length > 0 
        ? uzumImageKeys.map(key => ({ key, status: 'ACTIVE' }))
        : uzumProduct.productImages,
      skuList: uzumProduct.skuList, // We keep the list, but will update details via sendSkuData
      attributes: { ru: [], uz: [] },
    };

    await uzum.editProduct(editPayload);

    // 4. Update SKU Data (Price, Stock, Dimensions, IKPU)
    // We map our warehouse data to the relevant SKUs
    const skuListUpdate = uzumProduct.skuList.map((sku: any) => {
      // Find matching data in our warehouse_data
      // The user used: skuKey = `sku_${m.id}_${w.wh.id}`; (This might need alignment)
      // For now we use the global price and the specific warehouse stock
      const stockKey = `stock_uzum_${cabinetId}`; // Simplified for demonstration
      const skuCodeKey = `sku_uzum_${cabinetId}`;
      
      return {
        id: sku.skuId,
        skuTitle: sku.skuFullTitle,
        fullPrice: parseInt(productData.price) || sku.price,
        sellPrice: parseInt(productData.price) || sku.price,
        ikpu: productData.warehouse_data?.[`ikpu_uzum_${cabinetId}`] || sku.ikpu,
        barcode: sku.barcode ? sku.barcode.toString() : null,
        dimensions: sku.skuDimension || { length: 100, width: 100, height: 100, weight: 100 },
        skuCharacteristicList: sku.skuCharacteristicList
      };
    });

    const skuDataPayload = {
      productId: parseInt(uzumProductId),
      skuForProduct: uzumProduct.skuTitle,
      skuList: skuListUpdate,
      skuTitlesForCustomCharacteristics: []
    };

    await uzum.sendSkuData(skuDataPayload);

    return { 
      success: true, 
      message: `"${productData.name}" Uzum Market bilan muvaffaqiyatli sinxronizatsiya qilindi! ✅`,
      details: {
        updatedImages: uzumImageKeys.length,
        price: productData.price
      }
    };

  } catch (error: any) {
    console.error('Uzum sync error details:', error.response?.data || error.message);
    throw { 
      message: `Uzum API xatosi: ${error.response?.data?.message || error.message}`, 
      status: 500 
    };
  }
});
