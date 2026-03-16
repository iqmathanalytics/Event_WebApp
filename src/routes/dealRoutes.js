const express = require("express");
const dealController = require("../controllers/dealController");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { fetchDealsSchema } = require("../validators/dealValidator");

const router = express.Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validateRequest(fetchDealsSchema),
  dealController.fetchDeals
);

module.exports = router;
