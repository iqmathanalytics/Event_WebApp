const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");
const ApiError = require("../utils/ApiError");

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

function handleSingleImageUpload(req, res, next) {
  memoryUpload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(413, "Image must be 8MB or smaller."));
      }
      return next(new ApiError(400, err.message || "Upload error"));
    }
    if (err) {
      return next(err);
    }
    return next();
  });
}

router.post("/image", authMiddleware, handleSingleImageUpload, uploadController.uploadImage);

module.exports = router;
