const asyncHandler = require("../utils/asyncHandler");
const eventService = require("../services/eventService");

const submitEvent = asyncHandler(async (req, res) => {
  const result = await eventService.submitEvent(req.validated.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Event submitted for approval",
    data: result
  });
});

const approveEvent = asyncHandler(async (req, res) => {
  await eventService.approveEvent(
    Number(req.params.id),
    req.user.id,
    req.validated.body.note
  );
  res.status(200).json({
    success: true,
    message: "Event approved"
  });
});

const rejectEvent = asyncHandler(async (req, res) => {
  await eventService.rejectEvent(
    Number(req.params.id),
    req.user.id,
    req.validated.body.note
  );
  res.status(200).json({
    success: true,
    message: "Event rejected"
  });
});

const fetchEvents = asyncHandler(async (req, res) => {
  const result = await eventService.fetchEvents(req.validated.query, req.user);
  res.status(200).json({
    success: true,
    data: result
  });
});

const fetchEventById = asyncHandler(async (req, res) => {
  const result = await eventService.fetchEventById(Number(req.params.id), req.user);
  res.status(200).json({
    success: true,
    data: result
  });
});

const fetchMySubmissions = asyncHandler(async (req, res) => {
  const rows = await eventService.fetchMySubmissions(req.user.id);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const fetchFeaturedEvents = asyncHandler(async (req, res) => {
  const result = await eventService.fetchFeaturedEvents(
    {
      city: req.validated.query.city,
      limit: req.validated.query.limit
    },
    req.user
  );

  res.status(200).json({
    success: true,
    data: result
  });
});

const trackEventClick = asyncHandler(async (req, res) => {
  const ok = await eventService.trackEventClick(Number(req.params.id));
  res.status(200).json({ success: true, data: { updated: ok } });
});

const trackEventView = asyncHandler(async (req, res) => {
  const ok = await eventService.trackEventView(Number(req.params.id));
  res.status(200).json({ success: true, data: { updated: ok } });
});

const editOwnEvent = asyncHandler(async (req, res) => {
  await eventService.editOwnEvent(Number(req.params.id), req.user.id, req.validated.body);
  res.status(200).json({
    success: true,
    message: "Event updated and moved to pending review"
  });
});

const deleteOwnEvent = asyncHandler(async (req, res) => {
  await eventService.deleteOwnEvent(Number(req.params.id), req.user.id);
  res.status(200).json({
    success: true,
    message: "Event deleted successfully"
  });
});

module.exports = {
  submitEvent,
  approveEvent,
  rejectEvent,
  fetchEvents,
  fetchEventById,
  fetchMySubmissions,
  editOwnEvent,
  deleteOwnEvent,
  fetchFeaturedEvents,
  trackEventClick,
  trackEventView
};
