require('dotenv').config();
const { test } = require('mocha');
const { expect } = require('chai');
const Netopia = require('..');

test('Netopia card encrypt and decrypt logic', async () => {
  // This test assumes the env variables are set
  // Arrange
  const netopia = new Netopia();

  netopia.setClientBillingData({
    billingType: 'person',
    firstName: 'Michael',
    lastName: 'Scott',
    address: 'Romania',
    email: '-',
    phone: '-',
  });
  netopia.setClientShippingData({
    billingType: 'person',
    firstName: 'Michael',
    lastName: 'Scott',
    address: 'Romania',
    email: '-',
    phone: '-',
  });

  netopia.setPaymentData({
    orderId: '1',
    amount: 10,
    currency: 'RON',
    details: '-',
  });

  // Act
  const { data, env_key, url } = netopia.buildRequest();

  // Assert
  expect(data).to.be.a('string');
  expect(env_key).to.be.a('string');
  expect(url).to.be.a('string');

  // Act
  const validatedPayment = await netopia.validatePayment(env_key, data);
  // const { action, errorMessage, order, res: response } = validatedPayment;

  // Assert
  expect(validatedPayment).to.not.throw;
});
