/** Exclusive deal events require sign-in; guest checkout is not allowed. */
function isExclusiveDealEvent(event) {
  if (!event) {
    return false;
  }
  return (
    event.is_yay_deal_event === 1 ||
    event.is_yay_deal_event === true ||
    String(event.is_yay_deal_event || "") === "1"
  );
}

module.exports = {
  isExclusiveDealEvent
};
