import api from "./api";

/**
 * Upload a single image file; returns the HTTPS URL stored on Cloudinary.
 * Requires a logged-in user (JWT). Server must have Cloudinary env vars set.
 */
export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post("/uploads/image", formData);
  if (!data?.success || !data?.data?.url) {
    throw new Error("Unexpected upload response");
  }
  return data.data.url;
}
