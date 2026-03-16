const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/me", authMiddleware, userController.getMe);
router.get("/my-bookings", authMiddleware, userController.getMyBookings);

module.exports = router;
