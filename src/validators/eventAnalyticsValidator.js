const { z } = require("zod");

const organizerEventInsightsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z
    .object({
      eventId: z.string().regex(/^\d+$/)
    })
    .passthrough()
});

module.exports = {
  organizerEventInsightsSchema
};
