const { z } = require("zod");

const fetchServicesSchema = z.object({
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
    sort: z.enum(["price", "newest", "relevance", "popularity"]).optional(),
    sort_order: z.enum(["asc", "desc"]).optional()
  }),
  params: z.object({}).passthrough()
});

module.exports = { fetchServicesSchema };
