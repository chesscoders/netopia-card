const { generateKeys, saveKeysInEnvironment } = require('../functions');

describe('Generates a key pair with 2048 bits', () => {
  it('should generate a key pair with 2048 bits', async () => {
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

  it('should save the keys in the environment', async () => {
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
    const file = '.env.test';

    // Act
    await saveKeysInEnvironment(options, file);

    // Assert
    expect(process.env.PRIVATE_KEY).toBeDefined();
    expect(process.env.PUBLIC_KEY).toBeDefined();
    expect(process.env.PRIVATE_KEY.length).toBeGreaterThan(0);
    expect(process.env.PUBLIC_KEY.length).toBeGreaterThan(0);
  }, 10000);
});
