const Netopia = require("../netopia");

module.exports = async (req, res) => {
  // ...
  const netopia = new Netopia();
  // * For production
  // const netopia = new Netopia({ sandbox: false });
  netopia.setClientBillingData({
    firstName: "John",
    lastName: "Doe",
    address: "123 Main St",
    email: "example@email.com",
    phone: "1234567890",
  });
  netopia.setPaymentData({
    orderId: "123456",
    amount: "100",
    currency: "RON",
    details: "Test payment",
    returnUrl: "https://example.com",
    confirmUrl: "https://example.com",
  });
  const { data, env_key, url } = netopia.buildRequest();

  return res.status(200).json({ data, env_key, url });
};
