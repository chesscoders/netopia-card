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

// Opt-in, and moves sandbox money: needs the ntpID of a payment already paid on sandbox.
//   NETOPIA_LIVE_REFUND_NTPID=1309088 NETOPIA_LIVE_REFUND_AMOUNT=1 npx jest live
const REFUND_NTPID = process.env.NETOPIA_LIVE_REFUND_NTPID;
const describeRefund = REFUND_NTPID ? describe : describe.skip;

describeRefund('Refund against the sandbox', () => {
  test('approves with the CREDIT status', async () => {
    const netopia = new Netopia({ sandbox: true });

    const response = await netopia.refund({
      ntpID: REFUND_NTPID,
      amount: process.env.NETOPIA_LIVE_REFUND_AMOUNT ?? 1,
    });

    expect(response.error.code).toBe('00');
    expect(response.payment.status).toBe(8);
  }, 10000);
});
