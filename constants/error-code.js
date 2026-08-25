/**
 * The `error.code` values a card start answers with.
 *
 * `APPROVED` is the only one that means the payment went through. The next two are
 * normal outcomes where nothing is settled yet, which is why `isPaymentError` still
 * reports them as errors: read the code, do not read "no error" as "paid".
 */
const ErrorCode = Object.freeze({
  APPROVED: '00',
  THREE_D_AUTH_REQUIRED: '100',
  REDIRECT_TO_PAYMENT_URL: '101',
  // Observed, not in the spec: NETOPIA answers 200 with payment.status 0 when it
  // cannot read the order at all, for instance a transaction from another POS.
  ORDER_UNREADABLE: '103',
});

module.exports = { ErrorCode };
