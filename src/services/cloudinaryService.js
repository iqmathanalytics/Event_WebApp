const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

function isConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

if (isConfigured()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

/** @param {Buffer} buffer */
function uploadImageBuffer(buffer) {
  if (!isConfigured()) {
    const err = new Error("Cloudinary is not configured");
    err.statusCode = 503;
    throw err;
  }
  const folder = String(process.env.CLOUDINARY_UPLOAD_FOLDER || "yayeventz").trim() || "yayeventz";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      if (!result?.secure_url) {
        reject(new Error("Cloudinary returned no image URL"));
        return;
      }
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

module.exports = {
  isConfigured,
  uploadImageBuffer
};
