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

  test.each([
    ['PAID', 3],
    ['CONFIRMED', 5],
    ['DECLINED', 12],
    ['THREE_D_AUTH', 15],
    ['EXPIRED', 23],
  ])('%s is %i', (name, value) => {
    expect(PaymentStatus[name]).toBe(value);
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
    ['a chargeback', PaymentStatus.CHARGEBACK_INIT, {}, 'pending'],
  ])('%s -> %s', (_name, status, options, expected) => {
    expect(resolvePaymentAction(status, options)).toBe(expected);
  });

  test('does not need options', () => {
    expect(resolvePaymentAction(PaymentStatus.PAID)).toBe('approve');
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
