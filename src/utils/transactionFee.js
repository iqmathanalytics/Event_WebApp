/** Platform transaction fee applied to ticket bookings (after discounts). */
const TRANSACTION_FEE_RATE = 0.04373;

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

function computeTransactionFee(amountAfterDiscount) {
  const base = Math.max(0, Number(amountAfterDiscount) || 0);
  if (base <= 0) {
    return 0;
  }
  return Number((base * TRANSACTION_FEE_RATE).toFixed(2));
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
    serviceFeeType: normalizeFeeType(event.service_fee_type),
    serviceFeeValue: Number(event.service_fee_value) || 0,
    platformFeeEnabled: toBoolFlag(event.platform_fee_enabled, false),
    platformFeeType: normalizeFeeType(event.platform_fee_type),
    platformFeeValue: Number(event.platform_fee_value) || 0
  };
}

function applyTransactionFee({ subtotalAmount, discountAmount = 0 }) {
  return applyCheckoutFees({ subtotalAmount, discountAmount });
}

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
  const serviceFeeAmount = computeConfigurableFee(afterDiscount, {
    enabled: config.serviceFeeEnabled,
    type: config.serviceFeeType,
    value: config.serviceFeeValue
  });
  const platformFeeAmount = computeConfigurableFee(afterDiscount, {
    enabled: config.platformFeeEnabled,
    type: config.platformFeeType,
    value: config.platformFeeValue
  });
  const transactionFeeAmount = computeTransactionFee(afterDiscount);
  const totalAmount = Number(
    (afterDiscount + serviceFeeAmount + platformFeeAmount + transactionFeeAmount).toFixed(2)
  );
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
  TRANSACTION_FEE_RATE,
  computeTransactionFee,
  computeConfigurableFee,
  feeConfigFromEvent,
  applyTransactionFee,
  applyCheckoutFees,
  toBoolFlag,
  normalizeFeeType
};
