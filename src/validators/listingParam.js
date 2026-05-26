const { z } = require("zod");

/** URL segment: numeric id or public slug (e.g. jazz-night-514878). */
const publicListingParamSchema = z.string().min(1).max(240);

module.exports = {
  publicListingParamSchema
};
