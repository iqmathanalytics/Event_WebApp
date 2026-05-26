const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const userController = require("../controllers/userController");
const { changePasswordSchema } = require("../validators/userValidator");
const {
  submitPlatformTicketAccessRequestSchema
} = require("../validators/platformTicketRequestValidator");

const router = express.Router();

router.get("/me", authMiddleware, userController.getMe);
router.patch("/me", authMiddleware, userController.updateMyProfile);
router.patch(
  "/me/password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  userController.changeMyPassword
);
router.get("/my-bookings", authMiddleware, userController.getMyBookings);
router.post("/enable-organizer", authMiddleware, userController.enableOrganizer);
router.get(
  "/platform-ticket-access-request",
  authMiddleware,
  userController.getMyPlatformTicketAccessRequest
);
router.post(
  "/platform-ticket-access-request",
  authMiddleware,
  validateRequest(submitPlatformTicketAccessRequestSchema),
  userController.submitPlatformTicketAccessRequest
);

module.exports = router;
