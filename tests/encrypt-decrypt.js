require('dotenv').config();
const { test, describe } = require('mocha');
const { expect } = require('chai');
const { encrypt: encryptAes, decrypt: decryptAes } = require('../functions/aes');
const { encrypt: encryptRc4, decrypt: decryptRc4 } = require('../functions/rc4');
const fs = require('fs');

describe('Encrypt and decrypt logic', () => {
  test('using RSA-OAEP and AES-CBC algorithms with local keys', () => {
    // Arrange
    const data = 'Hello world';
    const publicKey = fs.readFileSync('./tests/keys/certificate.pem', 'utf8');
    const privateKey = fs.readFileSync('./tests/keys/private_key.pem', 'utf8');

    // Act
    const { envKey, envData } = encryptAes(publicKey, data);
    const decryptedData = decryptAes(privateKey, envKey, envData).toString();

    // Assert
    expect(data).to.equal(decryptedData);
  });

  test('using RSA-OAEP and AES-CBC algorithms with Netopia keys', () => {
    // Arrange
    const data = 'Hello world';
    const publicKey = process.env.NETOPIA_PUBLIC_KEY_B64;
    const privateKey = process.env.NETOPIA_PRIVATE_KEY_B64;

    // Act
    const { envKey, envData } = encryptAes(publicKey, data);
    const decryptedData = decryptAes(privateKey, envKey, envData).toString();

    // Assert
    expect(data).to.equal(decryptedData);
  });

  test('using RC4 algorithm with local keys', () => {
    // Arrange
    const data = 'Hello world';
    const publicKey = fs.readFileSync('./tests/keys/certificate.pem', 'utf8');
    const privateKey = fs.readFileSync('./tests/keys/private_key.pem', 'utf8');

    // Act
    const encryptedData = encryptRc4(publicKey, data);
    const decryptedData = decryptRc4(privateKey, encryptedData).toString();

    // Assert
    expect(data).to.equal(decryptedData);
  });

  test('using RC4 algorithm with Netopia keys', () => {
    // Arrange
    const data = 'Hello world';
    const publicKey = process.env.NETOPIA_PUBLIC_KEY_B64;
    const privateKey = process.env.NETOPIA_PRIVATE_KEY_B64;

    // Act
    const encryptedData = encryptRc4(publicKey, data);
    const decryptedData = decryptRc4(privateKey, encryptedData).toString();

    // Assert
    expect(data).to.equal(decryptedData);
  });
});
