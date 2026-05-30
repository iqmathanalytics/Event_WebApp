const { z } = require("zod");

const ageLimitEnum = z.enum(["All Ages", "5 yrs +", "12 yrs +", "18 yrs +"]);
const scheduleTypeEnum = z.enum(["single", "multiple", "range"]);

const highlightsSchema = z
  .union([z.array(z.string().min(1).max(80)).max(20), z.string().max(4000)])
  .optional();
const dateArraySchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366).optional();
const galleryImageUrlsSchema = z.array(z.string().url().max(1000)).max(12).optional();
const promoVideoUrlsSchema = z.array(z.string().max(1000)).max(6).optional();
const ticketSalesModeEnum = z.enum(["external", "platform"]);
const { coerceTicketSalesModeBodyInput } = require("../utils/eventTicketSalesMode");

const ticketLevelSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  price: z.coerce.number().min(0),
  sort_order: z.coerce.number().int().min(0).max(99).optional()
});

const ticketLevelsField = z
  .union([z.array(ticketLevelSchema).max(12), z.string().max(50000)])
  .optional();

/** JSON often sends `null`; coerce so older Zod / strict string schemas still accept it. */
function optionalTicketLinkUrl(maxLen) {
  return z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.string().url().max(maxLen).optional()
  );
}

const submitEventBodySchema = z
  .object({
    title: z.string().min(3).max(220),
    description: z.string().max(5000).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    schedule_type: scheduleTypeEnum.optional(),
    event_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_dates: dateArraySchema,
    event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    venue: z.string().min(2).max(255),
    venue_name: z.string().min(2).max(255).optional(),
    venue_address: z.string().max(500).optional(),
    google_maps_link: z.string().url().max(1000).optional(),
    city_id: z.number().int().positive(),
    category_id: z.number().int().positive(),
    /** Required on create so we never infer "external" from a stale ticket_link when mode was omitted. */
    ticket_sales_mode: z.preprocess(coerceTicketSalesModeBodyInput, ticketSalesModeEnum),
    total_seats: z.coerce.number().int().min(1).max(50000).optional(),
    ticket_link: optionalTicketLinkUrl(1000),
    image_url: z.string().url().optional(),
    gallery_image_urls: galleryImageUrlsSchema,
    promo_video_urls: promoVideoUrlsSchema,
    price: z.number().min(0).optional(),
    price_per_day: z.number().min(0).optional(),
    duration_hours: z.number().int().min(0).max(168).optional(),
    duration_minutes: z.number().int().min(0).max(59).optional(),
    age_limit: ageLimitEnum.optional(),
    languages: z.string().max(255).optional(),
    genres: z.string().max(255).optional(),
    event_highlights: highlightsSchema,
    is_yay_deal_event: z.boolean().optional(),
    deal_event_discount_code: z.string().max(80).optional(),
    ticket_levels: ticketLevelsField,
    ticket_levels_json: ticketLevelsField
  })
  .superRefine((data, ctx) => {
    const scheduleType = data.schedule_type || "single";
    if (scheduleType === "multiple") {
      if (!Array.isArray(data.event_dates) || data.event_dates.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["event_dates"],
          message: "At least one event date is required for multiple-date events"
        });
      }
    } else if (scheduleType === "range") {
      if (!data.event_start_date || !data.event_end_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["event_start_date"],
          message: "Start and end dates are required for range events"
        });
      }
    } else if (!data.event_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event_date"],
        message: "Event date is required"
      });
    }

    const ticketMode = data.ticket_sales_mode;
    if (ticketMode === "external") {
      const link = data.ticket_link != null ? String(data.ticket_link).trim() : "";
      if (!link) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticket_link"],
          message: "Ticket link is required for external ticketing"
        });
      }
    }
    if (ticketMode === "platform") {
      const seats = Number(data.total_seats);
      if (!Number.isFinite(seats) || seats < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["total_seats"],
          message: "Total seats is required for on-site ticket booking (at least 1)"
        });
      }
    }
  });

