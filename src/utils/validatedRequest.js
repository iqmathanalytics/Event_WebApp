/**
 * Read validated request parts; falls back to raw Express fields when middleware
 * did not run (e.g. stale deploy missing validateRequest on a route).
 */
function getValidatedBody(req) {
  return req.validated?.body ?? req.body ?? {};
}

function getValidatedQuery(req) {
  return req.validated?.query ?? req.query ?? {};
}

function getValidatedParams(req) {
  return req.validated?.params ?? req.params ?? {};
}

module.exports = {
  getValidatedBody,
  getValidatedQuery,
  getValidatedParams
};
