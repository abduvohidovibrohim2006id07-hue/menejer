import os
import sys
import time
import requests
import yt_dlp
import tkinter as tk
from tkinter import messagebox, ttk
from dotenv import load_dotenv

# .env faylini yuklash
load_dotenv()

class VideoDownloaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Video Yuklagich & S3 Uploader")
        self.root.geometry("500x350")
        self.root.resizable(False, False)

        # UI elementlari
        tk.Label(root, text="Video Havolasi (URL):", font=("Arial", 10, "bold")).pack(pady=(20, 5))
        self.url_entry = tk.Entry(root, width=55)
        self.url_entry.pack(pady=5)

        tk.Label(root, text="Mahsulot ID (E-ID):", font=("Arial", 10, "bold")).pack(pady=(10, 5))
        self.id_entry = tk.Entry(root, width=20)
        self.id_entry.pack(pady=5)

        # Progress bar
        self.progress = ttk.Progressbar(root, orient="horizontal", length=400, mode="determinate")
        self.progress.pack(pady=20)

        self.status_label = tk.Label(root, text="Tayyor", fg="blue")
        self.status_label.pack(pady=5)

        # Tugma
        self.download_btn = tk.Button(root, text="YUKLASH VA UPLOAD QILISH", command=self.start_process, 
                                     bg="#4CAF50", fg="white", font=("Arial", 10, "bold"), padding=10)
        self.download_btn.pack(pady=20)

    def log(self, text, color="blue"):
        self.status_label.config(text=text, fg=color)
        self.root.update()

    def progress_hook(self, d):
        if d['status'] == 'downloading':
            p = d.get('_percent_str', '0%').replace('%','')
            try:
                self.progress['value'] = float(p)
                self.log(f"Yuklanmoqda: {d['_percent_str']}")
            except: pass

    def start_process(self):
        url = self.url_entry.get().strip()
        item_id = self.id_entry.get().strip()

        if not url or not item_id:
            messagebox.showerror("Xato", "URL va ID ni kiriting!")
            return

        self.download_btn.config(state="disabled")
        try:
            # 1. Yuklab olish
            self.log("Video ma'lumotlari olinmoqda...")
            temp_filename = f"temp_video_{int(time.time())}.mp4"
            
            ydl_opts = {
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'outtmpl': temp_filename,
                'progress_hooks': [self.progress_hook],
                'quiet': True,
                'no_warnings': True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            if not os.path.exists(temp_filename):
                raise Exception("Videoni yuklab bo'lmadi.")

            # 2. S3 ga yuklash (Sizning API orqali)
            self.log("S3 ga yuklanmoqda (Direct Upload)...", "orange")
            
            # Backend manzili (Vercel URL yoki localhost)
            # BU YERNI O'ZINGIZNING SAYT MANZILINGIZGA O'ZGARTIRING
            base_url = "https://photomenejer.vercel.app" 
            
            with open(temp_filename, 'rb') as f:
                file_content = f.read()
                file_name = f"pc_upload_{int(time.time())}.mp4"
                
                # Presigned URL olish
                res = requests.post(f"{base_url}/api/get_presigned_url", json={
                    "id": item_id,
                    "filename": file_name,
                    "contentType": "video/mp4"
                })
                url_data = res.json()
                
                if not url_data.get('success'):
                    raise Exception(url_data.get('error', 'API xatosi'))

                # S3 ga yuborish
                upload_res = requests.put(url_data['uploadUrl'], data=file_content, headers={
                    "Content-Type": "video/mp4"
                })

                if upload_res.status_code != 200:
                    raise Exception("S3 yuklashda xato.")

            self.log("MUVAFFAQIYATLI YUKLANDI! ✨", "green")
            messagebox.showinfo("Tayyor", "Video yuklandi va saytga qo'shildi!")
            
            # Tozalash
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

        except Exception as e:
            self.log(f"Xato: {str(e)}", "red")
            messagebox.showerror("Xatolik", str(e))
        finally:
            self.download_btn.config(state="normal")
            self.progress['value'] = 0

if __name__ == "__main__":
    root = tk.Tk()
    app = VideoDownloaderApp(root)
    root.mainloop()
