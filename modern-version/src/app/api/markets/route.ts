import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'markets';

// FETCH MARKETS
export const GET = withGateway(async () => {
  const cached = getCache(CACHE_KEY, TTL.MARKETS);
  if (cached) return cached;

  const { data: markets, error } = await supabase
    .from('markets')
    .select('*')
    .order('id');

  if (error) throw { message: error.message, status: 500 };

  setCache(CACHE_KEY, markets);
  return markets;
});

// CREATE/UPDATE MARKET
export const POST = withGateway(async (req) => {
  const data = await req.json();
  const { id, ...rest } = data;

  if (!id) throw { message: 'ID (slug) majburiy', status: 400 };

  const { error } = await supabase
    .from('markets')
    .upsert({
      id: id.toString(),
      ...rest,
      updated_at: new Date().toISOString(),
    });

  if (error) throw { message: error.message, status: 500 };

  invalidateCache(CACHE_KEY);
  return { success: true };
});

// DELETE MARKET
export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID majburiy', status: 400 };

  const { error } = await supabase
    .from('markets')
    .delete()
    .eq('id', id.toString());

  if (error) throw { message: error.message, status: 500 };

  invalidateCache(CACHE_KEY);
  return { success: true };
});
