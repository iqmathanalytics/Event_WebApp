const { z } = require("zod");

const submitPlatformTicketAccessRequestSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    mobile_number: z.string().trim().max(20).optional().nullable(),
    organization_name: z.string().trim().max(200).optional().nullable(),
    message: z.string().trim().min(20).max(5000)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const adminListPlatformTicketRequestsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional()
  }),
  params: z.object({}).passthrough()
});

const adminReviewPlatformTicketRequestSchema = z.object({
  body: z.object({
    note: z.string().trim().max(2000).optional().nullable()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  submitPlatformTicketAccessRequestSchema,
  adminListPlatformTicketRequestsSchema,
  adminReviewPlatformTicketRequestSchema
};
