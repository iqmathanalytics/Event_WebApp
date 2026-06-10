/**
 * Cache-Control for public read endpoints. Skips caching when a user session is present
 * (optional-auth routes may return member-only fields).
 */
function publicCacheMiddleware({ maxAge = 120, staleWhileRevalidate = 300, privateMaxAge = 60 } = {}) {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (req.user) {
      res.set("Cache-Control", `private, max-age=${privateMaxAge}`);
      return next();
    }
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    return next();
  };
}

module.exports = {
  publicCacheMiddleware
};
