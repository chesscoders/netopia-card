require('dotenv').config();
const convertKeysToCamelCase = require('./functions/convert-keys-to-camel-case');
const decrypt = require('./functions/decrypt');
const encrypt = require('./functions/encrypt');
const formatNewlines = require('./functions/format-newlines');
const removeDiacritics = require('./functions/remove-diacritics');
const xml2js = require('xml2js');

const builder = new xml2js.Builder({
  cdata: true,
});
const parser = new xml2js.Parser({
  explicitArray: false,
});

/**
 * Netopia mobilPay class
 * inspired by mobilpay-card NPM package
 * @see https://www.npmjs.com/package/mobilpay-card
 */
class Netopia {
  /**
   * Constructor
   *
   * @param {string} signature The signature.
   * @param {string} publicKey The public key.
   * @param {string} privateKey The private key.
   * @param {string} confirmUrl The confirm url.
   * @param {string} returnUrl The return url.
   * @param {boolean} sandbox The sandbox flag.
   */
  constructor({ signature, publicKey, privateKey, confirmUrl, returnUrl, sandbox } = {}) {
    this.signature = signature || process.env.NETOPIA_SIGNATURE;
    this.publicKey = publicKey || process.env.NETOPIA_PUBLIC_KEY_B64;
    this.privateKey = privateKey || process.env.NETOPIA_PRIVATE_KEY_B64;
    this.confirmUrl = confirmUrl || process.env.NETOPIA_CONFIRM_URL;
    this.returnUrl = returnUrl || process.env.NETOPIA_RETURN_URL;
    this.sandbox = sandbox || process.env.NODE_ENV !== 'production';
    this.clientData = {
      billing: null,
      shipping: null,
    };
    this.paymentData = null;
    this.splitPayment = null;
    this.params = null;

    // Format newlines for specific variables
    this.publicKey = formatNewlines(this.publicKey);
    this.privateKey = formatNewlines(this.privateKey);
  }

  /**
   * Set the client billing information.
   *
   * @param {string} firstName The client's first name.
   * @param {string} lastName The client's last name.
   * @param {string} country The client's country.
   * @param {string} county The client's county.
   * @param {string} city The client's city.
   * @param {string} zipCode The client's zip code.
   * @param {string} address The client's address.
   * @param {string} email The client's email.
   * @param {string} phone The client's phone number.
   * @param {string} bank The client's bank.
   * @param {string} iban The client's iban.
   */
  setClientBillingData({
    firstName,
    lastName,
    country,
    county,
    city,
    zipCode,
    address,
    email,
    phone,
    bank,
    iban,
  }) {
    this.clientData.billing = {
      first_name: firstName,
      last_name: lastName,
      country: country,
      county: county,
      city: city,
      zip_code: zipCode,
      address: address,
      email: email,
      mobile_phone: phone,
      bank: bank,
      iban: iban,
    };
  }

  /**
   * Set the client shipping information.
   *
   * @param {string} firstName The client's first name.
   * @param {string} lastName The client's last name.
   * @param {string} country The client's country.
   * @param {string} county The client's county.
   * @param {string} city The client's city.
   * @param {string} zipCode The client's zip code.
   * @param {string} address The client's address.
   * @param {string} email The client's email.
   * @param {string} phone The client's phone number.
   * @param {string} bank The client's bank.
   * @param {string} iban The client's iban.
   */
  setClientShippingData({
    firstName,
    lastName,
    country,
    county,
    city,
    zipCode,
    address,
    email,
    phone,
    bank,
    iban,
  }) {
    this.clientData.shipping = {
      first_name: firstName,
      last_name: lastName,
      country: country,
      county: county,
      city: city,
      zip_code: zipCode,
      address: address,
      email: email,
      mobile_phone: phone,
      bank: bank,
      iban: iban,
    };
  }