const submitEventSchema = z.object({
  body: submitEventBodySchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const moderateEventSchema = z.object({
  body: z.object({
    note: z.string().max(500).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const fetchEventsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    city: z.string().regex(/^\d+$/).optional(),
    category: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    price_min: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    price_max: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    q: z.string().max(120).optional(),
    search: z.string().max(120).optional(),
    sort: z.enum(["price", "newest", "relevance", "popularity"]).optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

const { publicListingParamSchema } = require("./listingParam");

const fetchEventByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: publicListingParamSchema
  })
});

const fetchFeaturedEventsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    city: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

const trackEventAnalyticsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: publicListingParamSchema
  })
});

const editOwnEventBodySchema = z
  .object({
    title: z.string().min(3).max(220).optional(),
    description: z.string().max(5000).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    schedule_type: scheduleTypeEnum.optional(),
    event_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_dates: dateArraySchema,
    event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    venue: z.string().min(2).max(255).optional(),
    venue_name: z.string().min(2).max(255).optional(),
    venue_address: z.string().max(500).optional(),
    google_maps_link: z.string().url().max(1000).optional(),
    city_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    ticket_sales_mode: z.preprocess(coerceTicketSalesModeBodyInput, ticketSalesModeEnum.optional()),
    total_seats: z.coerce.number().int().min(1).max(50000).optional(),
    ticket_link: optionalTicketLinkUrl(1000),
    image_url: z.string().url().optional(),
    gallery_image_urls: galleryImageUrlsSchema,
    promo_video_urls: promoVideoUrlsSchema,
    price: z.coerce.number().min(0).optional(),
    price_per_day: z.coerce.number().min(0).optional(),
    duration_hours: z.coerce.number().int().min(0).max(168).optional(),
    duration_minutes: z.coerce.number().int().min(0).max(59).optional(),
    age_limit: ageLimitEnum.optional(),
    languages: z.string().max(255).optional(),
    genres: z.string().max(255).optional(),
    event_highlights: highlightsSchema,
    is_yay_deal_event: z.boolean().optional(),
    deal_event_discount_code: z.string().max(80).optional(),
    ticket_levels: ticketLevelsField,
    ticket_levels_json: ticketLevelsField
  })
  .superRefine((data, ctx) => {
    if (data.is_yay_deal_event === true) {
      const code = String(data.deal_event_discount_code || "").trim();
      if (!code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deal_event_discount_code"],
          message: "Discount code is required for exclusive deal events"
        });
      }
    }

    if (!data.schedule_type) {
      return;
    }
    if (data.schedule_type === "multiple" && (!Array.isArray(data.event_dates) || data.event_dates.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event_dates"],
        message: "At least one event date is required for multiple-date events"
      });
    }
    if (
      data.schedule_type === "range" &&
      (!data.event_start_date || !data.event_end_date)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["event_start_date"],
        message: "Start and end dates are required for range events"
      });
    }

    if (data.ticket_sales_mode === "external") {
      const link = data.ticket_link != null ? String(data.ticket_link).trim() : "";
      if (!link) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticket_link"],
          message: "Ticket link is required for external ticketing"
        });
      }
    }
    if (data.ticket_sales_mode === "platform") {
      const seats = Number(data.total_seats);
      if (data.total_seats !== undefined && (!Number.isFinite(seats) || seats < 1)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["total_seats"],
          message: "Total seats must be at least 1 for on-site ticket booking"
        });
      }
    }
  });

const editOwnEventSchema = z.object({
  body: editOwnEventBodySchema,
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const deleteOwnEventSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  submitEventSchema,
  moderateEventSchema,
  fetchEventsSchema,
  fetchEventByIdSchema,
  fetchFeaturedEventsSchema,
  editOwnEventSchema,
  deleteOwnEventSchema,
  trackEventAnalyticsSchema
};
