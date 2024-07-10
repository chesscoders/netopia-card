const { Netopia } = require('..');

describe('Start payment', () => {
  test('should start a payment', async () => {
    // Arrange
    const netopia = new Netopia({ sandbox: true });
    const requestData = {
      config: {
        emailTemplate: '',
        emailSubject: '',
        cancelUrl: 'https://www.my.domain/my_cancel_url',
        redirectUrl: 'https://www.my.domain/my_redirect_url',
        language: 'ro',
      },
      payment: {
        options: {
          installments: 0,
          bonus: 0,
        },
        instrument: {
          type: 'card',
          account: '9900004810225098',
          expMonth: 12,
          expYear: new Date().getFullYear() + 1,
          secretCode: '111',
          token: '',
        },
        data: {
          property1: 'string',
          property2: 'string',
        },
      },
      order: {
        ntpID: '',
        dateTime: new Date().toISOString(),
        description: 'Some order description',
        orderID: crypto.randomUUID(),
        amount: 1,
        currency: 'RON',
        billing: {
          email: 'user@example.com',
          phone: '+407xxxxxxxx',
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
          phone: '+407xxxxxxxx',
          firstName: 'First',
          lastName: 'Last',
          city: 'City',
          country: 642,
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

    const { response } = await netopia.startPayment();

    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe('101');
    expect(response.payment.paymentURL).toBeDefined();
  }, 10000);
});
