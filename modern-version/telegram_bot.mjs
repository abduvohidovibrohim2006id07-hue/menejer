import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Firebase Admin initialization
if (!admin.apps.length) {
  admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
  });
}
const db = admin.firestore();

// S3 initialization (Yandex)
const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
      accessKeyId: process.env.YANDEX_ACCESS_KEY,
      secretAccessKey: process.env.YANDEX_SECRET_KEY,
  },
});
const BUCKET_NAME = process.env.BUCKET_NAME;

const TELEGRAM_TOKEN = '8745137868:AAGJIc2uR0ts9TMSy9wv2YYSZTADsbs0Edc';
const ALLOWED_USER_ID = 5572037414;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// GROQ API Config
const GROQ_API_KEY = process.env.GROQ_API_KEY;

let mediaGroups = {}; // Stores images coming in the same media group

bot.on('message', async (msg) => {
    // SECURITY Check
    if (msg.from.id !== ALLOWED_USER_ID) {
        return; // Ignore silently
    }

    // Media group check
    if (msg.media_group_id) {
        if (!mediaGroups[msg.media_group_id]) {
           mediaGroups[msg.media_group_id] = { photos: [], text: '', msgs: [], timer: null };
        }
        
        const group = mediaGroups[msg.media_group_id];
        group.msgs.push(msg);
        
        if (msg.caption) {
            group.text += msg.caption + '\n';
        }
        
        if (msg.photo) {
            // Get the highest resolution photo
            const photo = msg.photo[msg.photo.length - 1];
            group.photos.push(photo.file_id);
        }

        clearTimeout(group.timer);
        group.timer = setTimeout(() => {
            processMediaGroup(msg.media_group_id, msg.chat.id);
        }, 3000);

        return;
    }

    // Single image case
    if (msg.photo || msg.text) {
        const text = msg.caption || msg.text || '';
        const photos = msg.photo ? [msg.photo[msg.photo.length - 1].file_id] : [];
        await processData(msg.chat.id, text, photos);
    }
});

async function processMediaGroup(groupId, chatId) {
    const group = mediaGroups[groupId];
    delete mediaGroups[groupId];
    await processData(chatId, group.text, group.photos);
}

async function processData(chatId, text, photos) {
    bot.sendMessage(chatId, "⏳ Qabul qilindi! AI ma'lumotlarni tahlil qilmoqda...");

    try {
        let downloadedFiles = [];

        // 1. Download all photos
        for(let fileId of photos) {
            const fileLink = await bot.getFileLink(fileId);
            const response = await fetch(fileLink);
            const buffer = await response.arrayBuffer();
            downloadedFiles.push(Buffer.from(buffer));
        }

        // 2. Call AI
        let name = "No'malum", brand = "", model = "", price = "0", old_price = "0";
        if (text) {
             const aiPrompt = `Siz malakali e-commerce ma'lumot tahlilchisisiz. Qabul qilingan matn: "${text}".\n
Ushbu matndan mahsulotning:
1. Nomi (qisqa, tushunarli)
2. Brendi (Brand, agar mavjud bo'lmasa bo'sh)
3. Modeli (Model, agar mavjud bo'lmasa bo'sh)
4. Yangi narxi (faqat raqamlar, masalan matndan 600.000 so'm bo'lsa natija 600000 bo'lsin)
5. Eski narxi (agar bor bo'lsa, xuddi shunday faqat raqam, yo'q bo'lsa 0)
faqat quyidagi JSON formatida qaytaring, boshqa hech qanday izoh va matnsiz:
{ "name": "...", "brand": "...", "model": "...", "price": "...", "old_price": "..." }`;

            const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [ { role: 'user', content: aiPrompt } ],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                })
            });
            const data = await aiResponse.json();
            const resultText = data.choices[0]?.message?.content || "{}";
            try {
                const parsed = JSON.parse(resultText);
                name = parsed.name || text.substring(0, 30);
                brand = parsed.brand || "";
                model = parsed.model || "";
                price = (parsed.price || "0").toString().replace(/\D/g, '');
                old_price = (parsed.old_price || "0").toString().replace(/\D/g, '');
            } catch(e) {
                console.error("JSON Error:", e);
                name = text.substring(0, 30);
            }
        } else {
             name = "Rasmli mahsulot";
        }

        // 3. Create Product in Firebase (Status: karantin)
        const newProductRef = db.collection('products').doc();
        const productId = newProductRef.id;

        const productData = {
           name_uz: name,
           name_ru: name,
           brand: brand.toLowerCase(),
           model: model.toLowerCase(),
           price: parseFloat(price) || 0,
           old_price: parseFloat(old_price) || 0,
           description_uz: text,
           description_ru: text,
           status: 'quarantine',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           created_by_bot: true
        };

        await newProductRef.set(productData);

        // 4. Upload Photos to S3
        if (photos.length > 0) {
            bot.sendMessage(chatId, `🧠 AI tahlili tugadi. Nomi: ${name}\n☁️ S3 ga ${photos.length} ta rasm yuklanmoqda...`);

            for(let i=0; i < downloadedFiles.length; i++) {
                const fileBuffer = downloadedFiles[i];
                const fileKey = `images/${productId}/image_${i+1}.jpg`;
                
                const command = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: fileKey,
                    Body: fileBuffer,
                    ContentType: 'image/jpeg',
                });
                
                await s3Client.send(command);
            }
        }

        bot.sendMessage(chatId, `✅ Mahsulot muvaffaqiyatli saqlandi!\n\n🏷 Nomi: ${name}\nID: ${productId}\n🟢 Status: Karantin.\n\nEndi admin paneldan uni tekshirib saytga chiqarishingiz mumkin.`);

    } catch (err) {
        console.error("Xatolik yuz berdi:", err);
        bot.sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
    }
}

console.log("Photomenejer Bot ishga tushdi... Terminalni yopmang!");
