const { z } = require("zod");

const offerTypeEnum = z.enum([
  "percentage_off",
  "flat_off",
  "bogo",
  "bundle_price",
  "free_item",
  "custom"
]);

const fetchDealsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    city: z.string().regex(/^\d+$/).optional(),
    category: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    price_min: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    price_max: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    q: z.string().max(120).optional(),
    search: z.string().max(120).optional(),
    only_active: z.enum(["true", "false"]).optional(),
    sort: z.enum(["price", "newest", "relevance", "popularity"]).optional(),
    sort_order: z.enum(["asc", "desc"]).optional()
  }),
  params: z.object({}).passthrough()
});

const submitDealSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(220),
    description: z.string().trim().max(3000).optional(),
    city_id: z.coerce.number().int().positive(),
    category_id: z.coerce.number().int().positive(),
    provider_name: z.string().trim().min(2).max(180),
    discount_percentage: z.coerce.number().min(0).max(100).optional(),
    original_price: z.coerce.number().min(0).optional(),
    discounted_price: z.coerce.number().min(0).optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    promo_code: z.string().trim().max(80).optional(),
    deal_link: z.string().trim().url().optional(),
    image_url: z.string().trim().url().optional(),
    is_premium: z.boolean().optional(),
    offer_type: offerTypeEnum.optional(),
    offer_value: z.coerce.number().min(0).optional(),
    buy_qty: z.coerce.number().int().min(1).optional(),
    get_qty: z.coerce.number().int().min(1).optional(),
    minimum_spend: z.coerce.number().min(0).optional(),
    max_discount_amount: z.coerce.number().min(0).optional(),
    free_item_name: z.string().trim().max(160).optional(),
    custom_offer_text: z.string().trim().max(220).optional(),
    terms_text: z.string().trim().max(3000).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const myDealSubmissionsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const fetchDealByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const trackDealAnalyticsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const editOwnDealSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(220),
    description: z.string().trim().max(3000).optional(),
    city_id: z.coerce.number().int().positive(),
    category_id: z.coerce.number().int().positive(),
    provider_name: z.string().trim().min(2).max(180),
    discount_percentage: z.coerce.number().min(0).max(100).optional(),
    original_price: z.coerce.number().min(0).optional(),
    discounted_price: z.coerce.number().min(0).optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    promo_code: z.string().trim().max(80).optional(),
    deal_link: z.string().trim().url().optional(),
    image_url: z.string().trim().url().optional(),
    is_premium: z.boolean().optional(),
    offer_type: offerTypeEnum.optional(),
    offer_value: z.coerce.number().min(0).optional(),
    buy_qty: z.coerce.number().int().min(1).optional(),
    get_qty: z.coerce.number().int().min(1).optional(),
    minimum_spend: z.coerce.number().min(0).optional(),
    max_discount_amount: z.coerce.number().min(0).optional(),
    free_item_name: z.string().trim().max(160).optional(),
    custom_offer_text: z.string().trim().max(220).optional(),
    terms_text: z.string().trim().max(3000).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  fetchDealsSchema,
  fetchDealByIdSchema,
  submitDealSchema,
  myDealSubmissionsSchema,
  editOwnDealSchema,
  trackDealAnalyticsSchema
};
