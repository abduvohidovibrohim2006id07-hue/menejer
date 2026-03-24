import os
import time
import json
import logging
import re
import requests
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from colorama import init, Fore, Style

import config

# Initialize Colors
init(autoreset=True)

# Logger setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_firebase():
    print(f"{Fore.CYAN}Bazada ulanish amalga oshirilmoqda...{Style.RESET_ALL}")
    cert = {
        "type": "service_account",
        "project_id": config.FIREBASE_PROJECT_ID,
        "private_key": config.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
        "client_email": config.FIREBASE_CLIENT_EMAIL,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{config.FIREBASE_CLIENT_EMAIL.replace('@', '%40')}"
    }
    cred = credentials.Certificate(cert)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def init_driver():
    print(f"{Fore.CYAN}Brauzer tayyorlanmoqda... (Marshrut: {config.CHROME_USER_DATA_PATH}){Style.RESET_ALL}")
    options = Options()
    options.add_argument(f"--user-data-dir={config.CHROME_USER_DATA_PATH}")
    options.add_argument(f"--profile-directory={config.CHROME_PROFILE_NAME}")
    options.add_argument("--disable-blink-features=AutomationControlled")
    # Uncomment to run in background (Not recommended for first time if login is needed)
    # options.add_argument("--headless") 
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    # Hide automation flag
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

import re

def scrape_yandex(driver, url):
    print(f"{Fore.YELLOW}Yandex Skaner: {url}{Style.RESET_ALL}")
    driver.get(url)
    time.sleep(6) # Wait for dynamic content
    
    metadata = {
        "shop": "Yandex Market",
        "price": 0,
        "oldPrice": 0,
        "discount": 0,
        "rating": 0,
        "reviews": 0,
        "sold": 0,
        "title": "",
        "brand": "",
        "url": url
    }
    
    try:
        # 1. Title and Brand
        try:
            metadata['title'] = driver.find_element(By.TAG_NAME, "h1").text.strip()
            # Often brand is first word or in separate element
            brand_el = driver.find_elements(By.CSS_SELECTOR, "[data-auto='product-vendor-link'], ._36wPZ")
            if brand_el:
                metadata['brand'] = brand_el[0].text.strip()
        except: pass

        # 2. Price extraction (Current, Old, Discount)
        try:
            price_el = driver.find_element(By.CSS_SELECTOR, "[data-auto='snippet-price-current'], [data-testid='price']")
            price_text = "".join(filter(str.isdigit, price_el.text))
            metadata["price"] = int(price_text) if price_text else 0
            
            try:
                old_price_el = driver.find_element(By.CSS_SELECTOR, "[data-auto='snippet-price-old']")
                old_price_text = "".join(filter(str.isdigit, old_price_el.text))
                metadata["oldPrice"] = int(old_price_text) if old_price_text else 0
                
                discount_el = driver.find_element(By.CSS_SELECTOR, "[data-auto='discount-badge']")
                discount_text = "".join(filter(str.isdigit, discount_el.text))
                metadata["discount"] = int(discount_text) if discount_text else 0
            except: pass
        except: pass

        # 3. Rating & Reviews
        try:
            # Look for rating text e.g. "4.7 (36)"
            rating_container = driver.find_element(By.CSS_SELECTOR, "[data-auto='rating-stars'], ._1_P_X")
            text = rating_container.text
            rating_match = re.search(r'(\d[\.,]\d)', text)
            if rating_match:
                metadata['rating'] = float(rating_match.group(1).replace(',', '.'))
            
            reviews_match = re.search(r'\((\d+)\)', text)
            if reviews_match:
                metadata['reviews'] = int(reviews_match.group(1))
        except: pass

        # 4. Sold Count
        try:
            sold_el = driver.find_element(By.XPATH, "//*[contains(text(), 'купили')]")
            sold_text = "".join(filter(str.isdigit, sold_el.text))
            metadata["sold"] = int(sold_text) if sold_text else 0
        except: pass
            
        print(f"{Fore.GREEN}   ✅ Olingan: {metadata['price']} so'm | {metadata['rating']} ⭐ | {metadata['reviews']} sharh{Style.RESET_ALL}")
        
    except Exception as e:
        print(f"{Fore.RED}   Yandex xatoligi: {str(e)}{Style.RESET_ALL}")
        
    return metadata

