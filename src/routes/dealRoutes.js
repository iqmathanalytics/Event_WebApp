const express = require("express");
const dealController = require("../controllers/dealController");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const capabilityMiddleware = require("../middleware/capabilityMiddleware");
const dealerApprovalMiddleware = require("../middleware/dealerApprovalMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  fetchDealsSchema,
  fetchDealByIdSchema,
  submitDealSchema,
  myDealSubmissionsSchema,
  editOwnDealSchema,
  trackDealAnalyticsSchema
} = require("../validators/dealValidator");

const router = express.Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validateRequest(fetchDealsSchema),
  dealController.fetchDeals
);
router.get(
  "/my-submissions",
  authMiddleware,
  validateRequest(myDealSubmissionsSchema),
  dealController.fetchMyDealSubmissions
);
router.get(
  "/:id",
  validateRequest(fetchDealByIdSchema),
  dealController.fetchDealById
);
router.post(
  "/:id/track-click",
  validateRequest(trackDealAnalyticsSchema),
  dealController.trackDealClick
);
router.post(
  "/:id/track-view",
  validateRequest(trackDealAnalyticsSchema),
  dealController.trackDealView
);
router.post(
  "/",
  authMiddleware,
  capabilityMiddleware("can_post_deals", "Deal posting is disabled for this account"),
  dealerApprovalMiddleware,
  validateRequest(submitDealSchema),
  dealController.submitDeal
);
router.put(
  "/:id",
  authMiddleware,
  capabilityMiddleware("can_post_deals", "Deal posting is disabled for this account"),
  dealerApprovalMiddleware,
  validateRequest(editOwnDealSchema),
  dealController.editOwnDealSubmission
);

module.exports = router;
