const { Netopia } = require('..');

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

// Captures the request payload instead of calling the Netopia API.
function stub(overrides) {
  const netopia = new Netopia({ ...OPTIONS, ...overrides });
  jest.spyOn(netopia, 'sendRequest').mockResolvedValue({});
  return netopia;
}

function sentData(netopia) {
  return netopia.sendRequest.mock.calls[0][2];
}

describe('Optional billing.phone', () => {
  test('a valid phone is sent unchanged, in the same request as before', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    await netopia.startPayment();

    // Assert
    expect(netopia.order.billing.phone).toBe('0712345678');
    expect(JSON.stringify(sentData(netopia))).toBe(
      '{"config":{"language":"ro",' +
        '"notifyUrl":"https://example.com/api/payment/notify",' +
        '"redirectUrl":"https://example.com/redirect"},' +
        '"order":{"amount":1,"billing":{"city":"","country":642,"countryName":"Romania",' +
        '"details":"","email":"user@example.com","firstName":"First","lastName":"Last",' +
        '"phone":"0712345678","postalCode":"","state":""},' +
        '"currency":"RON","dateTime":"2024-01-01T00:00:00.000Z","description":"",' +
        '"orderID":"order-1","posSignature":"XXXX-XXXX-XXXX-XXXX-XXXX"},' +
        '"payment":{}}'
    );
  });

  test.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('%s is omitted from the payload', async (_name, phone) => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData({ ...ORDER, billing: { ...ORDER.billing, phone } });
    await netopia.startPayment();

    // Assert
    expect(netopia.order.billing).not.toHaveProperty('phone');
    expect(sentData(netopia).order.billing).not.toHaveProperty('phone');
    expect(JSON.stringify(sentData(netopia))).not.toContain('phone');
  });
});

describe('Optional config.cancelUrl', () => {
  const { NETOPIA_CANCEL_URL } = process.env;

  beforeEach(() => {
    delete process.env.NETOPIA_CANCEL_URL;
  });

  afterAll(() => {
    if (NETOPIA_CANCEL_URL != null) {
      process.env.NETOPIA_CANCEL_URL = NETOPIA_CANCEL_URL;
    }
  });

  test('is absent when not set', async () => {
    // Arrange
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).config).not.toHaveProperty('cancelUrl');
  });

  test('is normalized when set through the constructor', async () => {
    // Arrange
    const netopia = stub({ cancelUrl: 'https://example.com' });

    // Act
    netopia.setOrderData(ORDER);
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).config.cancelUrl).toBe('https://example.com/');
  });

  test('falls back to NETOPIA_CANCEL_URL', async () => {
    // Arrange
    process.env.NETOPIA_CANCEL_URL = 'https://example.com/cancel';
    const netopia = stub();

    // Act
    netopia.setOrderData(ORDER);
    await netopia.startPayment();

    // Assert
    expect(sentData(netopia).config.cancelUrl).toBe('https://example.com/cancel');
  });
});
