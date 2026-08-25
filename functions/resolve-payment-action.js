const { FINAL_FAILURE_STATUSES, SETTLED_PAYMENT_STATUSES } = require('../constants/payment-status');

/**
 * Decides what to do with an order that is waiting for a card payment, from the
 * NETOPIA payment status.
 *
 * - `unreadable`: NETOPIA returned no status at all, which it does when it cannot read
 *   the order (a transaction from another POS, for instance). Nothing is known about
 *   this payment, so leave the order alone.
 * - `approve`: the money is in.
 * - `reject`: a final failure; this order will not be paid.
 * - `expire`: still open, but it ran out of time on your side.
 * - `pending`: still open, keep waiting.
 *
 * @param {number} paymentStatus The `payment.status` NETOPIA returned.
 * @param {Object} [options]
 * @param {boolean} [options.expired] Whether the order ran out of time to be paid.
 * @returns {'unreadable'|'approve'|'reject'|'expire'|'pending'} The action to apply.
 */
function resolvePaymentAction(paymentStatus, { expired = false } = {}) {
  if (!paymentStatus) {
    return 'unreadable';
  }

  if (SETTLED_PAYMENT_STATUSES.includes(paymentStatus)) {
    return 'approve';
  }

  if (FINAL_FAILURE_STATUSES.includes(paymentStatus)) {
    return 'reject';
  }

  return expired ? 'expire' : 'pending';
}

module.exports = resolvePaymentAction;
