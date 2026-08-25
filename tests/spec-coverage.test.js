const { collectBrowserInfo, isPaymentError, Netopia } = require('..');

const OPTIONS = {
  apiKey: 'test-api-key',
  notifyUrl: 'https://example.com/api/payment/notify',
  posSignature: 'XXXX-XXXX-XXXX-XXXX-XXXX',
  redirectUrl: 'https://example.com/redirect',
  sandbox: true,
};

const ORDER = {
  amount: 1,
  billing: {
    email: 'user@example.com',
    firstName: 'First',
    lastName: 'Last',
    phone: '0712345678',
  },
  dateTime: '2024-01-01T00:00:00.000Z',
  orderID: 'order-1',
};

const CARD = { account: '4111111111111111', expMonth: '1', expYear: '2030', secretCode: '123' };

const BROWSER = {
  BROWSER_COLOR_DEPTH: 24,
  BROWSER_LANGUAGE: 'ro',
  BROWSER_SCREEN_HEIGHT: 1080,
  BROWSER_SCREEN_WIDTH: 1920,
  BROWSER_TZ: 'Europe/Bucharest',
  BROWSER_USER_AGENT: 'UA',
  MOBILE: false,
};

function stub(overrides) {
  const netopia = new Netopia({ ...OPTIONS, ...overrides });
  jest.spyOn(netopia, 'sendRequest').mockResolvedValue({});
  return netopia;
}

function sentData(netopia, call = 0) {
  return netopia.sendRequest.mock.calls[call][2];
}

describe('isPaymentError', () => {
  test("only '00' is not an error", () => {
    expect(isPaymentError('00')).toBe(false);
  });

  // '100' and '101' are normal outcomes, but nothing is settled yet: a caller that
  // reads "not an error" as "paid" would fulfil before the customer has paid.
  test.each(['100', '101', '56', '99', '', undefined])('%s is an error', (code) => {
    expect(isPaymentError(code)).toBe(true);
  });
});

describe('payment.instrument', () => {
  test('is sent with the mandatory type and coerced expiry', () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setPaymentData(CARD);

    // Assert
    expect(netopia.payment.instrument).toEqual({
      type: 'card',
      account: '4111111111111111',
      expMonth: 1,
      expYear: 2030,
      secretCode: '123',
    });
    expect(Object.keys(netopia.payment.instrument)[0]).toBe('type');
  });

  test.each([
    ['a placeholder month', { expMonth: 'MM' }, 'Invalid Expiration month'],
    ['a placeholder year', { expYear: 'YYYY' }, 'Invalid Expiration year'],
    ['month 13', { expMonth: 13 }, 'Invalid Expiration month'],
    ['month 0', { expMonth: 0 }, 'Invalid Expiration month'],
    ['a two-digit year', { expYear: '30' }, 'Invalid Expiration year'],
    ['a five-digit secret code', { secretCode: '12345' }, 'Invalid Secret code'],
  ])('rejects %s instead of sending it next to the card number', (_name, patch, message) => {
    expect(() => stub().setPaymentData({ ...CARD, ...patch })).toThrow(message);
  });
});

describe('payment.options', () => {
  test('forwards installments and bonus as integers', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    netopia.setPaymentOptions({ installments: '3', bonus: 0 });
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).payment.options).toEqual({ installments: 3, bonus: 0 });
  });

  test('drops split, which the gateway does not support yet', () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setPaymentOptions({ installments: 3, split: [{ posID: 1, amount: 0.5 }] });

    // Assert
    expect(netopia.payment.options).toEqual({ installments: 3 });
  });

  test.each([
    ['no options at all', undefined, 'Payment options are required'],
    ['an empty object', {}, 'Payment options must include installments or bonus'],
    ['a typo', { instalments: 3 }, 'Payment options must include installments or bonus'],
    ['a fractional value', { installments: 1.5 }, 'Invalid installments'],
    ['a negative value', { bonus: -1 }, 'Invalid bonus'],
  ])('throws on %s instead of silently sending nothing', (_name, options, message) => {
    expect(() => stub().setPaymentOptions(options)).toThrow(message);
  });
});

