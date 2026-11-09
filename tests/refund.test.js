jest.mock('axios');

const axios = require('axios');
const { Netopia } = require('..');

function netopia(options) {
  return new Netopia({ apiKey: 'test-api-key', sandbox: true, ...options });
}

describe('refund', () => {
  beforeEach(() => {
    axios.mockReset();
    axios.mockResolvedValue({ data: { error: { code: '00' }, payment: { status: 8 } } });
  });

  test('posts the ntpID and amount to /operation/credit', async () => {
    // Act
    const response = await netopia().refund({ ntpID: '1309088', amount: 12.5 });

    // Assert
    expect(response).toEqual({ error: { code: '00' }, payment: { status: 8 } });
    expect(axios.mock.calls[0][0]).toMatchObject({
      url: 'https://secure.sandbox.netopia-payments.com/operation/credit',
      method: 'POST',
      data: { ntpID: '1309088', amount: 12.5 },
    });
  });

  test('goes to the live host when sandbox is off', async () => {
    await netopia({ sandbox: false }).refund({ ntpID: '1309088', amount: 1 });

    expect(axios.mock.calls[0][0].url).toBe('https://secure.mobilpay.ro/pay/operation/credit');
  });

  test('sends an amount given as a string as a number', async () => {
    await netopia().refund({ ntpID: '1309088', amount: '12.50' });

    expect(axios.mock.calls[0][0].data.amount).toBe(12.5);
  });

  test.each([
    ['no data', undefined, 'Refund data is required'],
    ['no ntpID', { amount: 1 }, 'NETOPIA ID is required'],
    ['an ntpID shorter than 5', { ntpID: '1234', amount: 1 }, 'Invalid NETOPIA ID'],
    ['an ntpID longer than 64', { ntpID: '1'.repeat(65), amount: 1 }, 'Invalid NETOPIA ID'],
    ['a numeric ntpID', { ntpID: 1309088, amount: 1 }, 'Invalid NETOPIA ID'],
    // An omitted amount is not "refund everything": the spec does not say what it means.
    ['no amount', { ntpID: '1309088' }, 'Amount is required'],
    ['a zero amount', { ntpID: '1309088', amount: 0 }, 'Invalid Amount'],
    ['a negative amount', { ntpID: '1309088', amount: -1 }, 'Invalid Amount'],
    ['a garbage amount', { ntpID: '1309088', amount: 'abc' }, 'Invalid Amount'],
  ])('rejects %s before touching the network', async (_name, data, message) => {
    await expect(netopia().refund(data)).rejects.toThrow(message);
    expect(axios).not.toHaveBeenCalled();
  });
});
