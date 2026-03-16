const express = require("express");
const newsletterController = require("../controllers/newsletterController");
const validateRequest = require("../middleware/validateRequest");
const { subscribeNewsletterSchema } = require("../validators/newsletterValidator");

const router = express.Router();

router.post(
  "/subscribe",
  validateRequest(subscribeNewsletterSchema),
  newsletterController.subscribe
);

module.exports = router;
