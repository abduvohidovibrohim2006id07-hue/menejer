import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from '@/lib/s3';
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { productId, filename } = await req.json();

    if (!productId || !filename) {
      return NextResponse.json({ error: 'ID va Fayl nomi kiritish majburiy!' }, { status: 400 });
    }

    const tempS3Key = `temp_videos/${filename}`;
    
    // Sanitization: Remove emojis and special characters that break URLs
    const safeFilename = filename
      .replace(/[^\x00-\x7F]/g, "") // Remove emojis/non-ascii
      .replace(/\s+/g, "_")         // Spaces to underscores
      .replace(/[()]/g, "")         // Remove parentheses
      .replace(/[%&?]/g, "");       // Remove URL magic chars

    const finalS3Key = `images/${productId}/${Date.now()}_${safeFilename}`;

    // 1. Copy in S3
    await s3Client.send(new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${tempS3Key}`,
      Key: finalS3Key,
      ACL: 'public-read'
    }));

    const videoUrl = `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${finalS3Key}`;

    // 2. Update Supabase
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('local_images')
      .eq('id', productId.toString())
      .single();
    
    if (!fetchError && product) {
      const images = product.local_images || [];
      if (!images.includes(videoUrl)) {
        images.push(videoUrl);
        await supabase
          .from('products')
          .update({ local_images: images })
          .eq('id', productId.toString());
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
