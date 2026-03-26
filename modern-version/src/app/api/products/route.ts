import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data-service';
import { supabase } from '@/lib/supabase';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';
import { productValidation } from '@/lib/validations';

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
  
  const validated = productValidation(data);
  if (!validated.success) {
    throw { message: validated.error.issues.map((e: any) => e.message).join(', '), status: 400 };
  }

  const { id, ...rest } = validated.data;
  let status = rest.status || 'active';

  const brand = (rest.brand || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const model = (rest.model || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const color = (rest.color || '').toString().trim().toLowerCase().replace(/\s+/g, '');

  // Duplicate check using Supabase
  if (brand && model && color) {
    const { data: duplicate } = await supabase
      .from('products')
      .select('id')
      .eq('brand', rest.brand)
      .eq('model', rest.model)
      .eq('color', rest.color)
      .neq('id', id.toString())
      .limit(1)
      .single();

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

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id.toString());

  if (error) throw { message: error.message, status: 500 };

  return { success: true };
});
