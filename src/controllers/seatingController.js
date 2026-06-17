const seatsioService = require("../services/seatsioService");

async function getOrganizerDesignerConfig(req, res, next) {
  try {
    const data = await seatsioService.getOrganizerDesignerConfig(
      req.params.id,
      req.user.id
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function saveOrganizerSeatingConfig(req, res, next) {
  try {
    const data = await seatsioService.saveOrganizerSeatingConfig(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getPublicSeatingChart(req, res, next) {
  try {
    const prepareHold =
      req.query.prepare_hold === "1" ||
      req.query.prepare_hold === "true" ||
      req.query.prepare_hold === true ||
      req.query.session === "1" ||
      req.query.session === "true";
    const data = prepareHold
      ? await seatsioService.getBuyerSeatingSession(req.params.id)
      : await seatsioService.getPublicSeatingChart(req.params.id, { prepareHold: false });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function releaseSeatHold(req, res, next) {
  try {
    const holdToken = String(req.body?.hold_token || "").trim();
    const eventKey = String(req.body?.event_key || "").trim();
    const labels = Array.isArray(req.body?.labels)
      ? req.body.labels.map((label) => String(label || "").trim()).filter(Boolean)
      : [];
    const data = await seatsioService.releaseSeatHold({ eventKey, holdToken, labels });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function syncSeatHold(req, res, next) {
  try {
    const holdToken = String(req.body?.hold_token || "").trim();
    const eventKey = String(req.body?.event_key || "").trim();
    const add = Array.isArray(req.body?.add)
      ? req.body.add.map((label) => String(label || "").trim()).filter(Boolean)
      : [];
    const remove = Array.isArray(req.body?.remove)
      ? req.body.remove.map((label) => String(label || "").trim()).filter(Boolean)
      : [];
    const data = await seatsioService.syncSeatHoldSelection({
      eventKey,
      holdToken,
      add,
      remove
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrganizerDesignerConfig,
  saveOrganizerSeatingConfig,
  getPublicSeatingChart,
  releaseSeatHold,
  syncSeatHold
};
