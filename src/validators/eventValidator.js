const { z } = require("zod");

const ageLimitEnum = z.enum(["All Ages", "5 yrs +", "12 yrs +", "18 yrs +"]);

const highlightsSchema = z
  .union([z.array(z.string().min(1).max(80)).max(20), z.string().max(4000)])
  .optional();

const submitEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(220),
    description: z.string().max(5000).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    venue: z.string().min(2).max(255),
    venue_name: z.string().min(2).max(255).optional(),
    venue_address: z.string().max(500).optional(),
    google_maps_link: z.string().url().max(1000).optional(),
    city_id: z.number().int().positive(),
    category_id: z.number().int().positive(),
    ticket_link: z.string().url().optional(),
    image_url: z.string().url().optional(),
    price: z.number().min(0).optional(),
    duration_hours: z.number().int().min(1).max(168).optional(),
    age_limit: ageLimitEnum.optional(),
    languages: z.string().max(255).optional(),
    genres: z.string().max(255).optional(),
    event_highlights: highlightsSchema
  }),
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

const fetchEventByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const editOwnEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(220).optional(),
    description: z.string().max(5000).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    venue: z.string().min(2).max(255).optional(),
    venue_name: z.string().min(2).max(255).optional(),
    venue_address: z.string().max(500).optional(),
    google_maps_link: z.string().url().max(1000).optional(),
    city_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    ticket_link: z.string().url().optional(),
    image_url: z.string().url().optional(),
    price: z.coerce.number().min(0).optional(),
    duration_hours: z.coerce.number().int().min(1).max(168).optional(),
    age_limit: ageLimitEnum.optional(),
    languages: z.string().max(255).optional(),
    genres: z.string().max(255).optional(),
    event_highlights: highlightsSchema
  }),
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
  editOwnEventSchema,
  deleteOwnEventSchema
};
