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

    // FFmpeg path logic - More comprehensive and SAFER search
    let possiblePaths = [
      path.join(process.cwd(), '..', 'ffmpeg', 'bin'),
      'C:\\ffmpeg\\bin',
      path.join(os.homedir(), 'Downloads', 'ffmpeg', 'bin'),
    ];

    try {
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      if (fs.existsSync(downloadsPath)) {
        const files = fs.readdirSync(downloadsPath);
        const ffmpegDirs = files
          .filter(f => f.toLowerCase().startsWith('ffmpeg'))
          .map(f => path.join(downloadsPath, f, 'bin'))
          .filter(p => fs.existsSync(p));
        possiblePaths = [...possiblePaths, ...ffmpegDirs];
      }
    } catch (e) {
      console.error("Error searching FFmpeg in Downloads:", e);
    }

    let FFMPEG_BIN = '';
    for (const p of possiblePaths.filter(p => fs.existsSync(p))) {
      if (fs.existsSync(path.join(p, 'ffmpeg.exe'))) {
        FFMPEG_BIN = p;
        break;
      }
    }

    const isYouTube = processedUrl.includes('youtube.com') || processedUrl.includes('youtu.be');

    const args = [
      '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
      '--recode-video', 'mp4',
      '-o', fullPath,
      '--fixup', 'warn',
      '--no-check-certificate',
      '--max-filesize', '100M',
      '--no-playlist',
      '--no-cache-dir'
    ];

    if (FFMPEG_BIN) {
      args.push('--ffmpeg-location', FFMPEG_BIN);
    }

    if (isYouTube) {
      args.push(
        '--extractor-args', 'youtube:player-client=ios,android,mweb',
        '--cookies-from-browser', 'chrome',
        '--js-runtimes', 'node',
        '--impersonate-client', 'chrome'
      );
    }

    // Trimming logic
    if (startTime && startTime.trim() !== "" && startTime !== "00:00:00") {
      const trimmer = [`-ss ${startTime}`];
      if (endTime && endTime.trim() !== "" && endTime !== "To'liq yuklash") {
        trimmer.push(`-to ${endTime}`);
      }
      args.push('--postprocessor-args', `ffmpeg-s1:${trimmer.join(' ')}`);
    } else if (endTime && endTime.trim() !== "" && endTime !== "To'liq yuklash") {
      args.push('--postprocessor-args', `ffmpeg-s1:-to ${endTime}`);
    }

    args.push(processedUrl);

    const YT_DLP_PATH = 'C:\\Users\\abduv\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\yt-dlp.exe';

    return new Promise<Response>((resolve) => {
      console.log('--- STARTING DOWNLOAD ---');
      console.log('Link:', processedUrl);
      console.log('FFmpeg:', FFMPEG_BIN || 'NOT FOUND');
      console.log('YT-DLP:', fs.existsSync(YT_DLP_PATH) ? 'FOUND' : 'NOT FOUND');
      
      const yt = spawn(YT_DLP_PATH, args);
      
      let errorOutput = '';
      let lastOutput = '';

      yt.stdout.on('data', (data) => {
        lastOutput = data.toString();
        // console.log('yt-dlp stdout:', lastOutput);
      });

      yt.stderr.on('data', (data) => {
        const msg = data.toString();
        errorOutput += msg;
        console.error('yt-dlp error:', msg);
      });

      yt.on('error', (err) => {
        console.error('Spawn error:', err);
        resolve(NextResponse.json({ error: 'Processni ishga tushirishda xato: ' + err.message }, { status: 500 }));
      });

      yt.on('close', async (code) => {
        console.log(`yt-dlp exited with code ${code}`);
        if (code === 0 && fs.existsSync(fullPath)) {
          try {
            console.log('Uploading to S3...');
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
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

            console.log('Upload success:', tempUrl);
            resolve(NextResponse.json({ success: true, tempUrl, filename: outputFilename }));
          } catch (uploadError: any) {
            console.error('S3 Upload Error:', uploadError);
            resolve(NextResponse.json({ error: 'Cloud ga yuklashda xato: ' + uploadError.message }, { status: 500 }));
          }
        } else {
          let userMessage = 'Video yuklashda xatolik yuz berdi.';
          
          if (errorOutput.includes('Sign in to confirm you')) {
            userMessage = 'YouTube bot aniqladi. Iltimos, bir ozdan so\'ng qayta urinib ko\'ring yoki havolani Chrome-da ochib ko\'ring.';
          } else if (errorOutput.includes('Cookies file is locked')) {
            userMessage = 'Brauzer kukkilarini oqib bo\'lmadi. Iltimos, Chrome brauzerini butunlay yopib, qayta urinib ko\'ring yoki boshqa brauzerga o\'ting.';
          } else if (errorOutput.includes('Requested format is not available')) {
            userMessage = 'Siz so\'ragan format yoki sifatdagi video topilmadi.';
          } else if (errorOutput.includes('ffmpeg')) {
            userMessage = 'Videoni qayta ishlashda (trimming) xatolik yuz berdi. FFmpeg dasturi o\'rnatilganini tekshiring.';
          }

          console.error('Download failed:', userMessage, errorOutput);
          resolve(NextResponse.json({ 
            error: userMessage, 
            details: errorOutput || lastOutput || 'Noma\'lum xatolik'
          }, { status: 500 }));
        }
      });
    });

  } catch (error: any) {
    console.error('Download Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
