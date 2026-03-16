const asyncHandler = require("../utils/asyncHandler");
const contactService = require("../services/contactService");

const submitContact = asyncHandler(async (req, res) => {
  const result = await contactService.submitContact(req.validated.body);
  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: result
  });
});

module.exports = { submitContact };
