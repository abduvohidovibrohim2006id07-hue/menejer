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

  try {
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
      return { 
        success: false, 
        message: 'Bearer token topilmadi va avto-login amalga oshmadi. Iltimos login/parolni tekshiring.' 
      };
    }

    const uzumProductIdKey = `marketId_uzum_${cabinetId}`;
    const uzumProductId = productData.warehouse_data?.[uzumProductIdKey];

    if (!uzumProductId) {
      return { 
        success: false, 
        message: 'Uzum Product ID topilmadi. Iltimos, "Bozordagi ID" maydonini toldiring.' 
      };
    }

    const uzum = new UzumMarketAPI(bearerToken, shopId);

    // 4. Fetch current Uzum product
    let uzumProduct: any = await uzum.getProduct(parseInt(uzumProductId));

    if (!uzumProduct) {
       throw { message: "Uzum Marketda mahsulot topilmadi.", status: 404 };
    }

    // 5. Upload Images to Uzum CDN
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

    // 6. Prepare editProduct payload (Description, Title, Images)
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
      productImages: uzumImageKeys.length > 0 
        ? uzumImageKeys.map(key => ({ key, status: 'ACTIVE' }))
        : uzumProduct.productImages,
      skuList: uzumProduct.skuList,
      attributes: { ru: [], uz: [] },
    };

    await uzum.editProduct(editPayload);

    // 7. Update SKU Data (Price, IKPU)
    const skuListUpdate = uzumProduct.skuList.map((sku: any) => {
      const ikpuKey = `ikpu_uzum_${cabinetId}`;
      return {
        id: sku.skuId,
        skuTitle: sku.skuFullTitle,
        fullPrice: parseInt(productData.price) || sku.price,
        sellPrice: parseInt(productData.price) || sku.price,
        ikpu: productData.warehouse_data?.[ikpuKey] || sku.ikpu,
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
    console.error('[DETAILED SYNC ERROR]:', error);
    return { 
      success: false, 
      error: error.message || 'Serverda kutilmagan xatolik!',
      details: error.response?.data || error.toString()
    };
  }
});
