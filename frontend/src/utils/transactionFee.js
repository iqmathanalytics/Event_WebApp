/** Platform service fee rate applied to ticket bookings (after discounts) when enabled. */
export const SERVICE_FEE_RATE = 0.04373;
/** @deprecated Use SERVICE_FEE_RATE — kept for older imports. */
export const TRANSACTION_FEE_RATE = SERVICE_FEE_RATE;

export function toBoolFlag(raw, defaultValue = false) {
  if (raw === undefined || raw === null) {
    return defaultValue;
  }
  if (typeof raw === "boolean") {
    return raw;
  }
  return Number(raw) !== 0 && String(raw) !== "0" && String(raw).toLowerCase() !== "false";
}

export function normalizeFeeType(raw) {
  return String(raw || "percent").toLowerCase() === "fixed" ? "fixed" : "percent";
}

/** Fixed-rate service fee (formerly labeled transaction fee). */
export function computeServiceFee(amountAfterDiscount) {
  const base = Math.max(0, Number(amountAfterDiscount) || 0);
  if (base <= 0) {
    return 0;
  }
  return Number((base * SERVICE_FEE_RATE).toFixed(2));
}

/** @deprecated Use computeServiceFee */
export function computeTransactionFee(amountAfterDiscount) {
  return computeServiceFee(amountAfterDiscount);
}

export function computeConfigurableFee(amountAfterDiscount, { enabled, type, value }) {
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

export function feeConfigFromEvent(event = {}) {
  return {
    serviceFeeEnabled: toBoolFlag(event.service_fee_enabled, false),
    platformFeeEnabled: toBoolFlag(event.platform_fee_enabled, false),
    platformFeeType: normalizeFeeType(event.platform_fee_type),
    platformFeeValue: Number(event.platform_fee_value) || 0
  };
}

export function applyTransactionFee({ subtotalAmount, discountAmount = 0 }) {
  return applyCheckoutFees({ subtotalAmount, discountAmount });
}

/**
 * Checkout totals.
 * Service fee = fixed platform rate when `service_fee_enabled` is on; otherwise 0.
 * Platform fee remains a separate optional fee.
 */
export function applyCheckoutFees({
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
