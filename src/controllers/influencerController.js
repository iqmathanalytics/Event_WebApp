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

module.exports = {
  fetchInfluencers,
  submitInfluencer,
  fetchMyInfluencerSubmissions,
  editOwnInfluencerSubmission
};
