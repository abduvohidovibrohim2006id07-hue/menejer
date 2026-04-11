import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().min(1, 'ID majburiy').max(255),
  name: z.string().nullable().optional().transform(v => v || '').refine(v => v.length > 0, 'Mahsulot nomi nomi majburiy'),
  name_ru: z.string().nullable().optional(),
  price: z.any().transform(val => Number(val) || 0),
  old_price: z.any().transform(val => Number(val) || 0),

  category: z.string().nullable().optional().transform(v => v || '').refine(v => v.length > 0, 'Kategoriya majburiy'),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  description_short: z.string().nullable().optional(),
  description_short_ru: z.string().nullable().optional(),
  description_full: z.string().nullable().optional(),
  description_full_ru: z.string().nullable().optional(),
  local_images: z.array(z.string()).optional().default([]),

  status: z.enum(['active', 'quarantine', 'archive']).optional().default('active'),
  marketplaces: z.array(z.string()).optional().default([]),
  price_retail: z.any().nullable().optional(),
  length_mm: z.any().nullable().optional(),
  width_mm: z.any().nullable().optional(),
  height_mm: z.any().nullable().optional(),
  weight_g: z.any().nullable().optional(),
  barcode: z.string().nullable().optional(),
  sku_uzum: z.string().nullable().optional(),
  sku_yandex: z.string().nullable().optional(),
  group_sku: z.string().nullable().optional(),
  discount: z.any().transform(val => Number(val) || 0),
  competitors: z.array(z.any()).optional().default([]),

  warehouse_data: z.record(z.string(), z.any()).optional().default({}),
});

export const productValidation = (data: unknown) => {
  return productSchema.safeParse(data);
};
