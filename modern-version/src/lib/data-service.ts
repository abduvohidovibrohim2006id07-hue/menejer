import { db } from './firebase-admin';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from './s3';
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function getProducts() {
  try {
    // 1. Fetch products from Firestore
    const productsSnapshot = await db.collection('products').get();
    const productsData = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 2. Fetch all image keys from S3 (optimistic approach as in old app)
    let allKeys: string[] = [];
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'images/'
      });
      const s3Resp = await s3Client.send(command);
      allKeys = s3Resp.Contents?.map(obj => obj.Key || '') || [];
    } catch (s3Error) {
      console.error("S3 fetch error:", s3Error);
    }

    // 3. Map images to products
    return productsData.map((p: any) => {
      const prefix = `images/${p.id}/`;
      const imgs = allKeys
        .filter(key => key.startsWith(prefix))
        .sort()
        .map(key => `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${key}`);
      
      return {
        ...p,
        local_images: imgs
      };
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

export async function getCategories() {
  try {
    const catsSnapshot = await db.collection('categories').get();
    return catsSnapshot.docs.map(doc => doc.data().name).sort();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
