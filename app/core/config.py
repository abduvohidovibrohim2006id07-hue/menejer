import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    YANDEX_ACCESS_KEY = os.getenv("YANDEX_ACCESS_KEY")
    YANDEX_SECRET_KEY = os.getenv("YANDEX_SECRET_KEY")
    BUCKET_NAME = os.getenv("BUCKET_NAME", "savdomarketimag")
    S3_ENDPOINT = "https://s3.yandexcloud.net"
    PUBLIC_ENDPOINT = "https://storage.yandexcloud.net"
    FIREBASE_SERVICE_ACCOUNT = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200 MB
