const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    first_name: z.string().trim().min(2).max(80),
    last_name: z.string().trim().min(1).max(80),
    email: z.string().email(),
    mobile_number: z
      .preprocess((v) => {
        if (v === null || v === undefined) {
          return "";
        }
        return String(v).trim();
      }, z.union([z.literal(""), z.string().min(8).max(25)]))
      .transform((s) => s || null)
      .refine((s) => s === null || /^[0-9+()\-\s]+$/.test(s), {
        message: "Mobile number can include digits, spaces, +, -, and parentheses"
      }),
    city_id: z
      .union([z.coerce.number().int().positive(), z.null()])
      .optional()
      .transform((v) => (v === undefined ? null : v)),
    interests: z.array(z.string().trim().min(2).max(80)).max(8).optional().default([]),
    wants_influencer: z.boolean().optional().default(false),
    wants_deal: z.boolean().optional().default(false),
    influencer_profile: z
      .object({
        name: z.string().trim().min(2).max(160),
        bio: z.string().trim().max(2000).optional().default(""),
        category_id: z.coerce.number().int().positive(),
        contact_email: z.string().email().optional(),
        profile_image_url: z.string().url().optional()
      })
      .optional(),
    deal_profile: z
      .object({
        name: z.string().trim().min(2).max(180),
        business_email: z.string().email(),
        business_mobile: z
          .string()
          .trim()
          .min(8)
          .max(25)
          .regex(/^[0-9+()\-\s]+$/, "Mobile number can include digits, spaces, +, -, and parentheses"),
        location_text: z.string().trim().min(2).max(255),
        category_id: z.coerce.number().int().positive(),
        bio: z.string().trim().max(5000).optional().default(""),
        website_or_social_link: z.string().trim().max(500).optional(),
        profile_image_url: z.string().url().optional()
      })
      .optional(),
    password: z.string().min(8).max(128)
  }).superRefine((data, ctx) => {
    if (data.wants_influencer && !data.influencer_profile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["influencer_profile"],
        message: "Influencer details are required"
      });
    }
    if (data.wants_deal && !data.deal_profile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deal_profile"],
        message: "Deal details are required"
      });
    }
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20).max(2000)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const googleUserSchema = z.object({
  body: z.object({
    idToken: z.string().min(40).max(12000)
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleUserSchema
};
