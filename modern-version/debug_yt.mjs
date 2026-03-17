import { spawn } from 'child_process';

const url = 'https://www.youtube.com/watch?v=MXDIR1HTnVA';
const args = [
  '--extractor-args', 'youtube:player-client=mweb',
  '--force-ipv4',
  '--user-agent', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  '--no-check-certificate',
  url
];

console.log('Running yt-dlp with args:', args.join(' '));

const yt = spawn('yt-dlp', args);

yt.stdout.on('data', (data) => console.log('stdout:', data.toString()));
yt.stderr.on('data', (data) => console.log('stderr:', data.toString()));

yt.on('close', (code) => {
  console.log('yt-dlp exited with code:', code);
});
