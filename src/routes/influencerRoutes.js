const express = require("express");
const influencerController = require("../controllers/influencerController");
const validateRequest = require("../middleware/validateRequest");
const { fetchInfluencersSchema } = require("../validators/influencerValidator");

const router = express.Router();

router.get("/", validateRequest(fetchInfluencersSchema), influencerController.fetchInfluencers);

module.exports = router;
