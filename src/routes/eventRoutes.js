const express = require("express");
const eventController = require("../controllers/eventController");
const eventAnalyticsController = require("../controllers/eventAnalyticsController");
const eventVendorShareController = require("../controllers/eventVendorShareController");
const seatingController = require("../controllers/seatingController");
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
const {
  organizerEventInsightsSchema,
  eventIdParamsSchema,
  createAnalyticsShareSchema,
  revokeAnalyticsShareSchema,
  acceptAnalyticsInviteSchema
} = require("../validators/eventAnalyticsValidator");
const {
  createVendorShareSchema,
  revokeVendorShareSchema,
  acceptVendorInviteSchema,
  vendorInsightsSchema,
  vendorHitSchema,
  eventIdParamsSchema: vendorEventIdParamsSchema
} = require("../validators/eventVendorShareValidator");
const { publicCacheMiddleware } = require("../middleware/publicCacheMiddleware");

const router = express.Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validateRequest(fetchEventsSchema),
  publicCacheMiddleware({ maxAge: 60, staleWhileRevalidate: 300 }),
  eventController.fetchEvents
);
router.get(
  "/featured",
  optionalAuthMiddleware,
  validateRequest(fetchFeaturedEventsSchema),
  publicCacheMiddleware({ maxAge: 180, staleWhileRevalidate: 600 }),
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
  "/organizer/insights",
  authMiddleware,
  organizerAccessMiddleware,
  eventAnalyticsController.listOrganizerInsights
);
router.get(
  "/organizer/shared-insights",
  authMiddleware,
  organizerAccessMiddleware,
  eventAnalyticsController.listSharedInsights
);
router.post(
  "/organizer/analytics-invites/accept",
  authMiddleware,
  validateRequest(acceptAnalyticsInviteSchema),
  eventAnalyticsController.acceptAnalyticsInvite
);
router.get(
  "/organizer/insights/:eventId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(organizerEventInsightsSchema),
  eventAnalyticsController.getOrganizerEventInsights
);
router.get(
  "/organizer/check-in-insights/:eventId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(eventIdParamsSchema),
  eventAnalyticsController.getOrganizerCheckInInsights
);
router.get(
  "/organizer/seating/designer-bootstrap",
  authMiddleware,
  organizerAccessMiddleware,
  seatingController.getOrganizerDesignerBootstrap
);
router.get(
  "/:eventId/analytics-shares",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(eventIdParamsSchema),
  eventAnalyticsController.listEventAnalyticsShares
);
router.post(
  "/:eventId/analytics-shares",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(createAnalyticsShareSchema),
  eventAnalyticsController.createEventAnalyticsShare
);
router.delete(
  "/:eventId/analytics-shares/:shareId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(revokeAnalyticsShareSchema),
  eventAnalyticsController.revokeEventAnalyticsShare
);

router.get(
  "/vendor/shared",
  authMiddleware,
  organizerAccessMiddleware,
  eventVendorShareController.listSharedVendor
);
router.get(
  "/vendor/owned",
  authMiddleware,
  organizerAccessMiddleware,
  eventVendorShareController.listOwnedVendorEvents
);
router.post(
  "/vendor-invites/accept",
  authMiddleware,
  validateRequest(acceptVendorInviteSchema),
  eventVendorShareController.acceptVendorInvite
);
router.get(
  "/vendor/insights/:eventId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(vendorInsightsSchema),
  eventVendorShareController.getVendorInsights
);
router.get(
  "/vendor/bookings/:eventId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(vendorInsightsSchema),
  eventVendorShareController.getVendorBookings
);
router.get(
  "/:eventId/vendor-shares",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(vendorEventIdParamsSchema),
  eventVendorShareController.listEventVendorShares
);
router.post(
  "/:eventId/vendor-shares",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(createVendorShareSchema),
  eventVendorShareController.createEventVendorShare
);
router.delete(
  "/:eventId/vendor-shares/:shareId",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(revokeVendorShareSchema),
  eventVendorShareController.revokeEventVendorShare
);
router.post(
  "/:eventId/vendor-hits",
  validateRequest(vendorHitSchema),
  eventVendorShareController.recordVendorHit
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
router.get(
  "/mine/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(fetchEventByIdSchema),
  eventController.fetchOwnEventById
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
router.use("/:id/seating", require("./seatingRoutes"));
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
