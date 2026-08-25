require('dotenv').config();
const axios = require('axios');
const constants = require('./constants');
const { pick, resolvePaymentAction, validateField, verifyNotification } = require('./functions');
const { captureRawBody, rawTextBodyParser } = require('./middlewares');

function collectBrowserInfo(navigator, window) {
  return {
    BROWSER_USER_AGENT: navigator.userAgent,
    BROWSER_TZ: Intl.DateTimeFormat().resolvedOptions().timeZone,
    BROWSER_COLOR_DEPTH: window.screen.colorDepth,
    BROWSER_JAVA_ENABLED: false,
    BROWSER_LANGUAGE: navigator.language,
    BROWSER_TZ_OFFSET: new Date().getTimezoneOffset(),
    BROWSER_SCREEN_WIDTH: window.screen.width,
    BROWSER_SCREEN_HEIGHT: window.screen.height,
    BROWSER_PLUGINS: '',
    MOBILE: /Mobi|Android/i.test(navigator.userAgent),
    SCREEN_POINT: 'false',
    SCREEN_PRINT:
      `Current Resolution: ${window.screen.width}x${window.screen.height}, ` +
      `Available Resolution: ${window.screen.availWidth}x${window.screen.availHeight}, ` +
      `Color Depth: ${window.screen.colorDepth}, Device XDPI: undefined, Device YDPI: undefined`,
    OS: '',
    OS_VERSION: '',
  };
}

