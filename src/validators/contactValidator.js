const { z } = require("zod");

const submitContactSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    subject: z.string().min(2).max(220),
    message: z.string().min(5).max(5000),
    city_id: z.number().int().positive().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { submitContactSchema };
