const express = require("express");
const metaController = require("../controllers/metaController");
const { publicCacheMiddleware } = require("../middleware/publicCacheMiddleware");

const router = express.Router();

router.get(
  "/cities",
  publicCacheMiddleware({ maxAge: 60, staleWhileRevalidate: 300 }),
  metaController.listCities
);

module.exports = router;
