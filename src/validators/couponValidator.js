const { z } = require("zod");
const { toMysqlDateTimeString } = require("../utils/couponDatetime");

const couponCodeField = z
  .string()
  .trim()
  .min(5)
  .max(20)
  .regex(/^[A-Za-z0-9]+$/, "Code must be letters and numbers only");

const optionalPositiveInt = z
  .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalMoney = z
  .union([z.coerce.number().min(0), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalDateTime = z
  .union([z.string().max(40), z.literal(""), z.null()])
  .optional()
  .transform((v) => toMysqlDateTimeString(v));

const couponBodySchema = z.object({
  code: couponCodeField,
  discount_type: z.enum(["percent", "fixed_amount"]),
  discount_value: z.coerce.number().positive(),
  scope: z.enum(["all_events", "specific_events"]),
  event_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
  starts_at: optionalDateTime,
  ends_at: optionalDateTime,
  is_active: z.boolean().optional().default(true),
  max_redemptions: optionalPositiveInt,
  max_redemptions_per_user: optionalPositiveInt,
  min_ticket_count: optionalPositiveInt,
  min_order_amount: optionalMoney,
  max_discount_amount: optionalMoney
});

const ticketItemSchema = z.object({
  level_id: z.string().min(1).max(80),
  quantity: z.coerce.number().int().min(0).max(50)
});

const applyCouponSchema = z.object({
  body: z
    .object({
    event_id: z.coerce.number().int().positive(),
    coupon_code: couponCodeField,
    attendee_count: z.coerce.number().int().min(1).max(50).optional(),
    ticket_items: z.array(ticketItemSchema).max(20).optional(),
    selected_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366).optional(),
    /** Browser `Date.getTimezoneOffset()` — aligns validity window with datetime-local entry */
    timezone_offset: z.coerce.number().int().min(-840).max(840).optional().default(0),
    /** Reuse an existing hold instead of creating a duplicate */
    hold_token: z.string().uuid().optional()
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

const resumeCouponHoldSchema = z.object({
  body: z.object({
    event_id: z.coerce.number().int().positive(),
    hold_token: z.string().uuid(),
    timezone_offset: z.coerce.number().int().min(-840).max(840).optional().default(0)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const releaseCouponHoldSchema = z.object({
  body: z.object({
    event_id: z.coerce.number().int().positive().optional(),
    hold_token: z.string().uuid()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const createCouponSchema = z.object({
  body: couponBodySchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const updateCouponSchema = z.object({
  body: couponBodySchema,
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const couponIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  applyCouponSchema,
  resumeCouponHoldSchema,
  releaseCouponHoldSchema,
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema
};
