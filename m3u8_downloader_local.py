import os
import subprocess
import boto3
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import sys

# Load env variables from Next.js project
env_path = os.path.join(os.path.dirname(__file__), 'modern-version', '.env.local')
load_dotenv(env_path)

YANDEX_ACCESS_KEY = os.getenv('YANDEX_ACCESS_KEY')
YANDEX_SECRET_KEY = os.getenv('YANDEX_SECRET_KEY')
BUCKET_NAME = os.getenv('BUCKET_NAME', 'savdomarketimag')

# S3 Client for Yandex Cloud
s3 = boto3.client(
    's3',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id=YANDEX_ACCESS_KEY,
    aws_secret_access_key=YANDEX_SECRET_KEY,
    region_name='ru-central1'
)

# Firebase Setup
# Check for firebase-key.json in current dir
cred_path = os.path.join(os.path.dirname(__file__), 'firebase-key.json')
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def download_and_upload(product_id, m3u8_url):
    print(f"🚀 {product_id} uchun video yuklanmoqda...")
    output_filename = f"{product_id}_video_{os.urandom(4).hex()}.mp4"
    local_path = os.path.join(os.getcwd(), output_filename)

    try:
        # Path to the ffmpeg you just extracted
        FFMPEG_PATH = r"C:\Users\abduv\Downloads\ffmpeg-2026-03-15-git-6ba0b59d8b-full_build\bin"
        ffmpeg_exe = os.path.join(FFMPEG_PATH, 'ffmpeg.exe')

        has_ffmpeg = os.path.exists(ffmpeg_exe)

        if not has_ffmpeg:
            print("⚠️  FFmpeg topilmadi! Videoning ulangan joylari bilinishi mumkin.")
            print("💡 Tavsiya: FFmpeg o'rnating, shunda videolar choksiz (seamless) bo'ladi.")
        else:
            print("✅ FFmpeg topildi! Video sifati mukammal bo'ladi.")

        # 1. Download using yt-dlp (Forced Re-encode for smoothness)
        print("⬇️ .m3u8 dan MP4 ga o'girilmoqda (Mukammal birlashtirish: Re-encode)...")
        cmd = [
            'yt-dlp',
            '--ffmpeg-location', FFMPEG_PATH,
            '--downloader', 'ffmpeg',           # Force ffmpeg for better handling
            '--recode-video', 'mp4',           # Full re-encode to remove segments/seams
            '-o', local_path,
            '--fixup', 'force',
            '--no-check-certificate',
            m3u8_url
        ]
        subprocess.run(cmd, check=True)

        if not os.path.exists(local_path):
            print("❌ Fayl yuklanmadi.")
            return

        # 1.5 Preview and Confirm
        print(f"👀 Videoni tekshiring: {local_path}")
        os.startfile(local_path)
        
        confirm = input("\nVideoni bazaga yuklaymizmi? (y/n): ").strip().lower()
        if confirm != 'y':
            print("🚫 Bekor qilindi.")
            os.remove(local_path)
            return

        # 2. Upload to S3
        print(f"☁️ S3 ga yuklanmoqda: {BUCKET_NAME}...")
        s3_key = f"images/{product_id}/{output_filename}"
        s3.upload_file(local_path, BUCKET_NAME, s3_key, ExtraArgs={'ContentType': 'video/mp4', 'ACL': 'public-read'})
        
        video_url = f"https://storage.yandexcloud.net/{BUCKET_NAME}/{s3_key}"
        print(f"✅ Yuklandi: {video_url}")

        # 3. Update Firestore (optional but helpful)
        # We append to local_images list in Firestore
        doc_ref = db.collection('products').document(product_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            images = data.get('local_images', [])
            if video_url not in images:
                images.append(video_url)
                doc_ref.update({'local_images': images})
                print("📝 Firestore yangilandi.")
        
        # Cleanup
        os.remove(local_path)
        print("🧹 Vaqtinchalik fayl o'chirildi.")

    except Exception as e:
        print(f"❌ Xatolik yuz berdi: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Foydalanish: python m3u8_downloader_local.py <PRODUCT_ID> <M3U8_URL>")
    else:
        download_and_upload(sys.argv[1], sys.argv[2])
