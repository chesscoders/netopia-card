const { Netopia } = require('..');

describe('Start payment', () => {
  let netopia;

  beforeAll(() => {
    netopia = new Netopia({ sandbox: true });
  });

  test('should start a payment', async () => {
    // Arrange
    const requestData = {
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
    netopia.setProductsData(requestData.order.products);
    const response = await netopia.startPayment();
    console.log('response:', response);

    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe('101');
    expect(response.payment.paymentURL).toBeDefined();
  }, 10000);
});
