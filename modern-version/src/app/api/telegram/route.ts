import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Vercel Serverless Function uchun maksimal vaqtni uzaytirish (Pro ta'rif bo'lsa 60 sek, bepulda odatda 10-15 sek)
export const maxDuration = 60; 

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8745137868:AAGJIc2uR0ts9TMSy9wv2YYSZTADsbs0Edc';
const ALLOWED_USER_ID = 5572037414;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Telegram API ga so'rov yuborish uchun yordamchi funksiya
async function sendMessage(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}

async function getFileUrl(fileId: string) {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (!data.ok) return null;
    return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`;
}

export async function POST(req: Request) {
    try {
        const update = await req.json();

        // Agar bu xabar bo'lmasa, uni o'tkazib yuboramiz
        if (!update.message) return NextResponse.json({ ok: true });

        const msg = update.message;
        const chatId = msg.chat.id;

        // Xavfsizlik: Faqat siz ishlatishingiz uchun
        if (msg.from.id !== ALLOWED_USER_ID) {
            return NextResponse.json({ ok: true });
        }

        const text = msg.caption || msg.text || '';
        
        if (text === '/start') {
            await sendMessage(chatId, "Assalomu alaykum! Menga rasm va mahsulot ma'lumotlarini yuboring. Men ularni qabul qilib olaman.");
            return NextResponse.json({ ok: true });
        }

        const photos = msg.photo ? [msg.photo[msg.photo.length - 1].file_id] : [];
        const mediaGroupId = msg.media_group_id || null;
        
        // Oddiy 'salom' kabi yozuvlarga javob qaytarish
        if (photos.length === 0 && text.trim().length <= 15) {
            await sendMessage(chatId, "Iltimos rasm va batafsilroq mahsulot ma'lumotlarini (narx, brend, nomi) yuboring.");
            return NextResponse.json({ ok: true });
        }

        // 1. PRODUCT ID NIKLASH: Media group kelsa id bir xil bo'ladi, aks holda yangi
        const productId = mediaGroupId || db.collection('products').doc().id;

        // 2. RASM YUKLASH (Har bir so'rov kirib kelgan o'zining rasmini yuklaydi)
        if (photos.length > 0) {
            const url = await getFileUrl(photos[0]);
            if (url) {
                const response = await fetch(url);
                const fileBuffer = Buffer.from(await response.arrayBuffer());
                
                // Random ism beramiz, sababi parallel kelganda ustiga yozmasligi uchun
                const fileKey = `images/${productId}/image_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME, 
                    Key: fileKey, 
                    Body: fileBuffer, 
                    ContentType: 'image/jpeg',
                }));
            }
        }

        // 3. AI TAHLIL VA BAZAGA YOZISH: 
        // Telegram Media Group da rasm 10 ta kelsa 10 ta zapros yuboradi. Ammo matn faqatgina 1 tasida (yoki birinchisida) bo'ladi.
        // Biz faqat Matnli qism kelganida yoki Yakka (media_group siz) kelganidagina AI ni ishlatamiz! Bo'sh xabarlar (qo'shimcha rasmlar) ohista yopiladi.
        if (text.trim().length > 0 || !mediaGroupId) {
            await sendMessage(chatId, "⏳ AI mahsulotni ro'yxatga olmoqda...");

            let name = "Rasmli mahsulot", brand = "", model = "", price = 0, old_price = 0;
            
            if (text) {
                const aiPrompt = `Siz e-commerce tahlilchisisiz. Matn: "${text}".
Mahsulot ma'lumotlarini JSON qilib qaytaring: { "name": "...", "brand": "...", "model": "...", "price": 0, "old_price": 0 }
QOIDALAR:
1. "price" va "old_price" qismi FAQAT va FAQAT raqam ko'rinishida bo'lsin.
2. Agar "850min", "850 ming" bo'lsa -> 850000 raqamiga aylantirib yozing! M: 850min = 850000.
3. Agar "85$", "$85" bo'lsa dollarni 12500 so'm kursiga ko'paytirib, Sum qilib yozing! M: 85*12500 = 1062500.
4. Agar umuman narx ko'rsatilmagan bo'lsa 0 qaytaring.
5. "name" (Nomi) qat'iy ravishda O'ZBEK tilida olingan (Lotin alifbosida) bo'lishi shart, Rus tilida emas!
6. "brand" va "model" qiymatlari BARCHA HARFLARI KATTA bilan (UPPERCASE) yozilishi shart (masalan: MAC STYLER).`;

                const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [ { role: 'user', content: aiPrompt } ],
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    })
                });
                
                const aiData = await aiResponse.json();
                const resultText = aiData.choices?.[0]?.message?.content || "{}";
                try {
                    const parsed = JSON.parse(resultText);
                    name = parsed.name || text.substring(0, 30);
                    brand = (parsed.brand || "").toUpperCase();
                    model = (parsed.model || "").toUpperCase();
                    // Toza raqam olamiz (faqat \d)
                    price = parseInt((parsed.price || "0").toString().replace(/\D/g, '')) || 0;
                    old_price = parseInt((parsed.old_price || "0").toString().replace(/\D/g, '')) || 0;
                } catch(e) { name = text.substring(0, 30); }
            }

            // Bazaga Saqlaymiz yoki Qo'shib qoyamiz (merge: true)
            await db.collection('products').doc(productId).set({
               name: name, name_ru: name,
               brand: brand, model: model,
               price: price, old_price: old_price,
               description_uz: text, description_ru: text,
               status: 'quarantine',
               updated_at: new Date().toISOString(),
               created_by_bot: true,
               media_group_id: mediaGroupId
            }, { merge: true });

            await sendMessage(chatId, `✅ Vercel orqali saqlandi!\n\n🏷 Nomi: ${name}\n💰 Narx: ${price.toLocaleString()} so'm\nID: ${productId}`);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Webhook Xatosi:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
