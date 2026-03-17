import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: Request) {
  try {
    const { id, filename, contentType } = await req.json();
    
    if (!id || !filename) {
      return NextResponse.json({ error: 'ID and filename are required' }, { status: 400 });
    }

    const key = `images/${id}/${Date.now()}_${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    return NextResponse.json({ 
      success: true, 
      uploadUrl: url,
      key 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