describe('Optional order fields', () => {
  const shipping = { email: 'user@example.com', city: 'City', country: 642 };
  const data = { property1: 'value' };

  test('are forwarded when passed', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, shipping, data, clientID: 'client-1' });
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).order).toMatchObject({ shipping, data, clientID: 'client-1' });
  });

  test('do not survive into the next order on a reused instance', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, shipping, data, clientID: 'client-1' });
    await netopia.startPayment();
    netopia.setOrderData({ ...ORDER, orderID: 'order-2' });
    await netopia.startPayment();

    // Assert
    const second = JSON.parse(JSON.stringify(sentData(netopia, 1).order));
    expect(second.orderID).toBe('order-2');
    expect(second).not.toHaveProperty('shipping');
    expect(second).not.toHaveProperty('data');
    expect(second).not.toHaveProperty('clientID');
  });

  test('do not carry the previous basket into the next order', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    netopia.setProductsData([{ name: 'Laptop', code: 'c', category: 'cat', price: 500, vat: 19 }]);
    await netopia.startPayment();
    netopia.setOrderData({ ...ORDER, orderID: 'order-2', amount: 5 });
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia, 0).order.products).toHaveLength(1);
    expect(sentData(netopia, 1).order).not.toHaveProperty('products');
  });

  test('exclude order.installments and order.ntpID, which the spec does not use', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, ntpID: '', installments: { selected: 3, available: [3] } });
    await netopia.startPayment();

    // Assert
    expect(Object.keys(sentData(netopia).order)).toEqual([
      'amount',
      'billing',
      'currency',
      'dateTime',
      'description',
      'orderID',
      'posSignature',
    ]);
  });
});

describe('order.amount', () => {
  test('accepts 0, which the spec reserves for account verification', () => {
    expect(() => stub().setOrderData({ ...ORDER, amount: 0 })).not.toThrow();
  });

  // [] coerces to 0, a legal account-verification amount; a typeof guard would
  // also reject Decimal/BigNumber money types, so only the value is checked.
  test.each([-5, 'abc', {}, NaN])('rejects %s', (amount) => {
    expect(() => stub().setOrderData({ ...ORDER, amount })).toThrow(/Amount/);
  });
});

describe('Card data', () => {
  test.each([
    ['an object account', { account: {} }, 'Invalid Account number'],
    ['an array account', { account: ['4111111111111111'] }, 'Invalid Account number'],
    ['a numeric account', { account: 4111111111111111 }, 'Invalid Account number'],
    ['a non-digit account', { account: '4111-1111-1111-1111' }, 'Invalid Account number'],
    ['an array secret code', { secretCode: [] }, 'Invalid Secret code'],
    ['a two-digit secret code', { secretCode: '12' }, 'Invalid Secret code'],
    ['a five-digit secret code', { secretCode: '12345' }, 'Invalid Secret code'],
  ])('rejects %s', (_name, patch, message) => {
    expect(() => stub().setPaymentData({ ...CARD, ...patch })).toThrow(message);
  });

  test('trims and normalizes what it sends', () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setPaymentData({ ...CARD, account: ' 4111111111111111 ', secretCode: 123 });

    // Assert
    expect(netopia.payment.instrument.account).toBe('4111111111111111');
    expect(netopia.payment.instrument.secretCode).toBe('123');
  });
});

describe('billing.countryName', () => {
  test.each([
    ['defaults to Romania for the default country', undefined, 'Romania'],
    ['defaults to Romania for country 642', 642, 'Romania'],
    ['is left empty for another country', 276, ''],
  ])('%s', (_name, country, expected) => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, billing: { ...ORDER.billing, country } });

    // Assert
    expect(netopia.order.billing.countryName).toBe(expected);
  });

  test('keeps an explicit countryName', () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({
      ...ORDER,
      billing: { ...ORDER.billing, country: 276, countryName: 'Germany' },
    });

    // Assert
    expect(netopia.order.billing.countryName).toBe('Germany');
  });
});

describe('startPayment', () => {
  test('does not mutate the instance, so a second call sends the same request', async () => {
    // Arrange
    const netopia = stub({ cancelUrl: 'https://example.com/cancel' });

    // Act
    netopia.setOrderData(ORDER);
    await netopia.startPayment();
    await netopia.startPayment();

    // Assert
    expect(netopia.config).toEqual({ language: 'ro' });
    expect(netopia.order).not.toHaveProperty('posSignature');
    expect(JSON.stringify(sentData(netopia, 1))).toBe(JSON.stringify(sentData(netopia, 0)));
  });

  test('sends a payment snapshot, not a live view of the instance', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    netopia.setPaymentData(CARD);
    await netopia.startPayment();
    netopia.setPaymentData({ ...CARD, account: '5555555555554444' });

    // Assert
    expect(sentData(netopia).payment).not.toBe(netopia.payment);
    // Shallow would share this object, so the sent PAN could still be rewritten.
    expect(sentData(netopia).payment.instrument).not.toBe(netopia.payment.instrument);
    expect(sentData(netopia).payment.instrument.account).toBe('4111111111111111');
  });

  test.each([
    ['notifyUrl', 'Invalid Notify URL'],
    ['redirectUrl', 'Invalid Redirect URL'],
    ['cancelUrl', 'Invalid Cancel URL'],
  ])('names the offending URL when %s is not absolute', async (option, message) => {
    // Arrange
    const netopia = stub({ [option]: 'example.com/path' });

    // Act
    netopia.setOrderData(ORDER);

    // Assert
    await expect(netopia.startPayment()).rejects.toThrow(message);
  });
});

