import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { s3Client, BUCKET_NAME, PUBLIC_ENDPOINT } from '@/lib/s3';
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  try {
    const { productId, url, startTime, endTime } = await req.json();

    if (!productId || !url) {
      return NextResponse.json({ error: 'ID va Link kiritish majburiy!' }, { status: 400 });
    }

    const outputFilename = `${productId}_temp_${Math.random().toString(36).substring(7)}.mp4`;
    const tempDir = os.tmpdir();
    const fullPath = path.join(tempDir, outputFilename);

    // FFmpeg path logic from Python script
    const possiblePaths = [
      path.join(process.cwd(), '..', 'ffmpeg', 'bin'),
      path.join(process.env.USERPROFILE || '', 'Downloads', 'ffmpeg-2026-03-15-git-6ba0b59d8b-full_build', 'bin'),
      'C:\\ffmpeg\\bin'
    ];

    let FFMPEG_BIN = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'ffmpeg.exe'))) {
        FFMPEG_BIN = p;
        break;
      }
    }

    const args = [
      '--format', 'bestvideo[height<=720]+bestaudio/best[height<=720]',
      '--ffmpeg-location', FFMPEG_BIN,
      '--downloader', 'ffmpeg',
      '--recode-video', 'mp4',
      '-o', fullPath,
      '--fixup', 'force',
      '--no-check-certificate'
    ];

    // Trimming logic if parameters provided
    if (startTime || endTime) {
      const trimmer = [];
      if (startTime) trimmer.push(`-ss ${startTime}`);
      if (endTime) trimmer.push(`-to ${endTime}`);
      args.push('--postprocessor-args', `ffmpeg-s1:${trimmer.join(' ')}`);
    }

    args.push(url);

    return new Promise<Response>((resolve) => {
      const yt = spawn('yt-dlp', args);
      
      let errorOutput = '';

      yt.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('yt-dlp stderr:', data.toString());
      });

      yt.on('close', async (code) => {
        if (code === 0 && fs.existsSync(fullPath)) {
          try {
            const fileBuffer = fs.readFileSync(fullPath);
            const s3Key = `temp_videos/${outputFilename}`;
            
            await s3Client.send(new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: s3Key,
              Body: fileBuffer,
              ContentType: 'video/mp4',
              ACL: 'public-read'
            }));

            const tempUrl = `${PUBLIC_ENDPOINT}/${BUCKET_NAME}/${s3Key}`;
            
            // Clean up local temp file
            fs.unlinkSync(fullPath);

            resolve(NextResponse.json({ 
              success: true, 
              tempUrl,
              filename: outputFilename,
              s3Key
            }));
          } catch (uploadError: any) {
            resolve(NextResponse.json({ error: 'S3 ga yuklashda xatolik: ' + uploadError.message }, { status: 500 }));
          }
        } else {
          resolve(NextResponse.json({ 
            error: 'Video yuklashda xatolik yuz berdi.', 
            details: errorOutput 
          }, { status: 500 }));
        }
      });
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
