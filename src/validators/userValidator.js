const { z } = require("zod");

const changePasswordSchema = z.object({
  body: z
    .object({
      current_password: z.string().min(1).max(128),
      new_password: z.string().min(8).max(128)
    })
    .superRefine((data, ctx) => {
      if (data.new_password === data.current_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["new_password"],
          message: "New password must be different from your current password"
        });
      }
    }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = {
  changePasswordSchema
};
