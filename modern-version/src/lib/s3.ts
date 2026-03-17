import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://s3.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_ACCESS_KEY || "",
    secretAccessKey: process.env.YANDEX_SECRET_KEY || "",
  },
});

export const BUCKET_NAME = process.env.BUCKET_NAME || "savdomarketimag";
export const PUBLIC_ENDPOINT = "https://storage.yandexcloud.net";
