const ApiError = require("../utils/ApiError");
const {
  listingExists,
  createFavorite,
  deleteFavorite,
  getFavoritesByUser
} = require("../models/favoriteModel");

async function addFavorite({ userId, listingType, listingId }) {
  const exists = await listingExists({ listingType, listingId });
  if (!exists) {
    throw new ApiError(404, "Listing not found");
  }

  await createFavorite({ userId, listingType, listingId });
}

async function removeFavorite({ userId, listingType, listingId }) {
  const deleted = await deleteFavorite({ userId, listingType, listingId });
  if (!deleted) {
    throw new ApiError(404, "Favorite not found");
  }
}

async function fetchFavorites({ userId, listingType }) {
  return getFavoritesByUser({ userId, listingType: listingType || null });
}

module.exports = {
  addFavorite,
  removeFavorite,
  fetchFavorites
};
