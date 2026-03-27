import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { supabase } from '@/lib/supabase';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';
import { productValidation } from '@/lib/validations';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'products';

// FETCH PRODUCTS
export const GET = withGateway(async () => {
  const data = await getProducts();
  return data;
});

// CREATE/UPDATE PRODUCT
export const POST = withGateway(async (req) => {
  const data = await req.json();
  
  // SUPPORT PARTIAL UPDATES: If ID exists, merge with database entry first
  let targetData = data;
  try {
    if (data.id) {
      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('id', data.id.toString())
        .maybeSingle();
      
      if (existing) {
        targetData = { ...existing, ...data };
        // Clean up fields that might have come from S3 and shouldn't be in DB
        delete targetData.local_images;
      }
    }
  } catch (err) {
    console.error("Merge error:", err);
  }

  const validated = productValidation(targetData);
  if (!validated.success) {
    throw { message: validated.error.issues.map((e: any) => e.message).join(', '), status: 400 };
  }

  const { id, ...rest } = validated.data;
  
  // local_images is managed via S3 and built dynamically in data-service.ts
  // We remove it here so we don't store redundant/stale URLs in the database.
  if ('local_images' in rest) {
    delete (rest as any).local_images;
  }

  let status = rest.status || 'active';

  const brand = (rest.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const model = (rest.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const color = (rest.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  // Duplicate check using Supabase
  if (brand && model && color) {
    const { data: duplicate } = await supabase
      .from('products')
      .select('id')
      .eq('brand', (rest.brand || '').toString())
      .eq('model', (rest.model || '').toString())
      .eq('color', (rest.color || '').toString())
      .neq('id', id.toString())
      .limit(1)
      .maybeSingle();

    if (duplicate) status = 'quarantine';
  }

  const { error } = await supabase
    .from('products')
    .upsert({
      id: id.toString(),
      ...rest,
      status,
      updated_at: new Date().toISOString(),
    });

  if (error) throw { message: error.message, status: 500 };

  return { success: true, status };
});

// DELETE PRODUCT
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  // 1. Delete from Database
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id.toString());

  if (error) throw { message: error.message, status: 500 };

  // 2. Cleanup S3 Folder for this product to prevent ID collision issues
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `images/${id}/`
    });
    const { Contents } = await s3Client.send(listCmd);
    
    if (Contents && Contents.length > 0) {
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: Contents.map(c => ({ Key: c.Key! }))
        }
      });
      await s3Client.send(deleteCmd);
      console.log(`Successfully cleaned up S3 folder for product ${id}`);
    }
  } catch (s3Err) {
    console.error("S3 Cleanup Error:", s3Err);
    // We don't throw here as the main record is already deleted
  }

  return { success: true };
});

