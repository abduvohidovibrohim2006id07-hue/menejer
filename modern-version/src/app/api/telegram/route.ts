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

        // Oddiy 'salom' kabi yozuvlarga javob qaytarish, ularni maxsulot sifatida saqlamaslik
        if (photos.length === 0 && text.trim().length <= 15) {
            await sendMessage(chatId, "Iltimos rasm va batafsilroq mahsulot ma'lumotlarini (narx, brend, nomi) yuboring.");
            return NextResponse.json({ ok: true });
        }

        // Hozirgi Serverless (Vercel) cheklovlari doirasida Media Group (bir nechta rasm) 
        // bilan ishlash qiyinroq, chunki har bir rasm alohida xabar bo'lib keladi.
        // Hozir har bir xabarni alohida bitta rasmli / matnli sifatida qabul qilamiz.
        if (photos.length > 0 || text.length > 0) {
            // Javobni darhol qaytarib yubormaslik muammosi bor (Next.js Serverless), 
            // Vercel kutib turishi uchun await qilamiz.
            
            await sendMessage(chatId, "⏳ Ma'lumot qabul qilindi! AI uni Vercel serverlarida tahlil qilmoqda...");

            let downloadedFiles: Array<Buffer> = [];

            // Rasmlarni Telegram serveridan yuklab olish
            for(let fileId of photos) {
                const url = await getFileUrl(fileId);
                if (url) {
                    const response = await fetch(url);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    downloadedFiles.push(buffer);
                }
            }

            // AI orqali tahlil
            let name = "No'malum", brand = "", model = "", price = "0", old_price = "0";
            if (text) {
                const aiPrompt = `Siz e-commerce tahlilchisisiz. Matn: "${text}".\nMahsulot ma'lumotlarini qisqa qilib JSON formatida qaytaring:\n{ "name": "...", "brand": "...", "model": "...", "price": "...", "old_price": "..." }`;
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
                    brand = parsed.brand || "";
                    model = parsed.model || "";
                    price = (parsed.price || "0").toString().replace(/\D/g, '');
                    old_price = (parsed.old_price || "0").toString().replace(/\D/g, '');
                } catch(e) { name = text.substring(0, 30); }
            } else {
                name = "Rasmli mahsulot";
            }

            // Bazaga saqlash
            const newProductRef = db.collection('products').doc();
            const productId = newProductRef.id;

            await newProductRef.set({
               name_uz: name, name_ru: name,
               brand: brand.toLowerCase(), model: model.toLowerCase(),
               price: parseFloat(price) || 0, old_price: parseFloat(old_price) || 0,
               description_uz: text, description_ru: text,
               status: 'quarantine',
               created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
               created_by_bot: true,
               media_group_id: msg.media_group_id || null // Birlashtirish uchun belgi
            });

            // S3 Yandex ga saqlash
            if (photos.length > 0) {
                for(let i=0; i < downloadedFiles.length; i++) {
                    const fileKey = `images/${productId}/image_${i+1}.jpg`;
                    await s3Client.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME, Key: fileKey, Body: downloadedFiles[i], ContentType: 'image/jpeg',
                    }));
                }
            }

            await sendMessage(chatId, `✅ Vercel serverlarida saqlandi!\n\n🏷 Nomi: ${name}\nID: ${productId}\n🟢 Status: Karantin.`);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Webhook Xatosi:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
