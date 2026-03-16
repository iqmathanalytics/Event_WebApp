const { z } = require("zod");

const listingTypeEnum = z.enum(["event", "deal", "influencer", "service"]);

const createFavoriteSchema = z.object({
  body: z.object({
    listing_type: listingTypeEnum,
    listing_id: z.coerce.number().int().positive()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const getFavoritesSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    listing_type: listingTypeEnum.optional()
  }),
  params: z.object({}).passthrough()
});

const deleteFavoriteSchema = z.object({
  body: z.object({
    listing_type: listingTypeEnum,
    listing_id: z.coerce.number().int().positive()
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = {
  createFavoriteSchema,
  getFavoritesSchema,
  deleteFavoriteSchema
};
