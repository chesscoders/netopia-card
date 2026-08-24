jest.mock('axios');

const axios = require('axios');
const { Netopia } = require('..');

function netopia() {
  return new Netopia({ apiKey: 'test-api-key', sandbox: true });
}

function axiosError(response) {
  return Object.assign(new Error('Request failed'), { response });
}

describe('sendRequest', () => {
  beforeEach(() => {
    axios.mockReset();
  });

  test('returns the response body', async () => {
    // Arrange
    axios.mockResolvedValue({ data: { error: { code: '101' } } });

    // Act
    const response = await netopia().sendRequest('https://example.com', 'POST', {});

    // Assert
    expect(response).toEqual({ error: { code: '101' } });
    expect(axios.mock.calls[0][0].headers.Authorization).toBe('test-api-key');
    // A silent gateway must not hang the merchant request forever.
    expect(axios.mock.calls[0][0].timeout).toBe(30000);
  });

  test.each([
    ['a plain message body', { data: { message: 'Unauthorized' } }, 'Unauthorized'],
    [
      'a spec-shaped error body',
      { data: { error: { code: '56', message: 'Order closed' } } },
      'Order closed',
    ],
    [
      'an HTML body',
      { data: '<html>502</html>', status: 502, statusText: 'Bad Gateway' },
      'Bad Gateway',
    ],
    ['no body at all', { data: null, status: 500 }, 'Request failed with status 500'],
    // Pins the precedence: reordering the fallbacks would degrade every message.
    [
      'the plain message before the nested one',
      { data: { message: 'Unauthorized', error: { message: 'Order closed' } } },
      'Unauthorized',
    ],
  ])('reports %s', async (_name, response, message) => {
    // Arrange
    axios.mockRejectedValue(axiosError(response));

    // Act & Assert
    await expect(netopia().sendRequest('https://example.com', 'POST', {})).rejects.toThrow(message);
  });

  test('requires an API key before touching the network', async () => {
    await expect(
      new Netopia({ apiKey: '', sandbox: true }).sendRequest('https://example.com', 'POST', {})
    ).rejects.toThrow('API key is required');
    expect(axios).not.toHaveBeenCalled();
  });
});
