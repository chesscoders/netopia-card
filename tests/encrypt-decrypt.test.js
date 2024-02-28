const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const encrypt = require('../functions/encrypt');
const decrypt = require('../functions/decrypt');

describe('Encrypt and Decrypt Tests', () => {
  it('should encrypt and decrypt a message', () => {
    // Arrange
    // To generate a new key pair, use the following commands:
    // openssl genrsa -out private_key.pem 2048
    // openssl rsa -in private_key.pem -pubout -out public_key.pem
    const publicKey = fs
      .readFileSync(path.join(__dirname, 'public_key.pem'), 'utf8')
      .replace(/\r/g, '');
    const privateKey = fs
      .readFileSync(path.join(__dirname, 'private_key.pem'), 'utf8')
      .replace(/\r/g, '');
    const data = 'Secret Message';

    // Act
    const { envKey, envData } = encrypt(publicKey, data);
    const decryptedData = decrypt(privateKey, envKey, envData).toString();

    // Assert
    expect(data).to.equal(decryptedData);
  });
});
