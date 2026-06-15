const { z } = require("zod");

const eventIdParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const saveSeatingConfigSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    seating_mode: z.enum(["general", "reserved"]).optional(),
    chart_key: z.string().trim().min(1).max(80).optional()
  }),
  query: z.object({}).passthrough()
});

module.exports = {
  eventIdParamsSchema,
  saveSeatingConfigSchema
};
