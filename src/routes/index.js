const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const eventRoutes = require("./eventRoutes");
const dealRoutes = require("./dealRoutes");
const influencerRoutes = require("./influencerRoutes");
const newsletterRoutes = require("./newsletterRoutes");
const contactRoutes = require("./contactRoutes");
const adminRoutes = require("./adminRoutes");
const favoriteRoutes = require("./favoriteRoutes");
const bookingRoutes = require("./bookingRoutes");
const metaRoutes = require("./metaRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/deals", dealRoutes);
router.use("/influencers", influencerRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/contact", contactRoutes);
router.use("/admin", adminRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/bookings", bookingRoutes);
router.use("/meta", metaRoutes);

module.exports = router;
