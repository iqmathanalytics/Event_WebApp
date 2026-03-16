const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128)
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

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema
};
