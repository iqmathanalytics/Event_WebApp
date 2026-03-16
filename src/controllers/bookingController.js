const XLSX = require("xlsx");
const asyncHandler = require("../utils/asyncHandler");
const bookingService = require("../services/bookingService");

const createBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.createEventBooking({
    userId: req.user.id,
    payload: req.validated.body
  });
  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data
  });
});

const listOrganizerBookings = asyncHandler(async (req, res) => {
  const rows = await bookingService.fetchOrganizerBookings({
    organizerId: req.user.id,
    query: req.validated.query
  });
  res.status(200).json({
    success: true,
    data: rows
  });
});

const exportOrganizerBookings = asyncHandler(async (req, res) => {
  const format = req.validated.query.format || "csv";
  const result = await bookingService.getOrganizerBookingsExport({
    organizerId: req.user.id,
    query: req.validated.query
  });

  if (format === "excel") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(result.rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "OrganizerBookings");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=organizer-bookings.xlsx");
    return res.status(200).send(buffer);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=organizer-bookings.csv");
  return res.status(200).send(result.csv);
});

module.exports = {
  createBooking,
  listOrganizerBookings,
  exportOrganizerBookings
};