describe('verifyAuth', () => {
  const AUTH = { authenticationToken: 'token', ntpID: '1310396', formData: { paRes: 'x' } };

  test('posts the 3-D Secure authorization to the card verify-auth endpoint', async () => {
    // Arrange
    const netopia = stub();

    // Act
    await netopia.verifyAuth(AUTH);

    // Assert
    const [url, method, data] = netopia.sendRequest.mock.calls[0];
    expect(url).toBe('https://secure.sandbox.netopia-payments.com/payment/card/verify-auth');
    expect(method).toBe('POST');
    expect(data).toEqual(AUTH);
  });

  test.each([
    ['no data', undefined, 'Authentication data is required'],
    ['no token', { ntpID: '1', formData: { paRes: 'x' } }, 'Authentication token is required'],
    ['no ntpID', { authenticationToken: 't', formData: { paRes: 'x' } }, 'NETOPIA ID is required'],
    ['no formData', { authenticationToken: 't', ntpID: '1' }, 'Form data is required'],
    [
      'empty formData',
      { authenticationToken: 't', ntpID: '1', formData: {} },
      'Form data cannot be empty',
    ],
  ])('throws with %s', async (_name, authData, message) => {
    await expect(stub().verifyAuth(authData)).rejects.toThrow(message);
  });
});

describe('collectBrowserInfo', () => {
  test('collects SCREEN_PRINT, which setBrowserData forwards', () => {
    // Arrange
    const navigator = { language: 'ro-RO', userAgent: 'Mozilla/5.0' };
    const window = {
      screen: { availHeight: 1053, availWidth: 1853, colorDepth: 24, height: 1080, width: 1920 },
    };
    const netopia = stub();

    // Act
    const info = collectBrowserInfo(navigator, window);
    netopia.setBrowserData(info, '1.2.3.4');

    // Assert
    expect(info.SCREEN_PRINT).toBe(
      'Current Resolution: 1920x1080, Available Resolution: 1853x1053, ' +
        'Color Depth: 24, Device XDPI: undefined, Device YDPI: undefined'
    );
    expect(netopia.payment.data.SCREEN_PRINT).toBe(info.SCREEN_PRINT);
  });
});

describe('order.shipping', () => {
  const shipping = {
    email: 'user@example.com',
    city: 'City',
    country: '642',
  };

  test('sends country as the integer the schema declares', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, shipping });
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).order.shipping.country).toBe(642);
    expect(shipping.country).toBe('642');
  });

  test('forwards a shipping address without a country as it is', async () => {
    // Arrange
    const netopia = stub();
    const withoutCountry = { email: 'user@example.com', city: 'City' };

    // Act
    netopia.setOrderData({ ...ORDER, shipping: withoutCountry });
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).order.shipping).toEqual(withoutCountry);
  });

  test.each([
    ['RO', 'Shipping'],
    [642.5, 'Shipping'],
  ])('rejects country %s instead of sending null', (country) => {
    expect(() => stub().setOrderData({ ...ORDER, shipping: { ...shipping, country } })).toThrow(
      'Invalid Shipping country'
    );
  });

  // A form that posts an unselected <select> sends 0 or an empty string. Both used
  // to become 642/Romania on billing while shipping threw.
  test.each(['RO', 0, '', false, 895])('rejects billing country %s', (country) => {
    expect(() => stub().setOrderData({ ...ORDER, billing: { ...ORDER.billing, country } })).toThrow(
      'Invalid Billing country'
    );
  });

  test('still defaults to Romania when the country is absent', () => {
    const netopia = stub();
    const billing = { ...ORDER.billing };
    delete billing.country;

    netopia.setOrderData({ ...ORDER, billing });

    expect(netopia.order.billing.country).toBe(642);
    expect(netopia.order.billing.countryName).toBe('Romania');
  });

  test.each([
    ['a shipping string', { shipping: 'Str. X 1' }, 'Invalid Shipping details'],
    ['an order data string', { data: 'x' }, 'Invalid Order data'],
  ])('rejects %s, which the schema declares an object', (_name, patch, message) => {
    expect(() => stub().setOrderData({ ...ORDER, ...patch })).toThrow(message);
  });
});