  /**
   * Set the split payment information.
   *
   * @param {string} firstDestinationId The sac id (signature) of the first recipient.
   * @param {number} firstDestinationAmount The amount for the first recipient.
   * @param {string} secondDestinationId The sac id (signature) of the second recipient.
   * @param {number} secondDestinationAmount The amount for the second recipient.
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
   * Set the params for the payment.
   *
   * @param {Record<string, any>} params The params for the payment.
   */
  setParams(params = {}) {
    // Do nothing if params is not an object or is empty
    if (typeof params !== 'object' || Object.keys(params).length === 0) {
      return;
    }
    const paramsArray = Object.keys(params).map((key) => {
      return { name: key, value: params[key] };
    });
    this.params = { param: paramsArray };
  }

  /**
   * Set the client billing information.
   *
   * @param {string} orderId The id of the order.
   * @param {number} amount The amount to be charged.
   * @param {string} currency The currency in which to be charged.
   * @param {string} details The details about the transaction.
   */
  setPaymentData({ orderId, amount, currency, details }) {
    if (!this.clientData.billing) {
      throw new Error('BILLING_DATA_MISSING');
    }
    if (!this.clientData.shipping) {
      this.setClientShippingData({
        ...convertKeysToCamelCase(this.clientData.billing),
        phone: this.clientData.billing.mobile_phone,
      });
    }
    if (typeof this.splitPayment === 'undefined') {
      this.splitPayment = null;
    }
    const paymentData = {
      order: {
        $: {
          id: orderId,
          timestamp: new Date().getTime(),
          type: 'card',
        },
        signature: this.signature,
        url: {
          return: this.returnUrl,
          confirm: this.confirmUrl,
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
                type: 'person',
              },
              ...this.clientData.billing,
            },
            shipping: {
              $: {
                type: 'person',
              },
              ...this.clientData.shipping,
            },
          },
        },
        ...this.splitPayment,
      },
    };
    if (this.params) {
      paymentData.order.params = this.params;
    }
    // IMPORTANT: Netopia does not allow diacritics in the XML
    this.paymentData = removeDiacritics(paymentData);
  }

  buildRequest() {
    // check if required variables are set
    if (!this.signature) {
      throw new Error('SIGNATURE_MISSING');
    }
    if (!this.publicKey) {
      throw new Error('PUBLIC_KEY_MISSING');
    }
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY_MISSING');
    }
    if (!this.confirmUrl) {
      throw new Error('CONFIRM_URL_MISSING');
    }
    if (!this.returnUrl) {
      throw new Error('RETURN_URL_MISSING');
    }

    if (!this.paymentData) {
      throw new Error('PAYMENT_DATA_MISSING');
    }
    let xml = null;
    let request = null;
    try {
      xml = builder.buildObject(this.paymentData);
    } catch (e) {
      throw new Error('XML_BUILDER_ERROR');
    }

    // Show the XML request in the console if the environment variable is set
    if (process.env.SHOW_NETOPIA_DEBUG === 'yes') {
      // eslint-disable-next-line no-console
      console.log('Netopia XML request:', xml);
    }

    try {
      request = encrypt(this.publicKey, xml);
    } catch (e) {
      throw new Error('RC4_BUILDER_ERROR');
    }

    return {
      url: this.sandbox ? 'http://sandboxsecure.mobilpay.ro' : 'https://secure.mobilpay.ro',
      env_key: request.envKey,
      data: request.envData,
    };
  }

  /**
   * Get the payment confirmation
   *
   * @param {string} env_key The env_key.
   * @param {string} data The data.
   */
  confirmPayment(env_key, data) {
    const privateKey = this.privateKey;
    return new Promise(function (resolve, reject) {
      parser.parseString(decrypt(privateKey, env_key, data), function (err, result) {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  /**
   * Validate a payment
   *
   * @param {string} env_key The env_key from the mobilPay request body
   * @param {string} data The data from the mobilPay request body
   */
  async validatePayment(env_key, data) {
    const confirmedPayment = await this.confirmPayment(env_key, data);
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
              key: 'Content-Type',
              value: 'application/xml',
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
            key: 'Content-Type',
            value: 'application/xml',
          },
          send: `<?xml version="1.0" encoding="utf-8" ?><crc>${errorMessage}</crc>`,
        },
      });
    });
  }
}

module.exports = Netopia;
