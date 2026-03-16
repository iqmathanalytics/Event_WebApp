const express = require("express");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  analyticsSchema,
  listListingsSchema,
  updateListingStatusSchema,
  editListingSchema,
  deleteListingSchema,
  createTeamUserSchema,
  listTeamUsersSchema,
  deactivateTeamUserSchema,
  adminBookingsSchema
} = require("../validators/adminValidator");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get("/moderation/events", adminController.getModerationQueue);
router.get("/analytics/counts", validateRequest(analyticsSchema), adminController.getAnalytics);
router.get("/listings", validateRequest(listListingsSchema), adminController.listListings);
router.patch(
  "/listings/:type/:id/status",
  validateRequest(updateListingStatusSchema),
  adminController.updateListingStatus
);
router.patch("/listings/:type/:id", validateRequest(editListingSchema), adminController.editListing);
router.delete("/listings/:type/:id", validateRequest(deleteListingSchema), adminController.deleteListing);
router.post("/team/users", validateRequest(createTeamUserSchema), adminController.createTeamUser);
router.get("/team/users", validateRequest(listTeamUsersSchema), adminController.getTeamUsers);
router.patch(
  "/team/users/:id/deactivate",
  validateRequest(deactivateTeamUserSchema),
  adminController.deactivateTeamUser
);
router.get("/bookings", validateRequest(adminBookingsSchema), adminController.listBookings);
router.get("/bookings/export", validateRequest(adminBookingsSchema), adminController.exportBookings);

module.exports = router;
