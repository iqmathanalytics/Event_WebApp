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

const eventIdParamsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

const createAnalyticsShareSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(190)
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

const revokeAnalyticsShareSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/),
    shareId: z.string().regex(/^\d+$/)
  })
});

const acceptAnalyticsInviteSchema = z.object({
  body: z.object({
    token: z.string().trim().min(10).max(80)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = {
  organizerEventInsightsSchema,
  eventIdParamsSchema,
  createAnalyticsShareSchema,
  revokeAnalyticsShareSchema,
  acceptAnalyticsInviteSchema
};
