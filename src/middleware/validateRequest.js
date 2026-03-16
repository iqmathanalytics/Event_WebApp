const ApiError = require("../utils/ApiError");

function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message
      }));
      return next(new ApiError(400, "Validation failed", details));
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = validateRequest;
