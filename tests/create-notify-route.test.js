const { Netopia } = require('..');

describe('Create notify route', () => {
  test('should create a notify route', async () => {
    // Arrange
    const netopia = new Netopia({ sandbox: true });

    // Act
    const route = netopia.createNotifyRoute(({ payment, order }) => {
      console.log('Order ID:', order?.orderID);

      switch (payment?.status) {
        case 3:
          console.log('Payment was successful');
          break;
        case 5:
          console.log('Payment was confirmed');
          break;
        case 12:
          console.log('Payment was rejected');
          break;
        default:
          console.log('Payment status unknown');
          break;
      }
    });

    // Assert
    expect(route).toHaveLength(3);
    expect(route[0]).toBe('/notify');
    expect(route[1]).toBeInstanceOf(Function);
    expect(route[2]).toBeInstanceOf(Function);
  });
});
