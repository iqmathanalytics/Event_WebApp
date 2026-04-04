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
  // Subscription status is not scoped by city; accept any query (legacy clients may send city_id).
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const guestSubscribeNewsletterSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(190),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    city_id: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.coerce.number().int().positive().optional()
    ),
    interested_in: z.preprocess(
      (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
      z.string().trim().max(500).optional()
    )
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { subscribeNewsletterSchema, newsletterStatusSchema, guestSubscribeNewsletterSchema };
