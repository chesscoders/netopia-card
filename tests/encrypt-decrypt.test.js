require('dotenv').config();
const { encrypt, decrypt, formatNewlines } = require('../functions');

describe('Encrypt and decrypt logic', () => {
  test('should encrypt and decrypt data', () => {
    // Arrange
    const data = 'Hello world!';
    const publicKey = formatNewlines(process.env.PUBLIC_KEY);
    const privateKey = formatNewlines(process.env.PRIVATE_KEY);

    // Act
    const { envKey, envData } = encrypt(publicKey, data);
    const decryptedData = decrypt(privateKey, envKey, envData);

    // Assert
    expect(decryptedData).toBe(data);
  });
});
