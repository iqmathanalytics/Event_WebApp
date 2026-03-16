const express = require("express");
const contactController = require("../controllers/contactController");
const validateRequest = require("../middleware/validateRequest");
const { submitContactSchema } = require("../validators/contactValidator");

const router = express.Router();

router.post("/", validateRequest(submitContactSchema), contactController.submitContact);

module.exports = router;
