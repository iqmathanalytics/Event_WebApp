const asyncHandler = require("../utils/asyncHandler");
const favoriteService = require("../services/favoriteService");

const createFavorite = asyncHandler(async (req, res) => {
  await favoriteService.addFavorite({
    userId: req.user.id,
    listingType: req.validated.body.listing_type,
    listingId: req.validated.body.listing_id
  });

  res.status(201).json({
    success: true,
    message: "Saved to favorites"
  });
});

const getFavorites = asyncHandler(async (req, res) => {
  const rows = await favoriteService.fetchFavorites({
    userId: req.user.id,
    listingType: req.validated.query.listing_type
  });

  res.status(200).json({
    success: true,
    data: rows
  });
});

const removeFavorite = asyncHandler(async (req, res) => {
  await favoriteService.removeFavorite({
    userId: req.user.id,
    listingType: req.validated.body.listing_type,
    listingId: req.validated.body.listing_id
  });

  res.status(200).json({
    success: true,
    message: "Removed from favorites"
  });
});

module.exports = {
  createFavorite,
  getFavorites,
  removeFavorite
};
