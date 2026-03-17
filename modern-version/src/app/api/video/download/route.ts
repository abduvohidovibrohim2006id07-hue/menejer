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

    // 1. URL Transformation: Convert shorts to regular watch URL
    let processedUrl = url;
    if (url.includes('/shorts/')) {
      const videoId = url.split('/shorts/')[1]?.split('?')[0];
      if (videoId) {
        processedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log("Transformed Shorts URL to:", processedUrl);
      }
    }

    const outputFilename = `${productId}_temp_${Math.random().toString(36).substring(7)}.mp4`;
    const tempDir = os.tmpdir();
    const fullPath = path.join(tempDir, outputFilename);

    // FFmpeg path logic
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
      '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
      '--ffmpeg-location', FFMPEG_BIN,
      '--recode-video', 'mp4',
      '-o', fullPath,
      '--fixup', 'warn',
      '--no-check-certificate',
      '--max-filesize', '100M',
      // Advanced bypass flags
      '--impersonate-client', 'chrome',
      '--extractor-args', 'youtube:player-client=ios,mweb',
      '--cookies-from-browser', 'chrome',
      '--js-runtimes', 'node',
      '--no-cache-dir',
      processedUrl
    ];

    // Restore trimming logic
    if (startTime && startTime.trim() !== "" && startTime !== "00:00:00") {
      const trimmer = [`-ss ${startTime}`];
      if (endTime && endTime.trim() !== "" && endTime !== "To'liq yuklash") {
        trimmer.push(`-to ${endTime}`);
      }
      args.splice(args.length - 1, 0, '--postprocessor-args', `ffmpeg-s1:${trimmer.join(' ')}`);
    } else if (endTime && endTime.trim() !== "" && endTime !== "To'liq yuklash") {
      args.splice(args.length - 1, 0, '--postprocessor-args', `ffmpeg-s1:-to ${endTime}`);
    }

    return new Promise<Response>((resolve) => {
      console.log('Spawning yt-dlp with args:', args.join(' '));
      const yt = spawn('yt-dlp', args);
      
      let errorOutput = '';
      let stdoutOutput = '';

      yt.stdout.on('data', (data) => {
        stdoutOutput += data.toString();
      });

      yt.stderr.on('data', (data) => {
        const msg = data.toString();
        errorOutput += msg;
        console.log('yt-dlp stderr:', msg);
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
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

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
          // Identify specific bot/sign-in error
          let userMessage = 'Video yuklashda xatolik yuz berdi.';
          if (errorOutput.includes('Sign in to confirm you')) {
            userMessage = 'YouTube bot aniqladi va yuklashni blokladi. Iltimos, bir ozdan so\'ng qayta urinib ko\'ring yoki boshqa havoladan foydalaning.';
          } else if (errorOutput.includes('Requested format is not available')) {
             userMessage = 'Tanlangan sifatdagi video topilmadi.';
          }

          resolve(NextResponse.json({ 
            error: userMessage, 
            details: errorOutput.substring(0, 1000) // Limit length
          }, { status: 500 }));
        }
      });
    });

  } catch (error: any) {
    console.error('Download Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
