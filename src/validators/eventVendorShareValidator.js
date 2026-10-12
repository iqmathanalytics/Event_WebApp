const { z } = require("zod");

const eventIdParamsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

const createVendorShareSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(190),
    vendor_code: z
      .preprocess((v) => {
        const code = String(v ?? "")
          .trim()
          .toUpperCase();
        return code || undefined;
      }, z.string().min(3).max(40).regex(/^[A-Za-z0-9]+$/).optional())
      .optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

const revokeVendorShareSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/),
    shareId: z.string().regex(/^\d+$/)
  })
});

const acceptVendorInviteSchema = z.object({
  body: z.object({
    token: z.string().trim().min(10).max(80)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const vendorInsightsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    share_id: z.string().regex(/^\d+$/).optional(),
    vendor_code: z.string().trim().max(40).optional(),
    hourly_date: z.string().trim().max(32).optional()
  }),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

const vendorHitSchema = z.object({
  body: z.object({
    vendor_code: z.string().trim().min(3).max(40),
    session_key: z.string().trim().min(8).max(64),
    path: z.string().trim().max(255).optional(),
    heartbeat: z.boolean().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    eventId: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  eventIdParamsSchema,
  createVendorShareSchema,
  revokeVendorShareSchema,
  acceptVendorInviteSchema,
  vendorInsightsSchema,
  vendorHitSchema
};
