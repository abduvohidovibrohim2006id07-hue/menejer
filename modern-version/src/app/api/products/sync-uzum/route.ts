import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { productId, bearerToken, shopId, categoryId } = await req.json();

    if (!productId || !bearerToken || !shopId) {
       return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // WORKER URL (To be updated after deploying to Render/Koyeb)
    const WORKER_URL = process.env.UZUM_WORKER_URL || 'http://localhost:3001';
    const WORKER_SECRET = process.env.WORKER_SECRET || 'uzum_worker_super_secret';

    // Trigger the worker without waiting for long processing
    // We use a shorter timeout here because the worker responds immediately
    const response = await axios.post(`${WORKER_URL}/api/upload-to-uzum`, {
      productId,
      bearerToken,
      shopId,
      categoryId,
      secret: WORKER_SECRET
    }, { timeout: 5000 });

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error("Worker trigger error:", error.response?.data || error.message);
    return NextResponse.json({ 
       error: "Worker trigger failed", 
       details: error.response?.data || error.message 
    }, { status: 500 });
  }
}
