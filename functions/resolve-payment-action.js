const {
  CHARGEBACK_STATUSES,
  FINAL_FAILURE_STATUSES,
  SETTLED_PAYMENT_STATUSES,
} = require('../constants/payment-status');

/**
 * Decides what to do with an order that is waiting for a card payment, from the
 * NETOPIA payment status.
 *
 * - `unreadable`: NETOPIA returned no status at all, which it does when it cannot read
 *   the order (a transaction from another POS, for instance). Nothing is known about
 *   this payment, so leave the order alone.
 * - `approve`: the money is in.
 * - `chargeback`: the money was taken back after it settled. Needs a human.
 * - `reject`: a final failure; this order will not be paid.
 * - `expire`: still open, but it ran out of time on your side.
 * - `pending`: still open, keep waiting.
 *
 * @param {number|string} paymentStatus The `payment.status` NETOPIA returned. A status
 *   read back from storage as a string is accepted.
 * @param {Object} [options]
 * @param {boolean} [options.expired] Whether the order ran out of time to be paid.
 * @returns {'unreadable'|'approve'|'chargeback'|'reject'|'expire'|'pending'} The action.
 */
function resolvePaymentAction(paymentStatus, { expired = false } = {}) {
  // A status out of a database column or a JSON body can arrive as a string, and
  // Array#includes compares with strict equality.
  const status = Number(paymentStatus);

  if (!status || !Number.isFinite(status)) {
    return 'unreadable';
  }

  if (SETTLED_PAYMENT_STATUSES.includes(status)) {
    return 'approve';
  }

  if (CHARGEBACK_STATUSES.includes(status)) {
    return 'chargeback';
  }

  if (FINAL_FAILURE_STATUSES.includes(status)) {
    return 'reject';
  }

  return expired ? 'expire' : 'pending';
}

module.exports = resolvePaymentAction;
