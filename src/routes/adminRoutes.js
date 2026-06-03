const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { organizerEventInsightsSchema } = require("../validators/eventAnalyticsValidator");
const {
  adminListPlatformTicketRequestsSchema,
  adminReviewPlatformTicketRequestSchema
} = require("../validators/platformTicketRequestValidator");
const {
  analyticsSchema,
  listListingsSchema,
  getListingByIdSchema,
  updateListingStatusSchema,
  editListingSchema,
  deleteListingSchema,
  updateEventListedSchema,
  createTeamUserSchema,
  listTeamUsersSchema,
  listUsersSchema,
  updateTeamCapabilitiesSchema,
  deactivateTeamUserSchema,
  deleteUserSchema,
  activateTeamUserSchema,
  adminBookingsSchema,
  adminVerifyTicketSchema,
  adminCheckInTicketSchema,
  adminNewsletterListSchema,
  adminNewsletterExportSchema,
  adminContactListSchema,
  adminContactExportSchema,
  adminNewsletterSyncSchema,
  adminNewsletterDeleteSchema,
  adminNotificationsListSchema,
  adminNotificationsReadSchema,
  adminNotificationsDeleteSchema
} = require("../validators/adminValidator");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get("/moderation/events", adminController.getModerationQueue);
router.get("/analytics/counts", validateRequest(analyticsSchema), adminController.getAnalytics);
router.get("/listings", validateRequest(listListingsSchema), adminController.listListings);
router.get(
  "/listings/:type/:id",
  validateRequest(getListingByIdSchema),
  adminController.getListingById
);
router.patch(
  "/listings/:type/:id/status",
  validateRequest(updateListingStatusSchema),
  adminController.updateListingStatus
);
router.patch("/listings/:type/:id", validateRequest(editListingSchema), adminController.editListing);
router.patch(
  "/listings/events/:id/listed",
  validateRequest(updateEventListedSchema),
  adminController.updateEventListed
);
router.delete("/listings/:type/:id", validateRequest(deleteListingSchema), adminController.deleteListing);
router.post("/team/users", validateRequest(createTeamUserSchema), adminController.createTeamUser);
router.get("/team/users", validateRequest(listTeamUsersSchema), adminController.getTeamUsers);
router.get("/users", validateRequest(listUsersSchema), adminController.getUsers);
router.patch(
  "/team/users/:id/capabilities",
  validateRequest(updateTeamCapabilitiesSchema),
  adminController.updateTeamUserCapabilities
);
router.patch(
  "/team/users/:id/activate",
  validateRequest(activateTeamUserSchema),
  adminController.activateTeamUser
);
router.patch(
  "/team/users/:id/deactivate",
  validateRequest(deactivateTeamUserSchema),
  adminController.deactivateTeamUser
);
router.delete("/users/:id", validateRequest(deleteUserSchema), adminController.deleteUser);
router.get("/bookings", validateRequest(adminBookingsSchema), adminController.listBookings);
router.get("/bookings/export", validateRequest(adminBookingsSchema), adminController.exportBookings);
router.get(
  "/bookings/verify-ticket",
  validateRequest(adminVerifyTicketSchema),
  adminController.verifyTicket
);
router.post(
  "/bookings/check-in",
  validateRequest(adminCheckInTicketSchema),
  adminController.checkInTicket
);
router.get(
  "/newsletter/subscribers",
  validateRequest(adminNewsletterListSchema),
  adminController.listNewsletterSubscribers
);
router.get(
  "/newsletter/subscribers/export",
  validateRequest(adminNewsletterExportSchema),
  adminController.exportNewsletterSubscribers
);
router.post(
  "/newsletter/subscribers/sync-mailchimp",
  validateRequest(adminNewsletterSyncSchema),
  adminController.syncNewsletterSubscribersToMailchimp
);
router.delete(
  "/newsletter/subscribers/:id",
  validateRequest(adminNewsletterDeleteSchema),
  adminController.deleteNewsletterSubscriber
);
router.get("/contact/messages", validateRequest(adminContactListSchema), adminController.listContactMessages);
router.get(
  "/contact/messages/export",
  validateRequest(adminContactExportSchema),
  adminController.exportContactMessages
);
router.get(
  "/notifications",
  validateRequest(adminNotificationsListSchema),
  adminController.listAdminNotifications
);
router.patch(
  "/notifications/read",
  validateRequest(adminNotificationsReadSchema),
  adminController.markAdminNotificationsRead
);
router.delete(
  "/notifications/:id",
  validateRequest(adminNotificationsDeleteSchema),
  adminController.deleteAdminNotification
);

router.get(
  "/events/:eventId/insights",
  validateRequest(organizerEventInsightsSchema),
  adminController.getAdminEventInsights
);
router.get(
  "/platform-ticket-access-requests",
  validateRequest(adminListPlatformTicketRequestsSchema),
  adminController.listPlatformTicketAccessRequests
);
router.patch(
  "/platform-ticket-access-requests/:id/approve",
  validateRequest(adminReviewPlatformTicketRequestSchema),
  adminController.approvePlatformTicketAccessRequest
);
router.patch(
  "/platform-ticket-access-requests/:id/reject",
  validateRequest(adminReviewPlatformTicketRequestSchema),
  adminController.rejectPlatformTicketAccessRequest
);

router.get("/cities/dropdown", adminController.listDropdownCities);
router.post("/cities/dropdown", adminController.addDropdownCity);
router.delete("/cities/dropdown/:id", adminController.removeDropdownCity);

module.exports = router;
