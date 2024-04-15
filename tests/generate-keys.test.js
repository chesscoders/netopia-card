const { generateKeys } = require('../functions');

describe('Generates a key pair with 2048 bits', () => {
  test('should generate a key pair with 2048 bits', async () => {
    // Arrange
    const options = {
      serialNumber: '01',
      attrs: [
        { name: 'commonName', value: 'example.org' },
        { name: 'countryName', value: 'US' },
        { name: 'stateOrProvinceName', value: 'California' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'Example Company' },
        { name: 'organizationalUnitName', value: 'IT Department' },
        { shortName: 'OU', value: 'Test' },
      ],
    };

    // Act
    const result = await generateKeys(options);

    // Assert
    expect(result.privateKey).toBeDefined();
    expect(result.publicKey).toBeDefined();
    expect(result.privateKey.length).toBeGreaterThan(0);
    expect(result.publicKey.length).toBeGreaterThan(0);
  }, 10000);
});
