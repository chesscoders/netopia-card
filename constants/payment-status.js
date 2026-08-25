/**
 * NETOPIA payment statuses, as sent in `payment.status` by the start response,
 * the notification (IPN) and the order status lookup.
 *
 * The API spec only documents 3, 5, 12 and 15; the full set is the one NETOPIA
 * uses in its own SDKs.
 */
const PaymentStatus = Object.freeze({
  NEW: 1,
  OPENED: 2,
  PAID: 3,
  CANCELED: 4,
  CONFIRMED: 5,
  PENDING: 6,
  SCHEDULED: 7,
  CREDIT: 8,
  CHARGEBACK_INIT: 9,
  CHARGEBACK_ACCEPT: 10,
  ERROR: 11,
  DECLINED: 12,
  FRAUD: 13,
  PENDING_AUTH: 14,
  THREE_D_AUTH: 15,
  CHARGEBACK_REPRESENTMENT: 16,
  REVERSED: 17,
  PENDING_ANY: 18,
  PROGRAMMED_RECURRENT_PAYMENT: 19,
  CANCELED_PROGRAMMED_RECURRENT_PAYMENT: 20,
  TRIAL_PENDING: 21,
  TRIAL: 22,
  EXPIRED: 23,
});

/**
 * The money is in: deliver the goods.
 */
const SETTLED_PAYMENT_STATUSES = Object.freeze([PaymentStatus.PAID, PaymentStatus.CONFIRMED]);

/**
 * Failed attempts: this attempt will not be paid.
 *
 * Not the same as a dead order. On the NETOPIA-hosted page the customer can try
 * another card, and every attempt sends its own notification with the same orderID
 * and ntpID - observed on sandbox: five declines (11, 12) and then status 3, inside
 * 93 seconds. Record the failed attempt, keep the order open, and close it on your
 * own deadline or on EXPIRED.
 *
 * FRAUD is here as the conservative choice - NETOPIA's SDK describes 13 as "payment in
 * reviewing", so a merchant who prefers to hold such an order rather than reject it
 * should check for `PaymentStatus.FRAUD` before calling `resolvePaymentAction`.
 */
const FINAL_FAILURE_STATUSES = Object.freeze([
  PaymentStatus.CANCELED,
  PaymentStatus.ERROR,
  PaymentStatus.DECLINED,
  PaymentStatus.FRAUD,
  PaymentStatus.REVERSED,
  PaymentStatus.EXPIRED,
]);

/**
 * Money taken back after it settled: a delivered order needs a human.
 */
const CHARGEBACK_STATUSES = Object.freeze([
  PaymentStatus.CHARGEBACK_INIT,
  PaymentStatus.CHARGEBACK_ACCEPT,
  PaymentStatus.CHARGEBACK_REPRESENTMENT,
]);

module.exports = {
  CHARGEBACK_STATUSES,
  FINAL_FAILURE_STATUSES,
  PaymentStatus,
  SETTLED_PAYMENT_STATUSES,
};
