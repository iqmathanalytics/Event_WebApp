const express = require("express");
const favoriteController = require("../controllers/favoriteController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createFavoriteSchema,
  getFavoritesSchema,
  deleteFavoriteSchema
} = require("../validators/favoriteValidator");

const router = express.Router();

router.get(
  "/",
  optionalAuthMiddleware,
  validateRequest(getFavoritesSchema),
  favoriteController.getFavorites
);
router.post("/", authMiddleware, validateRequest(createFavoriteSchema), favoriteController.createFavorite);
router.delete("/", authMiddleware, validateRequest(deleteFavoriteSchema), favoriteController.removeFavorite);

module.exports = router;
