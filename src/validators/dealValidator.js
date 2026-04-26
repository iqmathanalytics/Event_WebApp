const { z } = require("zod");

const optionalTrimmedString = (max) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max).optional()
  );

const optionalUrlString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().url().optional()
);

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
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    promo_code: optionalTrimmedString(80),
    deal_link: optionalUrlString,
    image_url: optionalUrlString,
    is_premium: z.boolean().optional(),
    terms_text: optionalTrimmedString(3000)
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
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    promo_code: optionalTrimmedString(80),
    deal_link: optionalUrlString,
    image_url: optionalUrlString,
    is_premium: z.boolean().optional(),
    terms_text: optionalTrimmedString(3000)
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
