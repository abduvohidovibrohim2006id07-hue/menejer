const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config({ path: './modern-version/.env.local' });

// UzumMarketAPI logic directly in the script to avoid import issues
class UzumMarketAPI {
  constructor(bearerToken, shopId) {
    this.bearerToken = bearerToken;
    this.shopId = shopId;
    this.baseUrl = 'https://api-seller.uzum.uz';
    this.imageUploaderUrl = 'https://images-uploader.uzum.uz';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      'Origin': 'https://seller.uzum.uz',
      'Referer': 'https://seller.uzum.uz/',
      'Accept-Language': 'uz-UZ',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'
    };
  }

  async getProduct(productId) {
    const response = await axios.get(`${this.baseUrl}/api/seller/shop/${this.shopId}/product`, {
      params: { productId },
      headers: this.getHeaders()
    });
    return response.data;
  }

  async editProduct(productData) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/editProduct`, productData, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async sendSkuData(payload) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/sendSkuData`, payload, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async uploadImage(imageBuffer) {
    const fd = new (require('form-data'))();
    fd.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    fd.append('tags', 'product,product_3x4');

    const response = await axios.post(`${this.imageUploaderUrl}/upload`, fd, {
      headers: {
        ...this.getHeaders(),
        ...fd.getHeaders()
      }
    });
    return response.data;
  }
}

// Setup Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount.trim())),
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
}

const db = admin.firestore();

async function runTestSync() {
    const productId = "10013";
    console.log(`--- Sinxronizatsiya testi boshlandi: Mahsulot ${productId} ---`);

    try {
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            console.error("❌ Xato: Mahsulot firebasdan topilmadi!");
            return;
        }
        const productData = productDoc.data();
        console.log(`✅ Mahsulot topildi: ${productData.name}`);

        const marketDoc = await db.collection('markets').doc('uzum').get();
        const marketData = marketDoc.data();
        
        let bearerToken = '';
        let shopId = '';
        let cabinetId = '';

        marketData.accounts?.forEach(acc => {
            acc.cabinets?.forEach(cab => {
                if (cab.bearer_token) {
                    bearerToken = cab.bearer_token;
                    shopId = cab.id;
                    cabinetId = cab.id;
                }
            });
        });

        if (!bearerToken) {
            console.error("❌ Xato: Uzum akkauntingizda Bearer Token saqlanmagan!");
            return;
        }
        
        // Find uzum ID in warehouse_data
        let uzumProductId = '';
        Object.keys(productData.warehouse_data || {}).forEach(k => {
            if (k.startsWith('marketId_uzum_')) {
                uzumProductId = productData.warehouse_data[k];
            }
        });

        if (!uzumProductId) {
            console.error("❌ Xato: Mahsulotda Uzum Product ID (Bozordagi ID) kiritilmagan!");
            return;
        }

        const uzum = new UzumMarketAPI(bearerToken, shopId);
        const uzumProduct = await uzum.getProduct(parseInt(uzumProductId));
        console.log(`✅ Uzumdan mahsulot olingan: ${uzumProduct.title.uz}`);

        const localImages = (productData.local_images || []).slice(0, 10);
        const uploadedKeys = [];
        for (const imgUrl of localImages) {
            try {
                const resp = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                const upload = await uzum.uploadImage(Buffer.from(resp.data));
                if (upload.payload?.key) {
                    uploadedKeys.push(upload.payload.key);
                    console.log(`   Rasm yuklandi: ${upload.payload.key}`);
                }
            } catch (e) {
                console.warn(`   Rasm yuklashda xato: ${e.message}`);
            }
        }

        const editPayload = {
            id: parseInt(uzumProductId),
            title: { uz: productData.name, ru: productData.name_ru || productData.name },
            categoryId: uzumProduct.category.id,
            description: productData.description_full || uzumProduct.description,
            shortDescription: productData.description_short || uzumProduct.shortDescription,
            vat: "VAT0",
            filterValues: uzumProduct.filters?.map(f => ({
                filterId: f.id,
                filterValueId: f.values?.[0]?.id
            })).filter(f => f.filterValueId) || [],
            productImages: uploadedKeys.length > 0 ? uploadedKeys.map(key => ({ key, status: 'ACTIVE' })) : uzumProduct.productImages,
            skuList: uzumProduct.skuList,
            attributes: { ru: [], uz: [] },
        };
        await uzum.editProduct(editPayload);
        
        const skuUpdates = uzumProduct.skuList.map(sku => ({
            id: sku.skuId,
            skuTitle: sku.skuFullTitle,
            fullPrice: parseInt(productData.price),
            sellPrice: parseInt(productData.price),
            ikpu: productData.warehouse_data?.[`ikpu_uzum_${cabinetId}`] || sku.ikpu,
            barcode: sku.barcode ? sku.barcode.toString() : null,
            dimensions: sku.skuDimension || { length: 100, width: 100, height: 100, weight: 100 },
            skuCharacteristicList: sku.skuCharacteristicList
        }));

        await uzum.sendSkuData({
            productId: parseInt(uzumProductId),
            skuForProduct: uzumProduct.skuTitle,
            skuList: skuUpdates,
            skuTitlesForCustomCharacteristics: []
        });

        console.log("\n🎊 MUVAFFARIYATLI YAKUNLANDI!");
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

runTestSync();
