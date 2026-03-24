const { z } = require("zod");
const { CONTACT_SUBJECT_VALUES } = require("../constants/contactSubjects");

const submitContactSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    subject: z.enum(CONTACT_SUBJECT_VALUES),
    message: z.string().min(5).max(5000),
    city_id: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.coerce.number().int().positive().optional()
    )
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { submitContactSchema };
