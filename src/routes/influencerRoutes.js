const express = require("express");
const influencerController = require("../controllers/influencerController");
const authMiddleware = require("../middleware/authMiddleware");
const capabilityMiddleware = require("../middleware/capabilityMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  fetchInfluencersSchema,
  submitInfluencerSchema,
  myInfluencerSubmissionsSchema,
  editOwnInfluencerSchema,
  fetchInfluencerByIdSchema,
  influencerTrackSchema,
  influencerGalleryUploadSchema,
  fetchInfluencerGallerySchema
} = require("../validators/influencerValidator");

const router = express.Router();

router.get("/", validateRequest(fetchInfluencersSchema), influencerController.fetchInfluencers);
router.get(
  "/my-submissions",
  authMiddleware,
  validateRequest(myInfluencerSubmissionsSchema),
  influencerController.fetchMyInfluencerSubmissions
);
router.post(
  "/",
  authMiddleware,
  capabilityMiddleware("can_create_influencer_profile", "Influencer profile creation is disabled for this account"),
  validateRequest(submitInfluencerSchema),
  influencerController.submitInfluencer
);
router.put(
  "/:id",
  authMiddleware,
  capabilityMiddleware("can_create_influencer_profile", "Influencer profile creation is disabled for this account"),
  validateRequest(editOwnInfluencerSchema),
  influencerController.editOwnInfluencerSubmission
);

router.get(
  "/:id/details",
  validateRequest(fetchInfluencerByIdSchema),
  influencerController.fetchInfluencerById
);

router.post(
  "/:id/track-view",
  validateRequest(influencerTrackSchema),
  influencerController.trackInfluencerView
);

router.post(
  "/:id/track-click",
  validateRequest(influencerTrackSchema),
  influencerController.trackInfluencerClick
);

router.get(
  "/:id/media",
  validateRequest(fetchInfluencerGallerySchema),
  influencerController.fetchInfluencerGalleryById
);

router.post(
  "/:id/media",
  authMiddleware,
  validateRequest(influencerGalleryUploadSchema),
  influencerController.uploadInfluencerGallery
);

module.exports = router;
