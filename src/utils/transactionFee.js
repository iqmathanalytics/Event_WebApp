/** Platform service fee rate applied to ticket bookings (after discounts) when enabled. */
const SERVICE_FEE_RATE = 0.04373;
/** @deprecated Use SERVICE_FEE_RATE — kept for older imports. */
const TRANSACTION_FEE_RATE = SERVICE_FEE_RATE;

function toBoolFlag(raw, defaultValue = false) {
  if (raw === undefined || raw === null) {
    return defaultValue;
  }
  if (typeof raw === "boolean") {
    return raw;
  }
  return Number(raw) !== 0 && String(raw) !== "0" && String(raw).toLowerCase() !== "false";
}

function normalizeFeeType(raw) {
  return String(raw || "percent").toLowerCase() === "fixed" ? "fixed" : "percent";
}

/** Fixed-rate service fee (formerly labeled transaction fee). */
function computeServiceFee(amountAfterDiscount) {
  const base = Math.max(0, Number(amountAfterDiscount) || 0);
  if (base <= 0) {
    return 0;
  }
  return Number((base * SERVICE_FEE_RATE).toFixed(2));
}

/** @deprecated Use computeServiceFee */
function computeTransactionFee(amountAfterDiscount) {
  return computeServiceFee(amountAfterDiscount);
}

function computeConfigurableFee(amountAfterDiscount, { enabled, type, value }) {
  if (!enabled) {
    return 0;
  }
  const feeValue = Math.max(0, Number(value) || 0);
  if (feeValue <= 0) {
    return 0;
  }
  const base = Math.max(0, Number(amountAfterDiscount) || 0);
  if (normalizeFeeType(type) === "fixed") {
    return Number(feeValue.toFixed(2));
  }
  if (base <= 0) {
    return 0;
  }
  return Number(((base * feeValue) / 100).toFixed(2));
}

function feeConfigFromEvent(event = {}) {
  return {
    serviceFeeEnabled: toBoolFlag(event.service_fee_enabled, false),
    platformFeeEnabled: toBoolFlag(event.platform_fee_enabled, false),
    platformFeeType: normalizeFeeType(event.platform_fee_type),
    platformFeeValue: Number(event.platform_fee_value) || 0
  };
}

function applyTransactionFee({ subtotalAmount, discountAmount = 0 }) {
  return applyCheckoutFees({ subtotalAmount, discountAmount });
}

/**
 * Checkout totals.
 * Service fee = fixed platform rate when `service_fee_enabled` is on; otherwise 0.
 * Platform fee remains a separate optional fee.
 */
function applyCheckoutFees({
  subtotalAmount,
  discountAmount = 0,
  event = null,
  feeConfig = null
}) {
  const subtotal = Number(subtotalAmount) || 0;
  const discount = Math.max(0, Number(discountAmount) || 0);
  const afterDiscount = Number(Math.max(0, subtotal - discount).toFixed(2));
  const config = feeConfig || (event ? feeConfigFromEvent(event) : {});
  const serviceFeeAmount = config.serviceFeeEnabled ? computeServiceFee(afterDiscount) : 0;
  const platformFeeAmount = computeConfigurableFee(afterDiscount, {
    enabled: config.platformFeeEnabled,
    type: config.platformFeeType,
    value: config.platformFeeValue
  });
  // Alias for older booking/stripe snapshots that still read transactionFeeAmount.
  const transactionFeeAmount = serviceFeeAmount;
  const totalAmount = Number((afterDiscount + serviceFeeAmount + platformFeeAmount).toFixed(2));
  return {
    subtotalAmount: subtotal,
    discountAmount: discount,
    afterDiscountAmount: afterDiscount,
    serviceFeeAmount,
    platformFeeAmount,
    transactionFeeAmount,
    totalAmount
  };
}

module.exports = {
  SERVICE_FEE_RATE,
  TRANSACTION_FEE_RATE,
  computeServiceFee,
  computeTransactionFee,
  computeConfigurableFee,
  feeConfigFromEvent,
  applyTransactionFee,
  applyCheckoutFees,
  toBoolFlag,
  normalizeFeeType
};
