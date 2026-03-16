import pandas as pd
import requests
import os
from tqdm import tqdm
import time
from concurrent.futures import ThreadPoolExecutor

def download_image(url, folder_path, filename):
    try:
        if pd.isna(url) or str(url).strip() == '' or not str(url).startswith('http'):
            return False
            
        url = str(url).strip()
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            # Try to get extension from URL or content-type
            ext = os.path.splitext(url)[1].split('?')[0]
            if not ext or len(ext) > 5:
                content_type = response.headers.get('content-type', '')
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = '.jpg'
                elif 'png' in content_type:
                    ext = '.png'
                elif 'webp' in content_type:
                    ext = '.webp'
                else:
                    ext = '.jpg'
            
            full_filename = f"{filename}{ext}"
            file_path = os.path.join(folder_path, full_filename)
            
            with open(file_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            return False
    except Exception as e:
        return False

def main():
    excel_file = 'natijalar.xlsx'
    base_output_dir = 'yuklab_olingan_rasmlar'
    
    if not os.path.exists(excel_file):
        print(f"Xato: {excel_file} fayli topilmadi!")
        return

    print(f"Excel fayli o'qilmoqda: {excel_file}...")
    try:
        # Read Excel without header to be safe, or detect it
        df = pd.read_excel(excel_file, header=None)
    except Exception as e:
        print(f"Excel faylini o'qishda xato: {e}")
        return

    if not os.path.exists(base_output_dir):
        os.makedirs(base_output_dir)

    # Column A is ID (index 0)
    # Columns F to O are links (indices 5 to 14)
    id_col = 0
    url_cols = list(range(5, 15)) # 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

    total_rows = len(df)
    print(f"Jami {total_rows} ta qator topildi. Rasmlarni yuklash boshlanmoqda...")

    for index, row in tqdm(df.iterrows(), total=total_rows, desc="Qatorlar"):
        item_id = str(row[id_col]).strip().split('.')[0] # Remove .0 if it's a float ID
        
        # Skip header or empty IDs
        if item_id.lower() == 'id' or not item_id or item_id == 'nan':
            continue

        # Create ID-specific folder
        item_folder = os.path.join(base_output_dir, item_id)
        if not os.path.exists(item_folder):
            os.makedirs(item_folder)

        # Download each image
        for i, col_idx in enumerate(url_cols):
            url = row[col_idx]
            download_image(url, item_folder, f"rasm_{i+1}")

    print(f"\nBarcha amallar bajarildi! Rasmlar '{base_output_dir}' papkasiga saqlandi.")

if __name__ == "__main__":
    main()
