const { z } = require("zod");

const subscribeNewsletterSchema = z.object({
  body: z.object({
    city_id: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.coerce.number().int().positive().optional()
    )
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const newsletterStatusSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    city_id: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

module.exports = { subscribeNewsletterSchema, newsletterStatusSchema };
