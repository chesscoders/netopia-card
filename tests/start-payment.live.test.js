const { Netopia } = require('..');

// Opt-in: hits the real sandbox, so it needs valid credentials in the environment.
//   NETOPIA_LIVE_TEST=1 npm test
const LIVE = process.env.NETOPIA_LIVE_TEST;
const describeLive = LIVE && LIVE !== '0' && LIVE !== 'false' ? describe : describe.skip;

describeLive('Start payment against the sandbox', () => {
  test('answers 101 with a payment URL', async () => {
    // Arrange
    const netopia = new Netopia({ sandbox: true });

    // Act
    netopia.setOrderData({
      amount: 1,
      billing: {
        email: 'user@example.com',
        firstName: 'First',
        lastName: 'Last',
      },
      description: 'Some order description',
      orderID: crypto.randomUUID(),
    });
    netopia.setProductsData([
      { name: 'name', code: 'SKU', category: 'category', price: 1, vat: 19 },
    ]);
    const response = await netopia.startPayment();

    // Assert
    expect(response.error.code).toBe('101');
    expect(response.payment.paymentURL).toBeDefined();
  }, 10000);
});