function toNumber(value, name) {
  const number = typeof value === 'boolean' || String(value).trim() === '' ? NaN : Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${name}`);
  }

  return number;
}

function toUrl(value, name) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }

    return url.href;
  } catch {
    throw new Error(`Invalid ${name}`);
  }
}

function toCountryCode(value, name) {
  const code = toNumber(value, name);

  // ISO 3166-1 numeric runs from 004 (Afghanistan) to 894 (Zambia).
  if (!Number.isInteger(code) || code < 4 || code > 894) {
    throw new Error(`Invalid ${name}`);
  }

  return code;
}

// Only '00' means approved. '100' (3-D Secure required) and '101' (redirect to
// payment.paymentURL) are normal outcomes, but the payment is not settled yet:
// check error.code yourself rather than reading this as "payment succeeded".
function isPaymentError(errorCode) {
  return errorCode !== '00';
}

class Netopia {
  constructor({
    apiKey = process.env.NETOPIA_API_KEY,
    cancelUrl = process.env.NETOPIA_CANCEL_URL,
    notifyUrl = process.env.NETOPIA_CONFIRM_URL,
    posSignature = process.env.NETOPIA_SIGNATURE,
    publicKey = process.env.NETOPIA_PUBLIC_KEY,
    timeout = 30000,
    redirectUrl = process.env.NETOPIA_RETURN_URL,
    language = 'ro',
    sandbox = process.env.NODE_ENV !== 'production',
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = sandbox
      ? 'https://secure.sandbox.netopia-payments.com'
      : 'https://secure.mobilpay.ro/pay';
    this.cancelUrl = cancelUrl;
    this.notifyUrl = notifyUrl;
    this.posSignature = posSignature;
    this.publicKey = publicKey;
    this.redirectUrl = redirectUrl;
    this.timeout = timeout;
    this.config = { language };
    this.order = {};
    this.payment = {};
  }

  reset() {
    this.order = {};
    this.payment = {};
  }

  setPaymentData(paymentData) {
    if (!paymentData) {
      throw new Error('Payment data is required');
    }

    const requiredFields = [
      { field: paymentData.account, name: 'Account number' },
      { field: paymentData.expMonth, name: 'Expiration month' },
      { field: paymentData.expYear, name: 'Expiration year' },
      { field: paymentData.secretCode, name: 'Secret code' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    // validateField only sees the raw input; these are the values actually sent.
    const account = String(paymentData.account).trim();
    const secretCode = String(paymentData.secretCode).trim();
    const expMonth = toNumber(paymentData.expMonth, 'Expiration month');
    const expYear = toNumber(paymentData.expYear, 'Expiration year');

    // A card number is a string of digits: as a number it silently loses digits.
    if (typeof paymentData.account !== 'string' || !/^\d+$/.test(account)) {
      throw new Error('Invalid Account number');
    }
    if (!/^\d{3,4}$/.test(secretCode)) {
      throw new Error('Invalid Secret code');
    }
    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
      throw new Error('Invalid Expiration month');
    }
    if (!Number.isInteger(expYear) || expYear < 100) {
      throw new Error('Invalid Expiration year');
    }

    this.payment.instrument = {
      ...this.payment.instrument,
      type: 'card',
      account: account,
      expMonth: expMonth,
      expYear: expYear,
      secretCode: secretCode,
    };
  }

  setPaymentOptions(paymentOptions) {
    if (!paymentOptions) {
      throw new Error('Payment options are required');
    }

    const options = {};

    for (const name of ['installments', 'bonus']) {
      if (paymentOptions[name] == null) {
        continue;
      }
      const value = toNumber(paymentOptions[name], name);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid ${name}`);
      }
      options[name] = value;
    }

    if (Object.keys(options).length === 0) {
      throw new Error('Payment options must include installments or bonus');
    }

    this.payment.options = { ...this.payment.options, ...options };
  }

  setBrowserData(reqBody, reqIp) {
    if (!reqBody) {
      throw new Error('Request body is required');
    }
    if (!reqIp) {
      throw new Error('Request IP is required');
    }

    const requiredFields = [
      { field: reqBody.BROWSER_COLOR_DEPTH, name: 'Color depth' },
      { field: reqBody.BROWSER_LANGUAGE, name: 'Language' },
      { field: reqBody.BROWSER_SCREEN_HEIGHT, name: 'Screen height' },
      { field: reqBody.BROWSER_SCREEN_WIDTH, name: 'Screen width' },
      { field: reqBody.BROWSER_TZ, name: 'Timezone' },
      { field: reqBody.BROWSER_USER_AGENT, name: 'User agent' },
      { field: reqBody.MOBILE, name: 'Mobile' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    const browserFields = [
      'BROWSER_COLOR_DEPTH',
      'BROWSER_JAVA_ENABLED',
      'BROWSER_LANGUAGE',
      'BROWSER_PLUGINS',
      'BROWSER_SCREEN_HEIGHT',
      'BROWSER_SCREEN_WIDTH',
      'BROWSER_TZ_OFFSET',
      'BROWSER_TZ',
      'BROWSER_USER_AGENT',
      'MOBILE',
      'OS_VERSION',
      'OS',
      'SCREEN_POINT',
      'SCREEN_PRINT',
    ];

    this.payment.data = browserFields.reduce((data, field) => {
      if (reqBody[field] != null) {
        data[field] = String(reqBody[field]);
      }
      return data;
    }, {});

    this.payment.data.IP_ADDRESS = String(reqIp);
  }

  setOrderData(orderData) {
    if (!orderData) {
      throw new Error('Order data is required');
    }

    const requiredFields = [
      { field: orderData.amount, name: 'Amount' },
      { field: orderData.billing, name: 'Billing details' },
      { field: orderData.billing?.email, name: 'Email' },
      { field: orderData.billing?.firstName, name: 'First name' },
      { field: orderData.billing?.lastName, name: 'Last name' },
      { field: orderData.orderID, name: 'Order ID' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    // Netopia asks for the phone on its own payment page, so an empty value is
    // omitted instead of sent: placeholders like "-" are rejected there.
    const phone = orderData.billing?.phone;
    const isPhoneValue =
      typeof phone === 'string' || (typeof phone === 'number' && Number.isFinite(phone));
    const hasPhone = isPhoneValue && String(phone).trim().length > 0;

    const amount = toNumber(orderData.amount, 'Amount');

    // 0 is legal (account verification), negative is not: spec sets minimum 0.
    if (amount < 0) {
      throw new Error('Invalid Amount');
    }

    // Default only when absent: 0, '' and false are a broken form, not Romania.
    const country =
      orderData.billing?.country == null
        ? 642
        : toCountryCode(orderData.billing.country, 'Billing country');

    const objectFields = [
      [orderData.shipping, 'Shipping details'],
      [orderData.data, 'Order data'],
    ];

    for (const [value, name] of objectFields) {
      if (value != null && (typeof value !== 'object' || Array.isArray(value))) {
        throw new Error(`Invalid ${name}`);
      }
    }

    if (orderData.clientID != null && typeof orderData.clientID === 'object') {
      throw new Error('Invalid Client ID');
    }

    // shipping is forwarded as given, except for the country the schema declares integer.
    const shipping =
      orderData.shipping?.country == null
        ? orderData.shipping
        : {
            ...orderData.shipping,
            country: toCountryCode(orderData.shipping.country, 'Shipping country'),
          };

    this.order = {
      amount: amount,
      billing: {
        city: orderData.billing?.city || '',
        country: country,
        countryName: orderData.billing?.countryName || (country === 642 ? 'Romania' : ''),
        details: orderData.billing?.details || '',
        email: orderData.billing?.email,
        firstName: orderData.billing?.firstName,
        lastName: orderData.billing?.lastName,
        ...(hasPhone && { phone }),
        postalCode: orderData.billing?.postalCode || '',
        state: orderData.billing?.state || '',
      },
      currency: orderData.currency || 'RON',
      dateTime: orderData.dateTime || new Date().toISOString(),
      description: orderData.description || '',
      orderID: orderData.orderID,
      // Appended, not sorted in: moving the keys above would change the payload
      // of every caller that does not use these fields.
      ...(shipping != null && { shipping }),
      ...pick(orderData, ['data', 'clientID']),
    };
  }

  setProductsData(productsData) {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      throw new Error('Invalid or empty products data');
    }

    this.order.products = productsData.map((product) => {
      if (
        !product.category ||
        !product.code ||
        !product.name ||
        product.price == null ||
        product.vat == null
      ) {
        console.warn('Missing product details', product);
        return {
          category: product.category || 'No Category',
          code: product.code || 'No Code',
          name: product.name || 'Unnamed Product',
          price: product.price || 0,
          vat: product.vat || 0,
        };
      }

      return { ...pick(product, ['name', 'code', 'category', 'price', 'vat']) };
    });
  }

  async sendRequest(url, method, data) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const response = await axios({
        url: url,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        data: data,
        timeout: this.timeout,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        const { data, status, statusText } = error.response;
        throw Object.assign(
          new Error(
            data?.message ||
              data?.error?.message ||
              statusText ||
              `Request failed with status ${status}`
          ),
          { status: status, code: data?.error?.code, cause: error }
        );
      } else if (error.request) {
        // A timeout may mean the payment was created and needs reconciling; a
        // connection error means the request never arrived. Keep them apart.
        const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        throw Object.assign(new Error(timedOut ? 'Request timed out' : 'No response received'), {
          code: error.code,
          cause: error,
        });
      } else {
        throw Object.assign(new Error(error.message), { cause: error });
      }
    }
  }

  async startPayment() {
    validateField(this.notifyUrl, 'Notify URL');
    validateField(this.posSignature, 'POS signature');
    validateField(this.redirectUrl, 'Redirect URL');

    // A deep snapshot, so a setter called after this cannot rewrite what was sent,
    // and exactly the bytes that go on the wire.
    const requestData = JSON.parse(
      JSON.stringify({
        config: {
          ...this.config,
          notifyUrl: toUrl(this.notifyUrl, 'Notify URL'),
          redirectUrl: toUrl(this.redirectUrl, 'Redirect URL'),
          ...(this.cancelUrl && { cancelUrl: toUrl(this.cancelUrl, 'Cancel URL') }),
        },
        order: { ...this.order, posSignature: this.posSignature },
        payment: this.payment,
      })
    );

    const requiredFields = [
      { field: requestData.config.language, name: 'Language' },
      { field: requestData.order.amount, name: 'Amount' },
      { field: requestData.order.billing, name: 'Billing details' },
      { field: requestData.order.billing?.email, name: 'Email' },
      { field: requestData.order.billing?.firstName, name: 'First name' },
      { field: requestData.order.billing?.lastName, name: 'Last name' },
      { field: requestData.order.currency, name: 'Currency' },
      { field: requestData.order.dateTime, name: 'Date & time' },
      { field: requestData.order.orderID, name: 'Order ID' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    const url = `${this.baseUrl}/payment/card/start`;

    try {
      const response = await this.sendRequest(url, 'POST', requestData);
      return response;
    } catch (error) {
      console.error('Error initiating payment:', error.message);
      throw error;
    }
  }

  /**
   * Verifies a payment notification against this account and returns what it carries.
   * Needs the body as received: mount `rawTextBodyParser` on the notification route, or
   * keep a copy with `captureRawBody`.
   *
   * @param {Request} req - The Express request carrying the notification.
   * @returns {{ order: Object, payment: Object }} The verified notification.
   * @throws {Error} If anything about the notification cannot be trusted.
   */
  verifyNotification(req, { maxAgeSeconds } = {}) {
    if (!req) {
      throw new Error('Request is required');
    }

    const headers = req.headers ?? {};
    const body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : undefined;

    return verifyNotification({
      token: headers['verification-token'] ?? headers['Verification-token'],
      rawBody: req.rawBody ?? body,
      posSignature: this.posSignature,
      publicKey: this.publicKey,
      maxAgeSeconds: maxAgeSeconds,
    });
  }

  async verifyAuth(authData) {
    if (!authData) {
      throw new Error('Authentication data is required');
    }

    const requiredFields = [
      { field: authData.authenticationToken, name: 'Authentication token' },
      { field: authData.ntpID, name: 'NETOPIA ID' },
      { field: authData.formData, name: 'Form data' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    // Spec: every field received on the redirectUrl is mandatory and must not be altered.
    if (typeof authData.formData !== 'object' || Array.isArray(authData.formData)) {
      throw new Error('Invalid Form data');
    }
    if (Object.keys(authData.formData).length === 0) {
      throw new Error('Form data cannot be empty');
    }

    const requestData = {
      authenticationToken: authData.authenticationToken,
      ntpID: authData.ntpID,
      formData: authData.formData,
    };

    const url = `${this.baseUrl}/payment/card/verify-auth`;

    try {
      const response = await this.sendRequest(url, 'POST', requestData);
      return response;
    } catch (error) {
      console.error('Error verifying 3-D Secure authentication:', error.message);
      throw error;
    }
  }
}

module.exports = {
  ...constants,
  captureRawBody,
  collectBrowserInfo,
  isPaymentError,
  Netopia,
  rawTextBodyParser,
  resolvePaymentAction,
  verifyNotification,
};