def scrape_uzum(driver, url):
    """
    Uzum Market ma'lumotlarini API orqali tezkor olish (brauzersiz)
    """
    print(f"{Fore.MAGENTA}Uzum API Skaner: {url}{Style.RESET_ALL}")
    
    metadata = {
        "shop": "Uzum Market", "price": 0, "oldPrice": 0, "discount": 0,
        "rating": 0, "reviews": 0, "sold": 0, "title": "", "brand": "",
        "url": url, "image": ""
    }
    
    try:
        # Product ID path dan olinadi (oxirgi qism)
        product_id = url.split('/')[-1]
        if '-' in product_id:
            product_id = product_id.split('-')[-1]
        
        api_url = f"https://api.uzum.uz/api/v2/product/{product_id}"
        headers = { 'Accept-Language': 'uz-UZ' }
        
        response = requests.get(api_url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json().get('payload', {}).get('data', {})
            
            metadata['title'] = data.get('title', '')
            metadata['brand'] = data.get('brand', {}).get('title', 'No Brand')
            
            sku = data.get('skuList', [{}])[0]
            metadata['price'] = sku.get('purchasePrice', 0)
            metadata['oldPrice'] = sku.get('fullPrice', 0)
            
            if metadata['oldPrice'] > metadata['price']:
                metadata['discount'] = round((1 - metadata['price']/metadata['oldPrice']) * 100)
            
            metadata['rating'] = data.get('rating', 0.0)
            metadata['reviews'] = data.get('reviewsAmount', 0)
            metadata['sold'] = data.get('ordersAmount', 0)
            
            photos = data.get('photos', [{}])
            if photos: metadata['image'] = photos[0].get('high', '')
                
            print(f"{Fore.GREEN}   ✅ API Muvaffaqiyatli: {metadata['price']} so'm{Style.RESET_ALL}")
            return metadata
            
    except Exception as e:
        print(f"{Fore.RED}   API Skaner xatoligi, Seleniumga qaytish... {str(e)}{Style.RESET_ALL}")

    # Fallback to Selenium (old logic)
    try:
        driver.get(url)
        time.sleep(3)
        price_el = driver.find_element(By.CSS_SELECTOR, ".currency, .price, [data-test-id='text__price']")
        metadata["price"] = int("".join(filter(str.isdigit, price_el.text)))
    except: pass
    
    return metadata

def main():
    print(f"\n{Fore.WHITE}{Style.BRIGHT}=== YANDEX & UZUM MARKET SINXRONIZATORI ==={Style.RESET_ALL}\n")
    
    db = init_firebase()
    driver = None
    
    try:
        products_ref = db.collection(config.COLLECTION_NAME)
        docs = products_ref.stream()
        
        products_to_process = []
        for doc in docs:
            data = doc.to_dict()
            if 'competitors' in data and data['competitors']:
                products_to_process.append({"id": doc.id, "data": data})
        
        if not products_to_process:
            print(f"{Fore.YELLOW}Sinxronlash uchun raqobatchilar topilmadi.{Style.RESET_ALL}")
            return

        print(f"{Fore.CYAN}{len(products_to_process)} ta mahsulot tekshiriladi...{Style.RESET_ALL}")
        driver = init_driver()
        
        for p in products_to_process:
            p_id = p['id']
            p_data = p['data']
            competitors = p_data.get('competitors', [])
            updated_competitors = []
            needs_save = False
            
            print(f"\n{Fore.BLUE}Mahsulot: {p_data.get('category', '')} {p_data.get('brand', '')} {p_data.get('model', '')}{Style.RESET_ALL}")
            
            for comp in competitors:
                url = comp.get('url')
                if not url: continue
                
                new_meta = None
                if 'yandex.uz' in url or 'market.yandex' in url:
                    new_meta = scrape_yandex(driver, url)
                elif 'uzum.uz' in url:
                    new_meta = scrape_uzum(driver, url)
                
                if new_meta:
                    needs_save = True
                    history = comp.get('history', [])
                    old_price = comp.get('price') # Old stored price
                    new_price = new_meta.get('price')
                    
                    if old_price != new_price and new_price > 0:
                        history.insert(0, {
                            "date": datetime.now().isoformat(),
                            "price": new_price
                        })
                    
                    # Merge new metadata into competitor object
                    comp.update(new_meta)
                    comp['history'] = history
                    comp['lastUpdate'] = datetime.now().isoformat()
                    comp['id'] = comp.get('id') or f"c-{int(time.time()*1000)}"
                
                updated_competitors.append(comp)
            
            if needs_save:
                db.collection(config.COLLECTION_NAME).document(p_id).update({
                    "competitors": updated_competitors
                })
                print(f"{Fore.GREEN}   ✅ Firebase'da yangilandi.{Style.RESET_ALL}")
        
        print(f"\n{Fore.YELLOW}Barcha amallar bajarildi!{Style.RESET_ALL}")
        
    except Exception as e:
        print(f"{Fore.RED}Kritik xatolik: {str(e)}{Style.RESET_ALL}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()
