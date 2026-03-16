const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");
const bookingService = require("../services/bookingService");
const XLSX = require("xlsx");

const getModerationQueue = asyncHandler(async (_req, res) => {
  const rows = await adminService.getModerationQueue();
  res.status(200).json({
    success: true,
    data: rows
  });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const data = await adminService.getAnalytics(req.validated?.query || req.query || {});
  res.status(200).json({
    success: true,
    data
  });
});

const listListings = asyncHandler(async (req, res) => {
  const rows = await adminService.listListings(req.validated.query);
  res.status(200).json({
    success: true,
    data: rows
  });
});

const updateListingStatus = asyncHandler(async (req, res) => {
  const updated = await adminService.updateListingStatus({
    type: req.validated.params.type,
    id: Number(req.validated.params.id),
    status: req.validated.body.status,
    note: req.validated.body.note,
    adminId: req.user.id
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: "Listing not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Listing status updated"
  });
});

const editListing = asyncHandler(async (req, res) => {
  const updated = await adminService.editListing({
    type: req.validated.params.type,
    id: Number(req.validated.params.id),
    payload: req.validated.body
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: "Listing not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Listing updated"
  });
});

const deleteListing = asyncHandler(async (req, res) => {
  const deleted = await adminService.deleteListing({
    type: req.validated.params.type,
    id: Number(req.validated.params.id)
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Listing not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Listing deleted"
  });
});

const createTeamUser = asyncHandler(async (req, res) => {
  const result = await adminService.createStaffUser(req.validated.body);
  return res.status(201).json({
    success: true,
    message: "Team member created",
    data: result
  });
});

const getTeamUsers = asyncHandler(async (req, res) => {
  const rows = await adminService.fetchTeamUsers(req.validated.query.role);
  return res.status(200).json({
    success: true,
    data: rows
  });
});

const deactivateTeamUser = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.validated.params.id);
  if (targetUserId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot deactivate your own admin account"
    });
  }
  await adminService.deactivateAccount(targetUserId);
  return res.status(200).json({
    success: true,
    message: "Account deactivated"
  });
});

const listBookings = asyncHandler(async (req, res) => {
  const rows = await bookingService.fetchAdminBookings(req.validated.query);
  return res.status(200).json({
    success: true,
    data: rows
  });
});

const exportBookings = asyncHandler(async (req, res) => {
  const format = req.validated.query.format || "csv";
  const result = await bookingService.getAdminBookingsExport(req.validated.query);

  if (format === "excel") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(result.rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "AdminBookings");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=admin-bookings.xlsx");
    return res.status(200).send(buffer);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=admin-bookings.csv");
  return res.status(200).send(result.csv);
});

module.exports = {
  getModerationQueue,
  getAnalytics,
  listListings,
  updateListingStatus,
  editListing,
  deleteListing,
  createTeamUser,
  getTeamUsers,
  deactivateTeamUser,
  listBookings,
  exportBookings
};
