const { z } = require("zod");

const ticketItemSchema = z.object({
  level_id: z.string().min(1).max(80),
  quantity: z.coerce.number().int().min(0).max(50)
});

const guestContactFields = {
  name: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("A valid email is required"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number is required")
    .max(25)
    .regex(/^[0-9+()\-\s]+$/, "Phone can include digits, spaces, +, -, and parentheses")
};

const createBookingSchema = z.object({
  body: z
    .object({
    event_id: z.coerce.number().int().positive(),
    attendee_count: z.coerce.number().int().min(1).max(50).optional(),
    ticket_items: z.array(ticketItemSchema).max(20).optional(),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    selected_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z
      .string()
      .trim()
      .min(8, "Phone number is required")
      .max(25)
      .regex(/^[0-9+()\-\s]+$/, "Phone can include digits, spaces, +, -, and parentheses")
      .optional(),
    coupon_hold_token: z.string().uuid().optional()
  })
    .superRefine((data, ctx) => {
      const itemTotal = (data.ticket_items || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      if (data.ticket_items?.length) {
        if (itemTotal < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ticket_items"],
            message: "Select at least one ticket"
          });
        }
        if (itemTotal > 50) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ticket_items"],
            message: "You can book up to 50 tickets per order"
          });
        }
        return;
      }
      if (!data.attendee_count || data.attendee_count < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["attendee_count"],
          message: "At least one ticket is required"
        });
      }
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

const guestCreateBookingSchema = z.object({
  body: z
    .object({
      event_id: z.coerce.number().int().positive(),
      attendee_count: z.coerce.number().int().min(1).max(50).optional(),
      ticket_items: z.array(ticketItemSchema).max(20).optional(),
      booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      selected_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366).optional(),
      ...guestContactFields
    })
    .superRefine((data, ctx) => {
      const itemTotal = (data.ticket_items || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      if (data.ticket_items?.length) {
        if (itemTotal < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ticket_items"],
            message: "Select at least one ticket"
          });
        }
        return;
      }
      if (!data.attendee_count || data.attendee_count < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["attendee_count"],
          message: "At least one ticket is required"
        });
      }
    }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const confirmPaymentSchema = z.object({
  body: z.object({
    payment_intent_id: z.string().min(8).max(255)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = {
  createBookingSchema,
  guestCreateBookingSchema,
  confirmPaymentSchema,
  organizerBookingsSchema
};
