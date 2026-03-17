import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from '@/lib/s3';
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { productId, filename } = await req.json();

    if (!productId || !filename) {
      return NextResponse.json({ error: 'ID va Fayl nomi kiritish majburiy!' }, { status: 400 });
    }

    const tempS3Key = `temp_videos/${filename}`;
    const finalS3Key = `images/${productId}/${filename}`;

    // 1. Copy in S3
    await s3Client.send(new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${tempS3Key}`,
      Key: finalS3Key,
      ACL: 'public-read'
    }));

    const videoUrl = `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${finalS3Key}`;

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

    // 3. Cleanup S3 Temp
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: tempS3Key
    }));

    return NextResponse.json({ 
      success: true, 
      videoUrl 
    });

  } catch (error: any) {
    console.error('Confirm Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
