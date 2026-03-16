const { z } = require("zod");

const subscribeNewsletterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    city_id: z.number().int().positive().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { subscribeNewsletterSchema };
