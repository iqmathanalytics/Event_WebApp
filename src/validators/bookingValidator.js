const { z } = require("zod");

const ticketItemSchema = z.object({
  level_id: z.string().min(1).max(80),
  quantity: z.coerce.number().int().min(0).max(50)
});

const selectedSeatSchema = z.object({
  label: z.string().min(1).max(80),
  category: z.coerce.number().int().min(1).max(50).optional(),
  category_label: z.string().max(120).optional(),
  price: z.coerce.number().min(0).optional()
});

const guestContactFields = {
  first_name: z.string().trim().min(1, "First name is required").max(60),
  last_name: z.string().trim().min(1, "Last name is required").max(60),
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
    first_name: z.string().trim().min(1).max(60).optional(),
    last_name: z.string().trim().min(1).max(60).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z
      .string()
      .trim()
      .min(8, "Phone number is required")
      .max(25)
      .regex(/^[0-9+()\-\s]+$/, "Phone can include digits, spaces, +, -, and parentheses")
      .optional(),
    coupon_hold_token: z.string().uuid().optional(),
    seatsio_hold_token: z.string().trim().min(1).max(128).optional(),
    selected_seats: z.array(selectedSeatSchema).max(20).optional()
  })
    .superRefine((data, ctx) => {
      if (data.selected_seats?.length) {
        if (!data.seatsio_hold_token) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["seatsio_hold_token"],
            message: "Seat hold expired. Please select seats again."
          });
        }
        return;
      }
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
      ...guestContactFields,
      seatsio_hold_token: z.string().trim().min(1).max(128).optional(),
      selected_seats: z.array(selectedSeatSchema).max(20).optional()
    })
    .superRefine((data, ctx) => {
      if (data.selected_seats?.length) {
        if (!data.seatsio_hold_token) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["seatsio_hold_token"],
            message: "Seat hold expired. Please select seats again."
          });
        }
        return;
      }
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
