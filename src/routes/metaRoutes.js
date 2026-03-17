const express = require("express");
const metaController = require("../controllers/metaController");

const router = express.Router();

router.get("/cities", metaController.listCities);

module.exports = router;
