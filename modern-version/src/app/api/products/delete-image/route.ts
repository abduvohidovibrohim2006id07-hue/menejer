import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  try {
    const { id, filename } = await req.json();
    
    if (!id || !filename) {
      return NextResponse.json({ error: 'ID and filename are required' }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `images/${id}/${filename}`,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
