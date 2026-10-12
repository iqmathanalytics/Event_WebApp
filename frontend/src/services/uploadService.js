import api from "./api";

/** Banner/gallery uploads go file → API → Cloudinary; often exceed the default 15s API timeout. */
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Upload a single image file; returns the HTTPS URL stored on Cloudinary.
 * Requires a logged-in user (JWT). Server must have Cloudinary env vars set.
 */
export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const { data } = await api.post("/uploads/image", formData, {
      timeout: UPLOAD_TIMEOUT_MS
    });
    if (!data?.success || !data?.data?.url) {
      throw new Error("Unexpected upload response");
    }
    return data.data.url;
  } catch (err) {
    if (err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message || ""))) {
      const nicer = new Error(
        "Upload timed out. Try a smaller image (under 8MB) or check your connection and retry."
      );
      nicer.response = err.response;
      throw nicer;
    }
    throw err;
  }
}
