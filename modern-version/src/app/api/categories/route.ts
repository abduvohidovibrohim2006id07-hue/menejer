import { supabase } from '@/lib/supabase';
import { withGateway } from '@/lib/api-gateway';
import { getCache, setCache, invalidateCache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'categories';

export const GET = withGateway(async () => {
  const cached = getCache(CACHE_KEY, TTL.CATEGORIES);
  if (cached) return cached;

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  if (error) throw { message: error.message, status: 500 };

  const data = (categories || []).filter((c: any) => c.name);
  setCache(CACHE_KEY, data);
  return data;
});

export const POST = withGateway(async (req) => {
  const { name } = await req.json();
  if (!name) throw { message: 'Nomi kiritilishi shart', status: 400 };

  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select('id')
    .single();

  if (error) throw { message: error.message, status: 500 };

  invalidateCache(CACHE_KEY);
  return { success: true, id: data.id };
});

export const PUT = withGateway(async (req) => {
  const { id, name } = await req.json();
  if (!id || !name) throw { message: 'ID va Nomi shart', status: 400 };

  const { error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id);

  if (error) throw { message: error.message, status: 500 };

  invalidateCache(CACHE_KEY);
  return { success: true };
});

export const DELETE = withGateway(async (req) => {
  const { id } = await req.json();
  if (!id) throw { message: 'ID shart', status: 400 };

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw { message: error.message, status: 500 };

  invalidateCache(CACHE_KEY);
  return { success: true };
});
