const {
  parseTicketLevelsFromEvent,
  filterActiveTicketLevelsForCheckout,
  enrichTicketLevelAvailability,
  sortTicketLevelsForDisplay
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
  const enriched = sortTicketLevelsForDisplay(
    activeLevels.map((level) => enrichTicketLevelAvailability(level, bookedByLevel.get(level.id) || 0)),
    event.ticket_tiers_sort
  );

  return {
    ...event,
    ticket_levels: enriched
  };
}

module.exports = {
  attachTicketLevelAvailability
};
