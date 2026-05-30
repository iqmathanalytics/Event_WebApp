/** Platform transaction fee applied to ticket bookings (after discounts). */
const TRANSACTION_FEE_RATE = 0.029;

function computeTransactionFee(amountAfterDiscount) {
  const base = Math.max(0, Number(amountAfterDiscount) || 0);
  if (base <= 0) {
    return 0;
  }
  return Number((base * TRANSACTION_FEE_RATE).toFixed(2));
}

function applyTransactionFee({ subtotalAmount, discountAmount = 0 }) {
  const subtotal = Number(subtotalAmount) || 0;
  const discount = Math.max(0, Number(discountAmount) || 0);
  const afterDiscount = Number(Math.max(0, subtotal - discount).toFixed(2));
  const transactionFeeAmount = computeTransactionFee(afterDiscount);
  const totalAmount = Number((afterDiscount + transactionFeeAmount).toFixed(2));
  return {
    subtotalAmount: subtotal,
    discountAmount: discount,
    afterDiscountAmount: afterDiscount,
    transactionFeeAmount,
    totalAmount
  };
}

module.exports = {
  TRANSACTION_FEE_RATE,
  computeTransactionFee,
  applyTransactionFee
};
