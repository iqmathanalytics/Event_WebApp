const { z } = require("zod");

const fetchInfluencersSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    city: z.string().regex(/^\d+$/).optional(),
    category: z.string().regex(/^\d+$/).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    q: z.string().max(120).optional(),
    search: z.string().max(120).optional(),
    sort: z.enum(["newest", "relevance", "popularity"]).optional()
  }),
  params: z.object({}).passthrough()
});

const submitInfluencerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(160),
    bio: z.string().trim().min(10).max(2000),
    city_id: z.coerce.number().int().positive(),
    category_id: z.coerce.number().int().positive(),
    instagram: z.string().trim().max(255).optional(),
    youtube: z.string().trim().max(255).optional(),
    contact_email: z.string().trim().email(),
    profile_image_url: z.string().trim().url().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const myInfluencerSubmissionsSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const editOwnInfluencerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(160),
    bio: z.string().trim().min(10).max(2000),
    city_id: z.coerce.number().int().positive(),
    category_id: z.coerce.number().int().positive(),
    instagram: z.string().trim().max(255).optional(),
    youtube: z.string().trim().max(255).optional(),
    contact_email: z.string().trim().email(),
    profile_image_url: z.string().trim().url().optional()
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

module.exports = {
  fetchInfluencersSchema,
  submitInfluencerSchema,
  myInfluencerSubmissionsSchema,
  editOwnInfluencerSchema
};
