const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, userController.getMe);
router.patch("/me", authMiddleware, userController.updateMyProfile);
router.get("/my-bookings", authMiddleware, userController.getMyBookings);
router.post("/enable-organizer", authMiddleware, userController.enableOrganizer);

module.exports = router;
