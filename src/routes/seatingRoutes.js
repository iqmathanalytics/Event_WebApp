const express = require("express");
const seatingController = require("../controllers/seatingController");
const authMiddleware = require("../middleware/authMiddleware");
const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  eventIdParamsSchema,
  saveSeatingConfigSchema
} = require("../validators/seatingValidator");

const router = express.Router({ mergeParams: true });

router.get(
  "/designer",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(eventIdParamsSchema),
  seatingController.getOrganizerDesignerConfig
);

router.put(
  "/",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(saveSeatingConfigSchema),
  seatingController.saveOrganizerSeatingConfig
);

router.get(
  "/chart",
  validateRequest(eventIdParamsSchema),
  seatingController.getPublicSeatingChart
);

router.post("/release-hold", seatingController.releaseSeatHold);
router.post("/sync-hold", seatingController.syncSeatHold);

module.exports = router;
