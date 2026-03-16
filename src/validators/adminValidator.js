const { z } = require("zod");

const listListingsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    type: z.enum(["events", "deals", "influencers", "services"]),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    city: z.string().regex(/^\d+$/).optional(),
    category: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
  }),
  params: z.object({}).passthrough()
});

const analyticsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    city: z.string().regex(/^\d+$/).optional(),
    category: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
  }),
  params: z.object({}).passthrough()
});

const updateListingStatusSchema = z.object({
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    note: z.string().max(500).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "services"]),
    id: z.string().regex(/^\d+$/)
  })
});

const editListingSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(220).optional(),
    name: z.string().min(2).max(160).optional(),
    description: z.string().max(5000).optional(),
    city_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    price: z.coerce.number().min(0).optional(),
    original_price: z.coerce.number().min(0).optional(),
    discounted_price: z.coerce.number().min(0).optional(),
    price_min: z.coerce.number().min(0).optional(),
    price_max: z.coerce.number().min(0).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "services"]),
    id: z.string().regex(/^\d+$/)
  })
});

const deleteListingSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "services"]),
    id: z.string().regex(/^\d+$/)
  })
});

const createTeamUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    mobile_number: z
      .string()
      .trim()
      .min(8)
      .max(25)
      .regex(/^[0-9+()\-\s]+$/, "Mobile number can include digits, spaces, +, -, and parentheses"),
    password: z.string().min(8).max(128),
    role: z.enum(["organizer", "admin"])
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const listTeamUsersSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    role: z.enum(["organizer", "admin"])
  }),
  params: z.object({}).passthrough()
});

const deactivateTeamUserSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const adminBookingsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    event_id: z.string().regex(/^\d+$/).optional(),
    organizer_id: z.string().regex(/^\d+$/).optional(),
    city: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    format: z.enum(["csv", "excel"]).optional()
  }),
  params: z.object({}).passthrough()
});

module.exports = {
  analyticsSchema,
  listListingsSchema,
  updateListingStatusSchema,
  editListingSchema,
  deleteListingSchema,
  createTeamUserSchema,
  listTeamUsersSchema,
  deactivateTeamUserSchema,
  adminBookingsSchema
};
