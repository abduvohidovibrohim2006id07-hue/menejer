import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().min(1, 'ID majburiy').max(255),
  name: z.string().min(1, 'Mahsulot nomi nomi majburiy'),
  name_ru: z.string().optional(),
  price: z.string().or(z.number()).transform(val => Number(val) || 0),
  category: z.string().min(1, 'Kategoriya majburiy'),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  description_short: z.string().optional(),
  description_short_ru: z.string().optional(),
  description_full: z.string().optional(),
  description_full_ru: z.string().optional(),
  local_images: z.array(z.string()).optional().default([]),
  sku: z.string().optional(),
  status: z.enum(['active', 'quarantine', 'archive']).optional().default('active'),
  marketplaces: z.array(z.string()).optional().default([]),
  price_retail: z.string().or(z.number()).optional(),
  length_mm: z.string().or(z.number()).optional(),
  width_mm: z.string().or(z.number()).optional(),
  height_mm: z.string().or(z.number()).optional(),
  weight_g: z.string().or(z.number()).optional(),
  barcode: z.string().optional(),
  sku_uzum: z.string().optional(),
  sku_yandex: z.string().optional(),
  group_sku: z.string().optional(),
  competitors: z.array(z.any()).optional().default([]),
  warehouse_data: z.record(z.string(), z.any()).optional().default({}),
});

export const productValidation = (data: unknown) => {
  return productSchema.safeParse(data);
};
