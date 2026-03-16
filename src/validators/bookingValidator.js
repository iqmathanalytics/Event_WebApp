const { z } = require("zod");

const createBookingSchema = z.object({
  body: z.object({
    event_id: z.coerce.number().int().positive(),
    attendee_count: z.coerce.number().int().min(1).max(50),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(25)
      .regex(/^[0-9+()\-\s]+$/, "Phone can include digits, spaces, +, -, and parentheses")
      .optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const organizerBookingsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    event_id: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    format: z.enum(["csv", "excel"]).optional()
  }),
  params: z.object({}).passthrough()
});

module.exports = {
  createBookingSchema,
  organizerBookingsSchema
};
