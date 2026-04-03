import os

# ================================================================
# SUPABASE CONFIGURATION
# ================================================================
SUPABASE_URL      = "https://wozbwzpdktryvjslpqse.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your-secret-key-here")

# ================================================================
# BROWSER PROFILE CONFIGURATION (Yandex Market uchun Chrome)
# ================================================================
CHROME_USER_DATA_PATH = r"C:\Users\abduv\Desktop\cdvfd\yandex-sync-tool\yandex_user_data"
CHROME_PROFILE_NAME   = "Default"

# ================================================================
# SYNC CONFIGURATION
# ================================================================
# Dastur necha minutda bir marta avtomatik tekshiruv (sinxronizatsiya) qilishini belgilaydi
SYNC_INTERVAL_MINUTES = 60
