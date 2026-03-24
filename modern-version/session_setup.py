import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Profil saqlanadigan papka
PROFILE_PATH = os.path.join(os.getcwd(), "yandex_user_data")

def setup_session():
    print("🚀 Yandex Sessiya Sozlash Boshlandi...")
    
    if not os.path.exists(PROFILE_PATH):
        os.makedirs(PROFILE_PATH)

    chrome_options = Options()
    chrome_options.add_argument(f"user-data-dir={PROFILE_PATH}")
    chrome_options.add_argument("--profile-directory=Default")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Automation detectionni chetlab o'tish
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    try:
        print("\n🌐 1. Yandex Marketga (market.yandex.uz) kiring, login qiling va Capchani (☑️) yeching.")
        driver.get("https://market.yandex.uz/")
        
        print("\n⏳ Diqqat: Hammasini bajarib bo'lgach (Yandex ochiq turgan holda), ushbu terminalga qayting.")
        print("💡 Tayyor bo'lsangiz, terminalda 'ENTER' tugmasini bosing.")
        input(">>> Tayyormisiz? (Matnni chiqarish uchun ENTER bosing):")
        
        # Brauzerdan cookie-larni o'qish
        all_cookies = driver.get_cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in all_cookies])
        
        print("\n" + "="*80)
        print("📋 VERCEL UCHUN 'YANDEX_COOKIE' QIYMATI (NUSXALAB OLING):")
        print("="*80)
        print(f"\n{cookie_str}\n")
        print("="*80)
        
        print("\n✅ Matnni nusxaladingizmi? Brauzer 10 soniyadan so'ng yopiladi.")
        time.sleep(10)
        
    except Exception as e:
        print(f"❌ Xatolik: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass

if __name__ == "__main__":
    setup_session()