describe('reset', () => {
  test('clears the order and the whole payment, including instrument and options', async () => {
    // Arrange
    const netopia = stub();
    netopia.setOrderData(ORDER);
    netopia.setPaymentData(CARD);
    netopia.setPaymentOptions({ installments: 3 });
    netopia.setBrowserData(BROWSER, '1.2.3.4');

    // Act
    netopia.reset();

    // Assert
    expect(netopia.order).toEqual({});
    expect(netopia.payment).toEqual({});
    expect(netopia.payment.instrument).toBeUndefined();
    expect(netopia.payment.options).toBeUndefined();
    expect(netopia.payment.data).toBeUndefined();
  });

  test('leaves the instance usable for the next order', async () => {
    // Arrange
    const netopia = stub();
    netopia.setOrderData(ORDER);
    netopia.setPaymentData(CARD);
    await netopia.startPayment();

    // Act
    netopia.reset();
    netopia.setOrderData({ ...ORDER, orderID: 'order-2' });
    await netopia.startPayment();

    // Assert
    const second = sentData(netopia, 1);
    expect(second.order.orderID).toBe('order-2');
    expect(second.payment).toEqual({});
    expect(netopia.config).toEqual({ language: 'ro' });
  });
});

describe('Input coercion traps', () => {
  test.each([
    ['an empty array', []],
    ['an empty string', ''],
    ['a boolean', true],
  ])('rejects amount %s, which Number() would turn into 0 or 1', (_name, amount) => {
    // An empty string is caught by validateField first, with its own message.
    expect(() => stub().setOrderData({ ...ORDER, amount })).toThrow(/Amount/);
  });

  test.each([
    ['an empty select', ''],
    ['zero', 0],
    ['a boolean', true],
    ['out of range', 895],
  ])('rejects shipping country %s, which is not an ISO 3166-1 code', (_name, country) => {
    expect(() => stub().setOrderData({ ...ORDER, shipping: { city: 'City', country } })).toThrow(
      'Invalid Shipping country'
    );
  });

  test('accepts the ends of the ISO 3166-1 range', () => {
    expect(() =>
      stub().setOrderData({
        ...ORDER,
        shipping: { country: 4 },
        billing: { ...ORDER.billing, country: 894 },
      })
    ).not.toThrow();
  });

  test.each([
    ['an array shipping', { shipping: [] }, 'Invalid Shipping details'],
    ['an array data', { data: [] }, 'Invalid Order data'],
    ['an object clientID', { clientID: {} }, 'Invalid Client ID'],
  ])('rejects %s', (_name, patch, message) => {
    expect(() => stub().setOrderData({ ...ORDER, ...patch })).toThrow(message);
  });

  test.each([
    ['installments', { installments: '' }],
    ['bonus', { bonus: [] }],
  ])('rejects %s that Number() would read as 0', (name, options) => {
    expect(() => stub().setPaymentOptions(options)).toThrow(`Invalid ${name}`);
  });
});

describe('startPayment credentials', () => {
  test('rejects a whitespace-only POS signature', async () => {
    const netopia = stub({ posSignature: '   ' });
    netopia.setOrderData(ORDER);

    await expect(netopia.startPayment()).rejects.toThrow(
      'POS signature cannot be empty or just whitespace'
    );
  });

  test.each(['javascript:alert(1)', 'file:///etc/passwd', 'ftp://example.com/x'])(
    'rejects %s as a notify URL',
    async (notifyUrl) => {
      const netopia = stub({ notifyUrl });
      netopia.setOrderData(ORDER);

      await expect(netopia.startPayment()).rejects.toThrow('Invalid Notify URL');
    }
  );
});

describe('verifyAuth formData', () => {
  test('rejects the raw string rawTextBodyParser produces', async () => {
    await expect(
      stub().verifyAuth({
        authenticationToken: 't',
        ntpID: '1',
        formData: '{"paRes":"x"}',
      })
    ).rejects.toThrow('Invalid Form data');
  });

  test('rejects an array', async () => {
    await expect(
      stub().verifyAuth({ authenticationToken: 't', ntpID: '1', formData: ['paRes'] })
    ).rejects.toThrow('Invalid Form data');
  });
});
