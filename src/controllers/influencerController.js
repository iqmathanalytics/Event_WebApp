const asyncHandler = require("../utils/asyncHandler");
const influencerService = require("../services/influencerService");

const fetchInfluencers = asyncHandler(async (req, res) => {
  const rows = await influencerService.fetchInfluencers(req.validated.query);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const submitInfluencer = asyncHandler(async (req, res) => {
  const result = await influencerService.submitInfluencer(req.validated.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Influencer profile submitted for approval",
    data: result
  });
});

const fetchMyInfluencerSubmissions = asyncHandler(async (req, res) => {
  const rows = await influencerService.fetchMyInfluencerSubmissions(req.user.id);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const editOwnInfluencerSubmission = asyncHandler(async (req, res) => {
  await influencerService.editOwnInfluencerSubmission(Number(req.params.id), req.validated.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "Influencer profile updated and submitted for re-approval"
  });
});

const fetchInfluencerById = asyncHandler(async (req, res) => {
  const influencer = await influencerService.fetchInfluencerById(Number(req.params.id));
  res.status(200).json({
    success: true,
    data: influencer
  });
});

const trackInfluencerView = asyncHandler(async (req, res) => {
  await influencerService.trackInfluencerView(Number(req.params.id));
  res.status(200).json({ success: true });
});

const trackInfluencerClick = asyncHandler(async (req, res) => {
  await influencerService.trackInfluencerClick(Number(req.params.id));
  res.status(200).json({ success: true });
});

const fetchInfluencerGalleryById = asyncHandler(async (req, res) => {
  const rows = await influencerService.fetchInfluencerGalleryById(Number(req.params.id));
  res.status(200).json({
    success: true,
    data: rows
  });
});

const uploadInfluencerGallery = asyncHandler(async (req, res) => {
  await influencerService.uploadInfluencerGallery({
    influencerId: Number(req.params.id),
    imageUrls: req.validated.body.image_urls,
    userId: req.user.id
  });
  res.status(201).json({
    success: true,
    message: "Gallery updated successfully"
  });
});

module.exports = {
  fetchInfluencers,
  submitInfluencer,
  fetchMyInfluencerSubmissions,
  editOwnInfluencerSubmission,
  fetchInfluencerById,
  trackInfluencerView,
  trackInfluencerClick,
  fetchInfluencerGalleryById,
  uploadInfluencerGallery
};
