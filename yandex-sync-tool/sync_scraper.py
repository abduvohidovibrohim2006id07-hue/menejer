import time
import json
import logging
import re
import requests
from datetime import datetime
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from colorama import init, Fore, Style

import config

# Initialize Colors
init(autoreset=True)

# Logger setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ================================================================
# SUPABASE ULANISH
# ================================================================
def init_supabase() -> Client:
    print(f"{Fore.CYAN}Supabase bilan ulanish amalga oshirilmoqda...{Style.RESET_ALL}")
    client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
    print(f"{Fore.GREEN}✅ Supabase ulanish muvaffaqiyatli!{Style.RESET_ALL}")
    return client


# ================================================================
# CHROME DRIVER
# ================================================================
def init_driver():
    print(f"{Fore.CYAN}Brauzer tayyorlanmoqda... (Orqa fonda){Style.RESET_ALL}")
    options = Options()
    options.add_argument(f"--user-data-dir={config.CHROME_USER_DATA_PATH}")
    options.add_argument(f"--profile-directory={config.CHROME_PROFILE_NAME}")
    options.add_argument("--disable-blink-features=AutomationControlled")
    # Yandex Headless rejimni bot deb atadi, shuning uchun oynani ekrandan tashqariga yashiramiz
    options.add_argument("--window-position=-32000,-32000") 
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver


