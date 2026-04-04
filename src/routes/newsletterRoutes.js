const express = require("express");
const newsletterController = require("../controllers/newsletterController");
const validateRequest = require("../middleware/validateRequest");
const authMiddleware = require("../middleware/authMiddleware");
const {
  subscribeNewsletterSchema,
  newsletterStatusSchema,
  guestSubscribeNewsletterSchema
} = require("../validators/newsletterValidator");

const router = express.Router();

router.post(
  "/subscribe/guest",
  validateRequest(guestSubscribeNewsletterSchema),
  newsletterController.subscribeGuest
);
router.post(
  "/subscribe",
  authMiddleware,
  validateRequest(subscribeNewsletterSchema),
  newsletterController.subscribe
);
router.get("/me/status", authMiddleware, validateRequest(newsletterStatusSchema), newsletterController.getMySubscriptionStatus);

module.exports = router;
