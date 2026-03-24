const express = require("express");
const eventController = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  submitEventSchema,
  moderateEventSchema,
  fetchEventsSchema,
  fetchEventByIdSchema,
  fetchFeaturedEventsSchema,
  editOwnEventSchema,
  deleteOwnEventSchema,
  trackEventAnalyticsSchema
} = require("../validators/eventValidator");

const router = express.Router();

router.get("/", optionalAuthMiddleware, validateRequest(fetchEventsSchema), eventController.fetchEvents);
router.get(
  "/featured",
  optionalAuthMiddleware,
  validateRequest(fetchFeaturedEventsSchema),
  eventController.fetchFeaturedEvents
);
router.post(
  "/:id/track-click",
  validateRequest(trackEventAnalyticsSchema),
  eventController.trackEventClick
);
router.post(
  "/:id/track-view",
  validateRequest(trackEventAnalyticsSchema),
  eventController.trackEventView
);
router.post(
  "/",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(submitEventSchema),
  eventController.submitEvent
);
router.get(
  "/my-events",
  authMiddleware,
  organizerAccessMiddleware,
  eventController.fetchMySubmissions
);
router.get(
  "/my-submissions",
  authMiddleware,
  organizerAccessMiddleware,
  eventController.fetchMySubmissions
);
router.get("/:id", optionalAuthMiddleware, validateRequest(fetchEventByIdSchema), eventController.fetchEventById);
router.put(
  "/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(editOwnEventSchema),
  eventController.editOwnEvent
);
router.delete(
  "/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(deleteOwnEventSchema),
  eventController.deleteOwnEvent
);
router.patch(
  "/:id/approve",
  authMiddleware,
  adminMiddleware,
  validateRequest(moderateEventSchema),
  eventController.approveEvent
);
router.patch(
  "/:id/reject",
  authMiddleware,
  adminMiddleware,
  validateRequest(moderateEventSchema),
  eventController.rejectEvent
);

module.exports = router;
