const Netopia = require("../netopia");

module.exports = async (req, res) => {
  const { data, env_key } = req.body;
  const netopia = new Netopia();
  const validatedPayment = await netopia.validatePayment(env_key, data);
  const { action, res: response } = validatedPayment;

  switch (action) {
    case "confirmed":
      // do something
      break;
    case "cancelled":
      // do something
      break;
    case "paid":
      // do something
      break;
    case "paid_pending":
      // do something
      break;
    case "confirmed_pending":
      // do something
      break;
    default:
      // do something
  }

  return res
    .status(200)
    .set(response.set.key, response.set.value)
    .send(response.send);
};
