const express = require("express");
const serviceController = require("../controllers/serviceController");
const validateRequest = require("../middleware/validateRequest");
const { fetchServicesSchema } = require("../validators/serviceValidator");

const router = express.Router();

router.get("/", validateRequest(fetchServicesSchema), serviceController.fetchServices);

module.exports = router;