# ================================================================
# YANDEX MARKET SCRAPER (Selenium + do'kon nomi)
# ================================================================
def scrape_yandex(driver, url):
    print(f"{Fore.YELLOW}Yandex Skaner: {url}{Style.RESET_ALL}")
    driver.get(url)
    time.sleep(6)  # Dinamik kontent yuklanishini kutish

    metadata = {
        "shop":     "Yandex Market",
        "price":    0,
        "oldPrice": 0,
        "discount": 0,
        "rating":   0,
        "reviews":  0,
        "sold":     0,
        "title":    "",
        "brand":    "",
        "seller":   {"title": "", "rating": 0},  # ← Do'kon nomi
        "url":      url
    }

    try:
        # 1. Sarlavha
        try:
            metadata['title'] = driver.find_element(By.TAG_NAME, "h1").text.strip()
        except:
            pass

        # 2. Brend
        try:
            brand_el = driver.find_elements(By.CSS_SELECTOR,
                "[data-auto='product-vendor-link'], ._36wPZ, [data-baobab-name='vendor']")
            if brand_el:
                metadata['brand'] = brand_el[0].text.strip()
        except:
            pass

        # 3. Narx (hozirgi va eski)
        try:
            price_el = driver.find_element(By.CSS_SELECTOR,
                "[data-auto='snippet-price-current'], [data-testid='price'], "
                "span[data-auto='price-value']")
            price_text = "".join(filter(str.isdigit, price_el.text))
            metadata["price"] = int(price_text) if price_text else 0
        except:
            pass

        try:
            old_el = driver.find_element(By.CSS_SELECTOR, "[data-auto='snippet-price-old']")
            old_text = "".join(filter(str.isdigit, old_el.text))
            metadata["oldPrice"] = int(old_text) if old_text else 0
        except:
            pass

        try:
            disc_el = driver.find_element(By.CSS_SELECTOR, "[data-auto='discount-badge']")
            disc_text = "".join(filter(str.isdigit, disc_el.text))
            metadata["discount"] = int(disc_text) if disc_text else 0
        except:
            pass

        # 4. Reyting va sharhlar
        try:
            rating_el = driver.find_element(By.CSS_SELECTOR,
                "[data-auto='rating-stars'], ._1_P_X, [data-zone-name='rating']")
            text = rating_el.text
            rm = re.search(r'(\d[\.,]\d)', text)
            if rm:
                metadata['rating'] = float(rm.group(1).replace(',', '.'))
            rvm = re.search(r'\((\d+)\)', text)
            if rvm:
                metadata['reviews'] = int(rvm.group(1))
        except:
            pass

        # 5. Sotilgan soni
        try:
            # Oldin elementlardan qidiradi
            sold_els = driver.find_elements(By.XPATH, "//*[contains(text(), 'купили')]")
            for el in sold_els:
                text = el.text.strip()
                rm = re.search(r'(\d[\d\s]*)\s*купили', text, re.IGNORECASE)
                if rm:
                    val = int("".join(filter(str.isdigit, rm.group(1))))
                    if val > 0:
                        metadata["sold"] = val
                        break
            
            # Agar chiqmasa, butun html dagi JSON / Meta dan Regex qilib "21 купили" ni qidiradi (Siz topgan usul!)
            if metadata["sold"] == 0:
                html = driver.page_source
                rm = re.search(r'(\d[\d\s\xa0]*)\s*купили', html, re.IGNORECASE)
                if rm:
                    metadata["sold"] = int("".join(filter(str.isdigit, rm.group(1))))
        except:
            pass

        # 6. DO'KON NOMI (seller title) ← KUCHAYTIRILDI
        try:
            # 1. XPath orqali "Продавец" yko "Магазин" matni atrofidagi havolalarni qidirish
            shop_xpaths = [
                "//*[contains(text(), 'Магазин') and contains(text(), '★')]/preceding-sibling::*[1]",
                "//*[contains(text(), 'Магазин') and contains(text(), 'оценка')]/preceding-sibling::*[1]",
                "//*[contains(text(), 'Магазин')]/ancestor::div[2]//h3",
                "//span[contains(text(), 'Продавец')]/parent::*/following-sibling::*//a",
                "//div[contains(text(), 'Продавец')]/following-sibling::*//a",
                "//*[contains(text(), 'Продавец')]/parent::div/following-sibling::div//span",
                "//a[contains(@href, '/business-info') or contains(@href, '/shop/')]",
                "//div[@data-auto='seller-info']//a",
                "//*[contains(@data-auto, 'seller')]//*[contains(@class, 'Text')]"
            ]
            
            for xp in shop_xpaths:
                try:
                    el = driver.find_element(By.XPATH, xp)
                    text = el.text.strip()
                    # Keraksiz (tasodifiy) Yandex tugmalar matnlarini ro'yxatdan o'tkazmaslik:
                    excludes = ['о магазине', 'отзывы', 'продавец', 'поделиться', 'в избранное', 'характеристики', 'описание', 'в корзину', 'купить', 'все характеристики']
                    
                    if text and len(text) > 1 and text.lower() not in excludes:
                        metadata['seller']['title'] = text
                        print(f"{Fore.CYAN}   🏪 Do'kon (XPath): {text}{Style.RESET_ALL}")
                        break
                except:
                    continue

            # 2. Agar topilmasa, CSS selectorlarni sinash
            if not metadata['seller']['title']:
                shop_selectors = [
                    "[data-auto='seller-info'] span",
                    "[data-zone-name='shopName']",
                    "a[data-auto='seller-link']",
                    "[data-baobab-name='shopName']"
                ]
                for sel in shop_selectors:
                    try:
                        el = driver.find_element(By.CSS_SELECTOR, sel)
                        text = el.text.strip()
                        if text and len(text) > 1:
                            metadata['seller']['title'] = text
                            print(f"{Fore.CYAN}   🏪 Do'kon (CSS): {text}{Style.RESET_ALL}")
                            break
                    except:
                        continue

            # Fallback: JavaScript orqali __NEXT_DATA__ dan olish
            if not metadata['seller']['title']:
                try:
                    raw = driver.execute_script(
                        "return document.getElementById('__NEXT_DATA__')?.textContent"
                    )
                    if raw:
                        nd = json.loads(raw)
                        # Turli JSON yo'llari
                        for path in [
                            ['props', 'pageProps', 'offers', 0, 'supplier', 'name'],
                            ['props', 'pageProps', 'product', 'vendor', 'name'],
                        ]:
                            try:
                                val = nd
                                for key in path:
                                    val = val[key]
                                if val:
                                    metadata['seller']['title'] = str(val)
                                    print(f"{Fore.CYAN}   🏪 Do'kon (JS): {val}{Style.RESET_ALL}")
                                    break
                            except:
                                continue
                except:
                    pass
                    
            # 3. Va nihoyat ajoyib yechim: HTML <title> yoki <meta> dan qidirish
            if not metadata['seller']['title']:
                try:
                    # Sahifa sarlavhasi (Buy in online store X on Market)
                    page_text = driver.title
                    
                    # Agar title da topilmasa, Meta description ni ham olib ko'ramiz
                    if 'интернет-магазин' not in page_text.lower():
                        meta_el = driver.find_element(By.XPATH, "//meta[@name='description']")
                        page_text = meta_el.get_attribute("content")
                        
                    # Regex formula: "интернет-магазине [NOMI] на Market" 
                    match = re.search(r'интернет-магазине\s+(.*?)\s+на\s+Market', page_text, re.IGNORECASE)
                    if match:
                        text = match.group(1).strip()
                        metadata['seller']['title'] = text
                        print(f"{Fore.CYAN}   🏪 Do'kon (Matn): {text}{Style.RESET_ALL}")
                except Exception as e:
                    pass

        except Exception as e:
            print(f"{Fore.YELLOW}   ⚠️  Do'kon nomi topilmadi: {e}{Style.RESET_ALL}")

        print(f"{Fore.GREEN}   ✅ Yandex: {metadata['price']} so'm | "
              f"{metadata['rating']} ⭐ | {metadata['reviews']} sharh | "
              f"🏪 {metadata['seller']['title'] or 'Noma`lum'}{Style.RESET_ALL}")

    except Exception as e:
        print(f"{Fore.RED}   Yandex xatoligi: {str(e)}{Style.RESET_ALL}")

    return metadata


