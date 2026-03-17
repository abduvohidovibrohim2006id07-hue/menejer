import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from '@/lib/s3';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from '@/lib/firebase-admin';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const { productId, filename } = await req.json();

    if (!productId || !filename) {
      return NextResponse.json({ error: 'ID va Fayl nomi kiritish majburiy!' }, { status: 400 });
    }

    const localPath = path.join(process.cwd(), 'public', 'temp_videos', filename);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ error: 'Fayl topilmadi!' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(localPath);
    const s3Key = `images/${productId}/${filename}`;

    // 1. Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      ACL: 'public-read'
    });

    await s3Client.send(uploadCommand);
    const videoUrl = `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${s3Key}`;

    // 2. Update Firestore
    const docRef = db.collection('products').doc(productId.toString());
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data() || {};
      const images = data.local_images || [];
      if (!images.includes(videoUrl)) {
        images.push(videoUrl);
        await docRef.update({ local_images: images });
      }
    }

    // 3. Cleanup
    fs.unlinkSync(localPath);

    return NextResponse.json({ 
      success: true, 
      videoUrl 
    });

  } catch (error: any) {
    console.error('Confirm Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
