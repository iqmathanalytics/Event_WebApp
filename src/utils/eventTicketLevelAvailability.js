const {
  parseTicketLevelsFromEvent,
  filterActiveTicketLevelsForCheckout,
  enrichTicketLevelAvailability
} = require("./eventTicketLevels");
const { countBookedTicketsByLevelForEvent } = require("../models/bookingModel");

async function attachTicketLevelAvailability(event, options = {}) {
  if (!event) {
    return event;
  }
  const allLevels = parseTicketLevelsFromEvent(event);
  if (!allLevels.length) {
    return event;
  }

  const activeLevels = filterActiveTicketLevelsForCheckout(allLevels);
  const bookedByLevel = await countBookedTicketsByLevelForEvent(event.id, options);
  const enriched = activeLevels.map((level) =>
    enrichTicketLevelAvailability(level, bookedByLevel.get(level.id) || 0)
  );

  return {
    ...event,
    ticket_levels: enriched
  };
}

module.exports = {
  attachTicketLevelAvailability
};