# ================================================================
# UZUM MARKET SCRAPER (API + do'kon nomi)
# ================================================================
def scrape_uzum(driver, url):
    print(f"{Fore.MAGENTA}Uzum API Skaner: {url}{Style.RESET_ALL}")

    metadata = {
        "shop":     "Uzum Market",
        "price":    0,
        "oldPrice": 0,
        "discount": 0,
        "rating":   0.0,
        "reviews":  0,
        "sold":     0,
        "title":    "",
        "brand":    "",
        "seller":   {"title": "", "rating": 0},  # ← Do'kon nomi
        "url":      url,
        "image":    ""
    }

    try:
        # Product ID ni URL'dan ajratish
        product_id = url.split('?')[0].rstrip('/').split('/')[-1]
        if '-' in product_id:
            product_id = product_id.split('-')[-1]

        api_url = f"https://api.uzum.uz/api/v2/product/{product_id}"
        headers = {
            'Accept-Language': 'uz-UZ',
            'x-authorization': 'Basic dXp1bS1tYXJrZXQ6Ym96YXItYXBpLXNlY3JldA==',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        }

        response = requests.get(api_url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json().get('payload', {}).get('data', {})

            metadata['title'] = data.get('title', '')
            metadata['brand'] = data.get('brand', {}).get('title', 'No Brand') if data.get('brand') else 'No Brand'

            sku_list = data.get('skuList') or [{}]
            target_sku = sku_list[0]
            
            # Agar URL'da aniq bir xil (rang/razmer) ni ko'rsatuvchi skuId bo'lsa
            sku_match = re.search(r'skuid=(\d+)', url, re.IGNORECASE)
            if sku_match:
                sku_id = sku_match.group(1)
                for s in sku_list:
                    if str(s.get('id')) == sku_id:
                        target_sku = s
                        break

            metadata['price']    = target_sku.get('purchasePrice', 0)
            metadata['oldPrice'] = target_sku.get('fullPrice', 0)

            if metadata['oldPrice'] > metadata['price'] > 0:
                metadata['discount'] = round((1 - metadata['price'] / metadata['oldPrice']) * 100)

            metadata['rating']  = data.get('rating', 0.0)
            metadata['reviews'] = data.get('reviewsAmount', 0)
            metadata['sold']    = data.get('ordersAmount', 0)

            # Rasm
            photos = data.get('photos') or []
            if photos:
                photo_idx = 0
                chars = target_sku.get('characteristics') or []
                if chars and 'valueIndex' in chars[0]:
                    photo_idx = chars[0]['valueIndex']
                
                if photo_idx >= len(photos):
                    photo_idx = 0

                pk = photos[photo_idx].get('photoKey', '')
                if not pk:
                    pk = photos[0].get('photoKey', '')
                
                metadata['image'] = f"https://images.uzum.uz/{pk}/original.jpg" if pk else ''

            # DO'KON NOMI (seller) ← YANGI
            seller_data = data.get('seller') or {}
            seller_name = seller_data.get('title', '') or seller_data.get('name', '')
            metadata['seller']['title']  = seller_name
            metadata['seller']['rating'] = seller_data.get('rating', 0)

            print(f"{Fore.GREEN}   ✅ Uzum API: {metadata['price']} so'm | "
                  f"{metadata['sold']} zakaz | "
                  f"🏪 {seller_name or 'Noma`lum'}{Style.RESET_ALL}")
            return metadata

    except Exception as e:
        print(f"{Fore.RED}   API xatoligi, Seleniumga qaytish... {str(e)}{Style.RESET_ALL}")

    # Fallback: Selenium
    try:
        driver.get(url)
        time.sleep(3)
        price_el = driver.find_element(By.CSS_SELECTOR,
            ".currency, .price, [data-test-id='text__price']")
        metadata["price"] = int("".join(filter(str.isdigit, price_el.text)))
    except:
        pass

    return metadata


# ================================================================
# ASOSIY FUNKSIYA
# ================================================================
def main():
    print(f"\n{Fore.WHITE}{Style.BRIGHT}=== YANDEX & UZUM MARKET → SUPABASE SINXRONIZATORI ==={Style.RESET_ALL}\n")

    supabase = init_supabase()
    driver = None

    try:
        # Supabase'dan raqobatchilari bor mahsulotlarni olish
        result = supabase.table("products").select("id, category, brand, model, competitors").execute()
        all_products = result.data or []

        products_to_process = [
            p for p in all_products
            if p.get('competitors') and len(p['competitors']) > 0
        ]

        if not products_to_process:
            print(f"{Fore.YELLOW}Sinxronlash uchun raqobatchilar topilmadi.{Style.RESET_ALL}")
            return

        print(f"{Fore.CYAN}{len(products_to_process)} ta mahsulot tekshiriladi...{Style.RESET_ALL}")

        # Chrome faqat Yandex bo'lsa kerak
        has_yandex = any(
            'yandex' in (c.get('url', '') or '')
            for p in products_to_process
            for c in (p.get('competitors') or [])
        )
        if has_yandex:
            driver = init_driver()

        for p in products_to_process:
            p_id        = p['id']
            competitors = p.get('competitors') or []
            updated     = []
            needs_save  = False

            print(f"\n{Fore.BLUE}📦 Mahsulot: {p.get('category','')} "
                  f"{p.get('brand','')} {p.get('model','')}{Style.RESET_ALL}")

            for comp in competitors:
                url = comp.get('url', '')
                if not url:
                    updated.append(comp)
                    continue

                new_meta = None
                if 'yandex' in url and driver:
                    new_meta = scrape_yandex(driver, url)
                elif 'uzum.uz' in url:
                    new_meta = scrape_uzum(driver, url)

                if new_meta:
                    needs_save  = True
                    history     = comp.get('history') or []
                    old_price   = (comp.get('metadata') or {}).get('price') or comp.get('price')
                    new_price   = new_meta.get('price', 0)

                    if new_price > 0 and old_price != new_price:
                        history.insert(0, {
                            "date":  datetime.now().isoformat(),
                            "price": new_price
                        })

                    # metadata obyektiga yozish (CompetitorsModal format)
                    comp['metadata'] = {
                        "title":        new_meta.get('title'),
                        "price":        new_meta.get('price'),
                        "oldPrice":     new_meta.get('oldPrice'),
                        "fullPrice":    new_meta.get('oldPrice'),
                        "discount":     new_meta.get('discount'),
                        "rating":       new_meta.get('rating'),
                        "reviewsAmount": new_meta.get('reviews'),
                        "sold":         new_meta.get('sold'),
                        "ordersAmount": new_meta.get('sold'),
                        "shop":         new_meta.get('shop'),
                        "brand":        new_meta.get('brand'),
                        "image":        new_meta.get('image'),
                        "seller":       new_meta.get('seller', {"title": "", "rating": 0}),
                    }
                    comp['history']    = history
                    comp['lastUpdate'] = datetime.now().isoformat()
                    comp['id']         = comp.get('id') or f"c-{int(time.time()*1000)}"

                updated.append(comp)

            if needs_save:
                supabase.table("products").update(
                    {"competitors": updated}
                ).eq("id", p_id).execute()
                print(f"{Fore.GREEN}   ✅ Supabase'da yangilandi → mahsulot #{p_id}{Style.RESET_ALL}")

        print(f"\n{Fore.YELLOW}🎉 Barcha amallar bajarildi!{Style.RESET_ALL}")

    except Exception as e:
        print(f"{Fore.RED}Kritik xatolik: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    while True:
        try:
            main()
        except KeyboardInterrupt:
            print(f"\n{Fore.RED}Dastur foydalanuvchi tomonidan to'xtatildi.{Style.RESET_ALL}")
            break
        except Exception as e:
            print(f"{Fore.RED}Kutilmagan xatolik: {e}{Style.RESET_ALL}")
            
        interval = getattr(config, 'SYNC_INTERVAL_MINUTES', 60)
        print(f"\n{Fore.CYAN}⏳ Keyingi sinxronizatsiya {interval} daqiqadan so'ng... (To'xtatish uchun Ctrl+C bosing){Style.RESET_ALL}")
        time.sleep(interval * 60)
