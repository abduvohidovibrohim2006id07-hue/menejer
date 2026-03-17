import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: Request) {
  try {
    const { productId, url } = await req.json();

    if (!productId || !url) {
      return NextResponse.json({ error: 'ID va Link kiritish majburiy!' }, { status: 400 });
    }

    const outputFilename = `${productId}_temp_${Math.random().toString(36).substring(7)}.mp4`;
    const publicPath = path.join(process.cwd(), 'public', 'temp_videos');
    const fullPath = path.join(publicPath, outputFilename);

    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }

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
      '--ffmpeg-location', FFMPEG_BIN,
      '--downloader', 'ffmpeg',
      '--recode-video', 'mp4',
      '-o', fullPath,
      '--fixup', 'force',
      '--no-check-certificate',
      url
    ];

    return new Promise((resolve) => {
      const yt = spawn('yt-dlp', args);
      
      let errorOutput = '';

      yt.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('yt-dlp stderr:', data.toString());
      });

      yt.on('close', (code) => {
        if (code === 0 && fs.existsSync(fullPath)) {
          resolve(NextResponse.json({ 
            success: true, 
            tempUrl: `/temp_videos/${outputFilename}`,
            filename: outputFilename
          }));
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
