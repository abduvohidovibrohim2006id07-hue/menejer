import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  try {
    const { id, url } = await req.json();

    if (!id || !url) {
      return NextResponse.json({ error: 'ID and URL are required' }, { status: 400 });
    }

    // 1. Fetch the image from URL
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image from URL");
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1] || 'jpg';
    
    const filename = `url_upload_${Date.now()}.${extension}`;
    const key = `images/${id}/${Date.now()}_${filename}`;

    // 2. Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return NextResponse.json({ 
      success: true, 
      key 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
