const express = require("express");
const favoriteController = require("../controllers/favoriteController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createFavoriteSchema,
  getFavoritesSchema,
  deleteFavoriteSchema
} = require("../validators/favoriteValidator");

const router = express.Router();

router.use(authMiddleware);
router.post("/", validateRequest(createFavoriteSchema), favoriteController.createFavorite);
router.get("/", validateRequest(getFavoritesSchema), favoriteController.getFavorites);
router.delete("/", validateRequest(deleteFavoriteSchema), favoriteController.removeFavorite);

module.exports = router;
