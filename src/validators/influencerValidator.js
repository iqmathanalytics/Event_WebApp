const { z } = require("zod");

/** Client forms often send "" for optional inputs; treat as omitted before .url() etc. */
function emptyStringToUndefined(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
}

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
    instagram: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    facebook: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    youtube: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    contact_email: z.string().trim().email(),
    profile_image_url: z.preprocess(emptyStringToUndefined, z.string().trim().url().optional())
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
    instagram: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    facebook: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    youtube: z.preprocess(emptyStringToUndefined, z.string().trim().max(255).optional()),
    contact_email: z.string().trim().email(),
    profile_image_url: z.preprocess(emptyStringToUndefined, z.string().trim().url().optional())
  }),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const fetchInfluencerByIdSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const influencerTrackSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const fetchInfluencerGallerySchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    id: z.string().regex(/^\d+$/)
  })
});

const influencerGalleryUploadSchema = z.object({
  body: z.object({
    image_urls: z.array(z.string().trim().url().max(1000)).min(1).max(25)
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
  editOwnInfluencerSchema,
  fetchInfluencerByIdSchema,
  influencerTrackSchema,
  influencerGalleryUploadSchema,
  fetchInfluencerGallerySchema
};
