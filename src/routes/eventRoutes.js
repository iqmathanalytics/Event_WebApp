const express = require("express");
const eventController = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  submitEventSchema,
  moderateEventSchema,
  fetchEventsSchema,
  fetchEventByIdSchema,
  editOwnEventSchema,
  deleteOwnEventSchema
} = require("../validators/eventValidator");

const router = express.Router();

router.get("/", validateRequest(fetchEventsSchema), eventController.fetchEvents);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("organizer"),
  validateRequest(submitEventSchema),
  eventController.submitEvent
);
router.get(
  "/my-events",
  authMiddleware,
  roleMiddleware("organizer"),
  eventController.fetchMySubmissions
);
router.get(
  "/my-submissions",
  authMiddleware,
  roleMiddleware("organizer"),
  eventController.fetchMySubmissions
);
router.get("/:id", validateRequest(fetchEventByIdSchema), eventController.fetchEventById);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer"),
  validateRequest(editOwnEventSchema),
  eventController.editOwnEvent
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer"),
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
