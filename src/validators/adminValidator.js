const { z } = require("zod");

const listListingsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    type: z.enum(["events", "deals", "influencers", "dealers"]),
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
  body: z
    .object({
      status: z.enum(["approved", "rejected"]),
      note: z.string().max(500).optional()
    })
    .superRefine((value, ctx) => {
      if (value.status === "rejected" && !String(value.note || "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["note"],
          message: "Rejection reason is required"
        });
      }
    }),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "dealers"]),
    id: z.string().regex(/^\d+$/)
  })
});

const editListingSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(220).optional(),
    name: z.string().min(2).max(160).optional(),
    bio: z.string().trim().min(0).max(2000).optional(),
    instagram: z.string().trim().max(255).optional(),
    youtube: z.string().trim().max(255).optional(),
    followers_count: z.coerce.number().int().min(0).optional(),
    youtube_subscribers_count: z.coerce.number().int().min(0).optional(),
    contact_email: z.string().trim().email().optional(),
    business_email: z.string().email().optional(),
    business_mobile: z.string().max(25).optional(),
    location_text: z.string().max(255).optional(),
    description: z.string().max(5000).optional(),
    city_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    price: z.coerce.number().min(0).optional(),
    original_price: z.coerce.number().min(0).optional(),
    discounted_price: z.coerce.number().min(0).optional(),
    price_min: z.coerce.number().min(0).optional(),
    price_max: z.coerce.number().min(0).optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    schedule_type: z.enum(["single", "multiple", "range"]).optional(),
    event_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    venue: z.string().max(255).optional(),
    venue_name: z.string().max(255).optional(),
    venue_address: z.string().max(400).optional(),
    google_maps_link: z.string().url().max(500).optional(),
    ticket_link: z.string().url().max(500).optional(),
    image_url: z.string().url().max(500).optional(),
    duration_hours: z.coerce.number().int().positive().max(168).optional(),
    age_limit: z.string().max(50).optional(),
    languages: z.string().max(255).optional(),
    genres: z.string().max(255).optional(),
    event_highlights: z.array(z.string().min(1).max(100)).optional(),
    one_of_a_kind_manual: z.union([z.boolean(), z.coerce.number().int().min(0).max(1)]).optional(),
    price_per_day: z.coerce.number().min(0).optional(),
    is_yay_deal_event: z.boolean().optional(),
    deal_event_discount_code: z.union([z.string().max(80), z.null()]).optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    website_or_social_link: z.string().url().max(500).optional(),
    profile_image_url: z.string().url().max(500).optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "dealers"]),
    id: z.string().regex(/^\d+$/)
  })
});

const deleteListingSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    type: z.enum(["events", "deals", "influencers", "dealers"]),
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

const listUsersSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const deactivateTeamUserSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const deleteUserSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const activateTeamUserSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const updateTeamCapabilitiesSchema = z.object({
  body: z.object({
    can_post_events: z.boolean(),
    can_create_influencer_profile: z.boolean(),
    can_post_deals: z.boolean()
  }),
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

const adminNewsletterListSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

const adminNewsletterExportSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    format: z.enum(["csv", "excel"]).optional()
  }),
  params: z.object({}).passthrough()
});

const adminContactListSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

const adminContactExportSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    format: z.enum(["csv", "excel"]).optional()
  }),
  params: z.object({}).passthrough()
});

const adminNotificationsListSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional()
  }),
  params: z.object({}).passthrough()
});

const adminNotificationsReadSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const adminNotificationsDeleteSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const adminNewsletterSyncSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
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
  listUsersSchema,
  updateTeamCapabilitiesSchema,
  deactivateTeamUserSchema,
  deleteUserSchema,
  activateTeamUserSchema,
  adminBookingsSchema,
  adminNewsletterListSchema,
  adminNewsletterExportSchema,
  adminContactListSchema,
  adminContactExportSchema,
  adminNewsletterSyncSchema,
  adminNotificationsListSchema,
  adminNotificationsReadSchema,
  adminNotificationsDeleteSchema
};
