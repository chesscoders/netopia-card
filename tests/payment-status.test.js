const {
  captureRawBody,
  CHARGEBACK_STATUSES,
  ErrorCode,
  FINAL_FAILURE_STATUSES,
  PaymentStatus,
  resolvePaymentAction,
  SETTLED_PAYMENT_STATUSES,
} = require('..');

describe('PaymentStatus', () => {
  test('covers the whole NETOPIA range with unique values', () => {
    const values = Object.values(PaymentStatus);

    expect(values).toHaveLength(23);
    expect(new Set(values).size).toBe(23);
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(23);
  });

  // The numbers are the protocol: pin every one, or a swapped pair stays green.
  test('maps every name to the number NETOPIA sends', () => {
    expect(PaymentStatus).toEqual({
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
  });

  test('groups the right numbers', () => {
    expect(SETTLED_PAYMENT_STATUSES).toEqual([3, 5]);
    expect(FINAL_FAILURE_STATUSES).toEqual([4, 11, 12, 13, 17, 23]);
    expect(CHARGEBACK_STATUSES).toEqual([9, 10, 16]);
  });

  test.each([
    ['PaymentStatus', PaymentStatus],
    ['SETTLED_PAYMENT_STATUSES', SETTLED_PAYMENT_STATUSES],
    ['FINAL_FAILURE_STATUSES', FINAL_FAILURE_STATUSES],
    ['CHARGEBACK_STATUSES', CHARGEBACK_STATUSES],
    ['ErrorCode', ErrorCode],
  ])('%s is frozen', (_name, exported) => {
    expect(Object.isFrozen(exported)).toBe(true);
  });

  test('never counts a status as both settled and a final failure', () => {
    const overlap = SETTLED_PAYMENT_STATUSES.filter((status) =>
      FINAL_FAILURE_STATUSES.includes(status)
    );

    expect(overlap).toEqual([]);
  });
});

describe('ErrorCode', () => {
  test.each([
    ['APPROVED', '00'],
    ['THREE_D_AUTH_REQUIRED', '100'],
    ['REDIRECT_TO_PAYMENT_URL', '101'],
    ['ORDER_UNREADABLE', '103'],
  ])('%s is %s', (name, value) => {
    expect(ErrorCode[name]).toBe(value);
  });
});

describe('resolvePaymentAction', () => {
  test.each([
    ['no status at all', 0, {}, 'unreadable'],
    ['undefined', undefined, {}, 'unreadable'],
    ['paid', PaymentStatus.PAID, {}, 'approve'],
    ['confirmed', PaymentStatus.CONFIRMED, {}, 'approve'],
    ['paid and expired', PaymentStatus.PAID, { expired: true }, 'approve'],
    ['canceled', PaymentStatus.CANCELED, {}, 'reject'],
    ['declined', PaymentStatus.DECLINED, {}, 'reject'],
    ['fraud', PaymentStatus.FRAUD, {}, 'reject'],
    ['reversed', PaymentStatus.REVERSED, {}, 'reject'],
    ['expired by NETOPIA', PaymentStatus.EXPIRED, {}, 'reject'],
    ['error', PaymentStatus.ERROR, {}, 'reject'],
    ['3-D Secure pending', PaymentStatus.THREE_D_AUTH, {}, 'pending'],
    ['new', PaymentStatus.NEW, {}, 'pending'],
    ['pending auth past the deadline', PaymentStatus.PENDING_AUTH, { expired: true }, 'expire'],
    ['open past the deadline', PaymentStatus.OPENED, { expired: true }, 'expire'],
    ['a chargeback', PaymentStatus.CHARGEBACK_INIT, {}, 'chargeback'],
    ['an accepted chargeback', PaymentStatus.CHARGEBACK_ACCEPT, {}, 'chargeback'],
    ['a representment', PaymentStatus.CHARGEBACK_REPRESENTMENT, { expired: true }, 'chargeback'],
  ])('%s -> %s', (_name, status, options, expected) => {
    expect(resolvePaymentAction(status, options)).toBe(expected);
  });

  test('does not need options', () => {
    expect(resolvePaymentAction(PaymentStatus.PAID)).toBe('approve');
  });

  // A status column read back as a string used to fall through to pending.
  test.each([
    ['3', 'approve'],
    ['5', 'approve'],
    ['12', 'reject'],
    ['9', 'chargeback'],
    ['15', 'pending'],
    ['', 'unreadable'],
    ['not a status', 'unreadable'],
  ])('reads a string status %s as %s', (status, expected) => {
    expect(resolvePaymentAction(status)).toBe(expected);
  });
});

describe('captureRawBody', () => {
  test('keeps the bytes on the request', () => {
    const req = {};
    const buffer = Buffer.from('{"payment":{"status":5}}');

    captureRawBody(req, {}, buffer);

    expect(req.rawBody).toBe(buffer);
  });
});
