const decrypt = require("./mobilpay/decrypt");
const encrypt = require("./mobilpay/encrypt");
const xml2js = require("xml2js");

const builder = new xml2js.Builder({
  cdata: true,
});
const parser = new xml2js.Parser({
  explicitArray: false,
});

/**
 * Netopia Mobilpay class
 * inspired by mobilpay-card NPM package
 * @see https://www.npmjs.com/package/mobilpay-card
 */
class Netopia {
  constructor({ signature, publicKey, privateKey, sandbox } = {}) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.sandbox = sandbox;
    this.signature = signature;
    this.clientData = {
      billing: null,
      shipping: null,
    };
    this.paymentData = null;
  }

  /**
   * Set the client billing information.
   *
   * @param {String} firstName The client's first name.
   * @param {String} lastName The client's last name.
   * @param {String} county The client's county.
   * @param {String} city The client's city.
   * @param {String} address The client's address.
   * @param {String} email The client's email.
   * @param {String} phone The client's phone number.
   */
  setClientBillingData({ firstName, lastName, address, email, phone }) {
    this.clientData.billing = {
      first_name: firstName,
      last_name: lastName,
      address: address,
      email: email,
      mobile_phone: phone,
    };
  }

  /**
   * Set the client shipping information.
   *
   * @param {String} firstName The client's first name.
   * @param {String} lastName The client's last name.
   * @param {String} county The client's county.
   * @param {String} city The client's city.
   * @param {String} address The client's address.
   * @param {String} email The client's email.
   * @param {String} phone The client's phone number.
   */
  setClientShippingData({ firstName, lastName, address, email, phone }) {
    this.clientData.shipping = {
      first_name: firstName,
      last_name: lastName,
      address: address,
      email: email,
      mobile_phone: phone,
    };
  }

  /**
   * Set the split payment information.
   *
   * @param {String} firstDestinationId The sac id (signature) of the first recipient.
   * @param {String} firstDestinationAmount The amount for the first recipient.
   * @param {String} secondDestinationId The sac id (signature) of the second recipient.
   * @param {String} secondDestinationAmount The amount for the second recipient.
   */
  setSplitPayment({
    firstDestinationId,
    firstDestinationAmount,
    secondDestinationId,
    secondDestinationAmount,
  }) {
    this.splitPayment = {
      split: {
        destinations: [
          { id: firstDestinationId, amount: firstDestinationAmount },
          { id: secondDestinationId, amount: secondDestinationAmount },
        ],
      },
    };
  }

  /**
   * Set the client billing information.
   *
   * @param {String} orderId The id of the order.
   * @param {String} amount The amount to be charged.
   * @param {String} currency The currency in which to be charged.
   * @param {String} details The details about the transaction.
   * @param {String} confirmUrl The url which the MobilPay API should call for confirmation.
   * @param {String} returnUrl The url which the MobilPay API should return after confirmation.
   */
  setPaymentData({
    orderId,
    amount,
    currency,
    details,
    confirmUrl,
    returnUrl,
  }) {
    if (!this.clientData.billing) {
      throw new Error("BILLING_DATA_MISSING");
    }
    if (!this.clientData.shipping) {
      this.setClientShippingData(this.clientData.billing);
    }
    if (typeof this.splitPayment === "undefined") {
      this.splitPayment = null;
    }
    this.paymentData = {
      order: {
        $: {
          id: orderId,
          timestamp: new Date().getTime(),
          type: "card",
        },
        signature: this.signature,
        url: {
          return: returnUrl,
          confirm: confirmUrl,
        },
        invoice: {
          $: {
            currency: currency.toString().toUpperCase(),
            amount: amount,
          },
          details: details,
          contact_info: {
            billing: {
              $: {
                type: "person",
              },
              ...this.clientData.billing,
            },
            shipping: {
              $: {
                type: "person",
              },
              ...this.clientData.shipping,
            },
          },
        },
        ...this.splitPayment,
      },
    };
  }

  /**
   * Build the request for the API call
   *
   * @param {Boolean} sandbox Use for sandbox
   */
  buildRequest() {
    if (!this.paymentData) {
      throw new Error("PAYMENT_DATA_MISSING");
    }
    let xml = null;
    let request = null;
    try {
      xml = builder.buildObject(this.paymentData);
    } catch (e) {
      throw new Error("XML_BUILDER_ERROR");
    }
    try {
      request = encrypt(this.publicKey, xml);
    } catch (e) {
      throw new Error("RC4_BUILDER_ERROR");
    }

    return {
      url: this.sandbox
        ? "http://sandboxsecure.mobilpay.ro"
        : "https://secure.mobilpay.ro/en",
      env_key: request.envKey,
      data: request.envData,
    };
  }

  /**
   * Get the payment confirmation
   *
   * @param {String} envKey The env_key.
   * @param data The data.
   */
  confirmPayment(envKey, data) {
    const privateKey = this.privateKey;
    return new Promise(function (resolve, reject) {
      parser.parseString(
        decrypt(privateKey, envKey, data),
        function (err, result) {
          if (err) {
            reject(err);
          }
          resolve(result);
        }
      );
    });
  }

  /**
   * Validate a payment
   *
   * @param {String} envKey The env_key from the Mobilpay request body
   * @param data The data from the Mobilpay request body
   */
  async validatePayment(envKey, data) {
    const confirmedPayment = await this.confirmPayment(envKey, data);
    return new Promise(function (resolve, reject) {
      if (confirmedPayment.errorType) {
        reject(confirmedPayment.errorMessage);
      }
      const order = confirmedPayment.order;
      const mobilpayAction = order.mobilpay.action;
      const errorObj = order.mobilpay.error;
      let errorMessage = errorObj._;
      let errorCode = errorObj.$.code;

      if (parseInt(errorCode) !== 0) {
        resolve({
          order,
          action: null,
          errorMessage: errorMessage,
          error: errorObj,
          res: {
            set: {
              key: "Content-Type",
              value: "application/xml",
            },
            send: `<?xml version="1.0" encoding="utf-8" ?><crc error_code="${errorCode}">${errorMessage}</crc>`,
          },
        });
      }

      resolve({
        order,
        action: mobilpayAction,
        errorMessage: null,
        error: null,
        res: {
          set: {
            key: "Content-Type",
            value: "application/xml",
          },
          send: `<?xml version="1.0" encoding="utf-8" ?><crc>${errorMessage}</crc>`,
        },
      });
    });
  }
}

module.exports = Netopia;
