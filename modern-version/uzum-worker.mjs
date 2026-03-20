import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import admin from 'firebase-admin';
import axios from 'axios';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// 1. Firebase Initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// 2. S3 Initialization (Yandex)
const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
      accessKeyId: process.env.YANDEX_ACCESS_KEY,
      secretAccessKey: process.env.YANDEX_SECRET_KEY,
  },
});
const BUCKET_NAME = process.env.BUCKET_NAME;

// 3. Uzum Logic Class
class UzumWorkerAPI {
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

  async uploadImage(imageBuffer) {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'image.jpg');
    formData.append('tags', 'product,product_3x4');

    const response = await axios.post(`${this.imageUploaderUrl}/upload`, formData, {
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async createProduct(productData) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/createProduct`, productData, {
      headers: this.getHeaders()
    });
    return response.data;
  }
}

// 4. Express Server
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;
const WORKER_SECRET = process.env.WORKER_SECRET || 'uzum_worker_super_secret';

app.get('/', (req, res) => res.send('Uzum Worker is active and waiting for tasks.'));

app.post('/api/upload-to-uzum', async (req, res) => {
    const { productId, secret, bearerToken, shopId, categoryId } = req.body;

    // Security check
    if (secret !== WORKER_SECRET) {
        return res.status(401).json({ error: 'Unauthorized secret' });
    }

    if (!productId || !bearerToken || !shopId) {
        return res.status(400).json({ error: 'Missing parameters (productId, bearerToken, shopId)' });
    }

    // Immediately return success since this is a long task
    // The client doesn't need to wait 30s
    res.json({ status: 'processing', message: 'Task started background' });

    // Start background processing
    (async () => {
        try {
            console.log(`[Worker] Processing product: ${productId}`);
            
            // A. Get Product from Firestore
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                console.error(`[Worker] Product not found: ${productId}`);
                return;
            }
            const productData = productDoc.data();

            // Status update: Syncing
            await productDoc.ref.update({ uzum_sync_status: 'syncing', uzum_sync_error: null });

            // B. Download images from S3
            const uploadedImageUrls = [];
            const uzumApi = new UzumWorkerAPI(bearerToken, shopId);

            // Assuming images are stored as images/ID/image_N.jpg
            // In a real app, you might have image list in the product doc
            // For now, we try to fetch images based on count or known list
            const imageCount = 5; // Search up to 5 images
            for(let i=1; i <= imageCount; i++) {
                try {
                    const key = `images/${productId}/image_${i}.jpg`;
                    const s3Response = await s3Client.send(new GetObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key
                    }));
                    
                    const chunks = [];
                    for await (const chunk of s3Response.Body) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    
                    // C. Upload to Uzum
                    const uploadResult = await uzumApi.uploadImage(buffer);
                    if (uploadResult && uploadResult.url) {
                        uploadedImageUrls.push(uploadResult.url);
                        console.log(`[Worker] Image ${i} uploaded to Uzum: ${uploadResult.url}`);
                    }
                } catch (err) {
                    // It's okay if some images don't exist
                    console.log(`[Worker] Image ${i} not found/failed in S3 for ${productId}`);
                }
            }

            if (uploadedImageUrls.length === 0) {
                throw new Error("Kamida bitta rasm yuklanishi kerak");
            }

            // D. Create product payload for Uzum
            // This structure depends on Uzum API requirements
            const uzumPayload = {
                title: productData.name_uz || productData.name_ru || "Yangi Mahsulot",
                categoryId: parseInt(categoryId) || 1, // You need to pass this
                description: productData.description_uz || "",
                attributes: [], // Attributes are mandatory for many categories
                charcs: [],
                dimensions: { width: 10, height: 10, length: 10, weight: 100 },
                vat: "NO_VAT",
                photos: uploadedImageUrls.map(url => ({ url })),
                skus: [
                   {
                      sku: `${productId}_default`,
                      barcode: `${Date.now()}`,
                      price: productData.price || 0,
                      purchasePrice: (productData.price || 0) * 0.7,
                      fullPrice: productData.old_price || productData.price || 0,
                      quantity: 10,
                      characteristics: []
                   }
                ]
            };

            const result = await uzumApi.createProduct(uzumPayload);
            console.log(`[Worker] Successfully created product in Uzum:`, result);

            // E. Final update Firestore
            await productDoc.ref.update({
                uzum_sync_status: 'synced',
                uzum_id: result.id || result.productId,
                uzum_synced_at: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[Worker] ERROR for ${productId}:`, error.response?.data || error.message);
            await db.collection('products').doc(productId).update({
                uzum_sync_status: 'failed',
                uzum_sync_error: error.message
            });
        }
    })();
});

app.listen(PORT, () => console.log(`[Worker] Server running on port ${PORT}`));
