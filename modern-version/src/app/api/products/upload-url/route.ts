import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from '@/lib/s3';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { id, url } = await req.json();

    if (!id || !url) {
      return NextResponse.json({ error: 'ID and URL are required' }, { status: 400 });
    }

    // 1. Fetch the media from URL
    console.log("Fetching remote media:", url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
       console.error("Fetch failed:", response.status, response.statusText);
       throw new Error(`Failed to fetch media from URL (Status: ${response.status})`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1]?.split('+')[0] || 'jpg';
    
    // Sanitization: Clean filename from URL if it exists
    const urlParts = url.split('/').pop()?.split('?')[0] || 'upload';
    const cleanName = urlParts
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    const filename = `url_${Date.now()}_${cleanName}.${extension}`;
    const key = `images/${id}/${filename}`;

    // 2. Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    });

    await s3Client.send(command);

    const mediaUrl = `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${key}`;

    // 3. Update Firestore
    const docRef = db.collection('products').doc(id.toString());
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data() || {};
      const images = data.local_images || [];
      if (!images.includes(mediaUrl)) {
        images.push(mediaUrl);
        await docRef.update({ local_images: images });
      }
    }

    return NextResponse.json({ 
      success: true, 
      mediaUrl,
      key 
    });
  } catch (error: any) {
    console.error('Upload URL Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
