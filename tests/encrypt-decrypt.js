require('dotenv').config();
const { test } = require('mocha');
const { expect } = require('chai');
const { encrypt, decrypt } = require('../functions');

test('Encrypt and decrypt logic', async () => {
  // Arrange
  const data = 'Hello world';
  const publicKey = process.env.NETOPIA_PUBLIC_KEY_B64;
  const privateKey = process.env.NETOPIA_PRIVATE_KEY_B64;

  // Act
  const { envKey, envData } = encrypt(publicKey, data);
  const decryptedData = decrypt(privateKey, envKey, envData).toString();

  // Assert
  expect(data).to.equal(decryptedData);
});
