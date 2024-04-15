require('dotenv').config();
const { decrypt, encrypt } = require('../functions');

describe('Encrypt and decrypt logic', () => {
  test('should encrypt and decrypt data', () => {
    // Arrange
    const data = 'Hello world!';
    const publicKey = process.env.PUBLIC_KEY;
    const privateKey = process.env.PRIVATE_KEY;

    // Act
    const { envKey, envData } = encrypt(publicKey, data);
    const decryptedData = decrypt(privateKey, envKey, envData);

    // Assert
    expect(decryptedData).toBe(data);
  });

  test('should encrypt and decrypt an object', () => {
    // Arrange
    const data = {
      account: '9900004810225098',
      expMonth: 12,
      expYear: 2024,
      secretCode: '111',
    };
    const publicKey = process.env.PUBLIC_KEY;
    const privateKey = process.env.PRIVATE_KEY;

    // Act
    const { envKey, envData } = encrypt(publicKey, JSON.stringify(data));
    const decryptedData = JSON.parse(decrypt(privateKey, envKey, envData));

    // Assert
    expect(decryptedData).toEqual(data);
  });
});
