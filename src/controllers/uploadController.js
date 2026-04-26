const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { isConfigured, uploadImageBuffer } = require("../services/cloudinaryService");

const uploadImage = asyncHandler(async (req, res) => {
  if (!isConfigured()) {
    throw new ApiError(
      503,
      "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server."
    );
  }
  if (!req.file?.buffer) {
    throw new ApiError(400, "No image file provided");
  }
  if (!/^image\//i.test(req.file.mimetype)) {
    throw new ApiError(400, "File must be an image");
  }
  const result = await uploadImageBuffer(req.file.buffer);
  res.status(200).json({ success: true, data: { url: result.secure_url } });
});

module.exports = {
  uploadImage
};
