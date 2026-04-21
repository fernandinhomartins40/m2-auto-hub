import { z } from 'zod';

export const createPromotionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().max(500).optional(),
  bannerImage: z.string().url().optional(),
  badgeText: z.string().max(50).optional(),

  // Configuration
  type: z.enum([
    'PERCENTAGE',
    'FIXED',
    'BUY_ONE_GET_ONE',
    'BUY_X_GET_Y',
    'TIERED_DISCOUNT',
    'CASHBACK',
    'FREE_SHIPPING',
    'BUNDLE_DISCOUNT',
    'LOYALTY_POINTS',
    'PROGRESSIVE_DISCOUNT',
    'TIME_LIMITED_FLASH',
    'QUANTITY_BASED',
    'CATEGORY_COMBO',
  ]),
  target: z.enum([
    'ALL_PRODUCTS',
    'SPECIFIC_PRODUCTS',
    'CATEGORY',
    'BRAND',
    'PRICE_RANGE',
    'CART',
  ]),
  trigger: z.enum([
    'CART_VALUE',
    'ITEM_QUANTITY',
    'PRODUCT_PURCHASE',
    'CATEGORY_PURCHASE',
    'CUSTOMER_SEGMENT',
    'TIME_WINDOW',
    'FIRST_PURCHASE',
    'AUTO_APPLY',
  ]),

  // Segmentation
  customerSegments: z.array(
    z.enum([
      'ALL',
      'NEW_CUSTOMERS',
      'RETURNING_CUSTOMERS',
      'VIP',
      'BRONZE',
      'SILVER',
      'GOLD',
      'PLATINUM',
      'HIGH_SPENDERS',
      'INACTIVE_CUSTOMERS',
      'BIRTHDAY_MONTH',
    ])
  ),
  geographicRestrictions: z
    .object({
      states: z.array(z.string()).optional(),
      cities: z.array(z.string()).optional(),
    })
    .optional(),
  deviceTypes: z.array(z.enum(['WEB', 'APP', 'ALL'])).optional(),

  // Rules
  rules: z.array(
    z.object({
      type: z.string(),
      condition: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      description: z.string().optional(),
      field: z.string().optional(),
    })
  ).optional().default([]),
  tiers: z
    .array(
      z.object({
        minValue: z.number(),
        maxValue: z.number().optional(),
        discount: z.number(),
      })
    )
    .optional(),

  // Target products
  targetProductIds: z.array(z.string().uuid()).optional(),
  targetCategories: z.array(z.string()).optional(),
  targetBrands: z.array(z.string()).optional(),
  targetPriceRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  excludeProductIds: z.array(z.string().uuid()).optional(),
  excludeCategories: z.array(z.string()).optional(),

  // Rewards
  rewards: z.object({
    primary: z.object({
      type: z.string(),
      value: z.number(),
      maxAmount: z.number().optional(),
    }),
    secondary: z.object({
      type: z.string(),
      value: z.number(),
    }).optional(),
    freeProducts: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })).optional(),
  }),

  // Schedule
  schedule: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    timeWindows: z
      .array(
        z.object({
          start: z.string(),
          end: z.string(),
        })
      )
      .optional(),
    recurring: z.boolean().optional(),
  }),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),

  // Limitations
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().optional(),

  // Combination
  canCombineWithOthers: z.boolean().default(false),
  excludePromotionIds: z.array(z.string().uuid()).optional(),
  priority: z.number().int().min(0).default(0),

  // Code
  code: z.string().optional(),
  autoApply: z.boolean().default(false),

  // States
  isDraft: z.boolean().default(false),

  // Metadata
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),

  // Advanced
  customLogic: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;
