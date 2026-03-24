const asyncHandler = require("../utils/asyncHandler");
const dealService = require("../services/dealService");

const fetchDeals = asyncHandler(async (req, res) => {
  const rows = await dealService.fetchDeals(req.validated.query, req.user);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const fetchDealById = asyncHandler(async (req, res) => {
  const row = await dealService.fetchDealById(Number(req.params.id));
  res.status(200).json({
    success: true,
    data: row
  });
});

const submitDeal = asyncHandler(async (req, res) => {
  const result = await dealService.submitDeal(req.validated.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Deal submitted for approval",
    data: result
  });
});

const fetchMyDealSubmissions = asyncHandler(async (req, res) => {
  const rows = await dealService.fetchMyDealSubmissions(req.user.id);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const editOwnDealSubmission = asyncHandler(async (req, res) => {
  await dealService.editOwnDealSubmission(Number(req.params.id), req.validated.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "Deal updated and submitted for re-approval"
  });
});

const trackDealClick = asyncHandler(async (req, res) => {
  const ok = await dealService.trackDealClick(Number(req.params.id));
  res.status(200).json({ success: true, data: { updated: ok } });
});

const trackDealView = asyncHandler(async (req, res) => {
  const ok = await dealService.trackDealView(Number(req.params.id));
  res.status(200).json({ success: true, data: { updated: ok } });
});

module.exports = {
  fetchDeals,
  fetchDealById,
  submitDeal,
  fetchMyDealSubmissions,
  editOwnDealSubmission,
  trackDealClick,
  trackDealView
};
