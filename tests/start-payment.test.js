jest.mock('axios');

const axios = require('axios');
const { Netopia } = require('..');

// The documented answer for a payment NETOPIA hosts on its own page.
const RESPONSE = {
  customerAction: {},
  error: { code: '101', message: 'Redirect user to payment URL' },
  payment: {
    amount: 1,
    currency: 'RON',
    ntpID: '1309088',
    paymentURL: 'https://secure.sandbox.netopia-payments.com/ui/card',
    status: 1,
  },
};

describe('Start payment', () => {
  let netopia;

  beforeEach(() => {
    // The shipped .env.example sets this, and dotenv would leak it into the payload.
    delete process.env.NETOPIA_CANCEL_URL;
    axios.mockReset();
    axios.mockResolvedValue({ data: RESPONSE });
    netopia = new Netopia({
      apiKey: 'test-api-key',
      notifyUrl: 'https://example.com/api/payment/notify',
      posSignature: 'XXXX-XXXX-XXXX-XXXX-XXXX',
      redirectUrl: 'https://example.com/redirect',
      sandbox: true,
    });
  });

  test('should start a payment', async () => {
    // Arrange
    const requestData = {
      order: {
        dateTime: '2024-01-01T00:00:00.000Z',
        description: 'Some order description',
        orderID: 'f9b7d1f0-0000-4000-8000-000000000001',
        amount: 1,
        currency: 'RON',
        billing: {
          email: 'user@example.com',
          phone: '+40712345678',
          firstName: 'First',
          lastName: 'Last',
          city: 'City',
          country: 642,
          countryName: 'Country',
          state: 'State',
          postalCode: 'Zip',
          details: '',
        },
        shipping: {
          email: 'user@example.com',
          phone: '+40712345678',
          firstName: 'First',
          lastName: 'Last',
          city: 'City',
          country: '642',
          state: 'State',
          postalCode: 'Zip',
          details: '',
        },
        products: [
          {
            name: 'name',
            code: 'SKU',
            category: 'category',
            price: 1,
            vat: 19,
          },
        ],
        installments: {
          selected: 0,
          available: [0],
        },
        data: {
          property1: 'string',
          property2: 'string',
        },
      },
    };

    // Act
    netopia.setOrderData(requestData.order);
    netopia.setProductsData(requestData.order.products);
    const response = await netopia.startPayment();

    // Assert
    expect(response).toEqual(RESPONSE);
    expect(response.error.code).toBe('101');
    expect(response.payment.paymentURL).toBeDefined();

    const request = axios.mock.calls[0][0];
    expect(request.url).toBe('https://secure.sandbox.netopia-payments.com/payment/card/start');
    expect(request.method).toBe('POST');
    expect(request.headers.Authorization).toBe('test-api-key');
    expect(request.data.config).toEqual({
      language: 'ro',
      notifyUrl: 'https://example.com/api/payment/notify',
      redirectUrl: 'https://example.com/redirect',
    });
    expect(request.data.order.billing.phone).toBe('+40712345678');
    expect(request.data.order.shipping.country).toBe(642);
    expect(request.data.order.data).toEqual(requestData.order.data);
    expect(request.data.order.products).toHaveLength(1);
    // order.installments is "Not used" per the spec; installments go in payment.options
    expect(request.data.order).not.toHaveProperty('installments');
  });

  test('propagates the API error message', async () => {
    // Arrange
    axios.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        response: { data: { message: 'Unauthorized' }, status: 401 },
      })
    );
    netopia.setOrderData({
      amount: 1,
      billing: { email: 'user@example.com', firstName: 'First', lastName: 'Last' },
      orderID: 'order-1',
    });

    // Act & Assert
    await expect(netopia.startPayment()).rejects.toThrow('Unauthorized');
  });
});
