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

const getUsers = asyncHandler(async (_req, res) => {
  const rows = await adminService.fetchAllUsers();
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

const activateTeamUser = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.validated.params.id);
  await adminService.activateAccount(targetUserId);
  return res.status(200).json({
    success: true,
    message: "Account activated"
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.validated.params.id);
  if (targetUserId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own admin account"
    });
  }
  await adminService.removeUserAccount(targetUserId);
  return res.status(200).json({
    success: true,
    message: "User deleted"
  });
});

const updateTeamUserCapabilities = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.validated.params.id);
  await adminService.updateTeamUserCapabilities({
    userId: targetUserId,
    capabilities: req.validated.body
  });
  return res.status(200).json({
    success: true,
    message: "Capabilities updated"
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

function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers, rowMapper, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(rowMapper(row).map(csvEscape).join(","));
  }
  return lines.join("\n");
}

const listNewsletterSubscribers = asyncHandler(async (req, res) => {
  const data = await adminService.listNewsletterSubscribers(req.validated.query);
  res.status(200).json({
    success: true,
    data: data.rows,
    pagination: {
      page: data.page,
      limit: data.limit,
      total: data.total
    }
  });
});

const exportNewsletterSubscribers = asyncHandler(async (req, res) => {
  const format = req.validated.query.format || "csv";
  const rows = await adminService.getNewsletterSubscribersExportRows();
  if (format === "excel") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        email: r.email,
        mobile_number: r.mobile_number || "",
        city: r.city_name || "",
        interested_in: (() => {
          const note = String(r.interests_note || "").trim();
          let fromJson = "";
          try {
            const arr = JSON.parse(r.interests_json || "[]");
            fromJson = Array.isArray(arr) ? arr.join(", ") : "";
          } catch (_err) {
            fromJson = "";
          }
          return [fromJson, note].filter(Boolean).join(" | ");
        })(),
        influencer: Number(r.wants_influencer) === 1 ? "Yes" : "No",
        dealer: Number(r.wants_deal) === 1 ? "Yes" : "No"
      }))
    );
    XLSX.utils.book_append_sheet(workbook, sheet, "Subscribers");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.xlsx");
    return res.status(200).send(buffer);
  }
  const csv = rowsToCsv(
    [
      "first_name",
      "last_name",
      "email",
      "mobile_number",
      "city",
      "interested_in",
      "influencer",
      "dealer"
    ],
    (r) => [
      r.first_name || "",
      r.last_name || "",
      r.email,
      r.mobile_number || "",
      r.city_name || "",
      (() => {
        const note = String(r.interests_note || "").trim();
        let fromJson = "";
        try {
          const arr = JSON.parse(r.interests_json || "[]");
          fromJson = Array.isArray(arr) ? arr.join(", ") : "";
        } catch (_err) {
          fromJson = "";
        }
        return [fromJson, note].filter(Boolean).join(" | ");
      })(),
      Number(r.wants_influencer) === 1 ? "Yes" : "No",
      Number(r.wants_deal) === 1 ? "Yes" : "No"
    ],
    rows
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.csv");
  return res.status(200).send(csv);
});

const listContactMessages = asyncHandler(async (req, res) => {
  const data = await adminService.listContactMessages(req.validated.query);
  res.status(200).json({
    success: true,
    data: data.rows,
    pagination: {
      page: data.page,
      limit: data.limit,
      total: data.total
    }
  });
});

const exportContactMessages = asyncHandler(async (req, res) => {
  const format = req.validated.query.format || "csv";
  const rows = await adminService.getContactMessagesExportRows();
  if (format === "excel") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        message: r.message,
        city_id: r.city_id,
        status: r.status,
        created_at: r.created_at,
        resolved_at: r.resolved_at
      }))
    );
    XLSX.utils.book_append_sheet(workbook, sheet, "ContactMessages");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=contact-messages.xlsx");
    return res.status(200).send(buffer);
  }
  const csv = rowsToCsv(
    ["id", "name", "email", "subject", "message", "city_id", "status", "created_at", "resolved_at"],
    (r) => [
      r.id,
      r.name,
      r.email,
      r.subject,
      r.message,
      r.city_id,
      r.status,
      r.created_at,
      r.resolved_at
    ],
    rows
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=contact-messages.csv");
  return res.status(200).send(csv);
});

const listAdminNotifications = asyncHandler(async (req, res) => {
  const limit = Number(req.validated.query.limit || 25);
  const result = await adminService.getAdminNotifications({
    adminId: req.user.id,
    limit
  });
  return res.status(200).json({
    success: true,
    data: result.rows,
    unread: result.unread
  });
});

const markAdminNotificationsRead = asyncHandler(async (req, res) => {
  const result = await adminService.markAdminNotificationsRead({
    adminId: req.user.id
  });
  return res.status(200).json({
    success: true,
    message: "Notifications marked as read",
    unread: result.unread
  });
});

const deleteAdminNotification = asyncHandler(async (req, res) => {
  const notificationId = Number(req.validated.params.id);
  const result = await adminService.deleteAdminNotification({
    adminId: req.user.id,
    notificationId
  });
  return res.status(200).json({
    success: true,
    message: "Notification deleted",
    unread: result.unread
  });
});

const syncNewsletterSubscribersToMailchimp = asyncHandler(async (_req, res) => {
  const result = await adminService.syncNewsletterSubscribersToMailchimp();
  return res.status(200).json({
    success: true,
    message: "Newsletter subscribers synced to Mailchimp",
    data: result
  });
});

const deleteNewsletterSubscriber = asyncHandler(async (req, res) => {
  const id = Number(req.validated.params.id);
  await adminService.removeNewsletterSubscriberById(id);
  return res.status(200).json({
    success: true,
    message: "Subscriber removed"
  });
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
  getUsers,
  updateTeamUserCapabilities,
  activateTeamUser,
  deactivateTeamUser,
  deleteUser,
  listBookings,
  exportBookings,
  listNewsletterSubscribers,
  exportNewsletterSubscribers,
  listContactMessages,
  exportContactMessages,
  syncNewsletterSubscribersToMailchimp,
  deleteNewsletterSubscriber,
  listAdminNotifications,
  markAdminNotificationsRead,
  deleteAdminNotification
};
