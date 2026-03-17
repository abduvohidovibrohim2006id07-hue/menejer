import boto3
from .config import Config

class S3Client:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            try:
                cls._client = boto3.client(
                    "s3",
                    aws_access_key_id=Config.YANDEX_ACCESS_KEY,
                    aws_secret_access_key=Config.YANDEX_SECRET_KEY,
                    endpoint_url=Config.S3_ENDPOINT
                )
                # Test connection
                cls._client.list_buckets()
                print("S3 (Yandex Cloud) successfully connected.")
            except Exception as e:
                print(f"CRITICAL: S3 connection failed: {e}")
                # We return the client object anyway, but operations will fail later
                # Or we can handle it more gracefully
        return cls._client

    @classmethod
    def get_public_url(cls, key):
        return f"{Config.PUBLIC_ENDPOINT}/{Config.BUCKET_NAME}/{key}"
