import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By

PROFILE_PATH = os.path.join(os.getcwd(), "yandex_user_data")
TEST_URL = "https://market.yandex.uz/product--fen-shchetka-vgr-v-498-pokrytiye-titanovo-turmalinovoye-moshchnost-2000vt-ionizatsiya/4587183409"

def scrape_with_profile():
    print("Connecting via Browser Profile...")
    
    chrome_options = Options()
    # Aynan shu papkadagi hamma ma'lumotlarni yuklaymiz
    chrome_options.add_argument(f"user-data-dir={PROFILE_PATH}")
    chrome_options.add_argument("--profile-directory=Default")
    
    # Renderlash muammosi bo'lmasligi uchun headless o'chirilgan
    # chrome_options.add_argument("--headless=new") 
    
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        print(f"Loading page: {TEST_URL}")
        driver.get(TEST_URL)
        time.sleep(10) # Sahifa yuklanishini kutish

        # Sarlavhani tekshirish
        title = driver.title
        try:
            print(f"Page title: {title}")
        except UnicodeEncodeError:
            print(f"Page title (safe): {title.encode('ascii', 'ignore').decode('ascii')}")

        if "Я не robot" in driver.page_source or "captcha" in driver.current_url:
            print("FAILED: Captcha appeared even with profile. IP might be flagged.")
        else:
            print("SUCCESS! Profile worked, no captcha.")
            
            # Mahsulot ma'lumotlarini qidirish
            try:
                name = driver.find_element(By.TAG_NAME, "h1").text
                try:
                    print(f"Product name: {name}")
                except UnicodeEncodeError:
                    print(f"Product name (safe): {name.encode('ascii', 'ignore').decode('ascii')}")
                print("Price searching...")
            except:
                print("Warning: Page loaded but elements not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Finishing test. Closing browser...")
        driver.quit()

if __name__ == "__main__":
    scrape_with_profile()
