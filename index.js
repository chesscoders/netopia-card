require('dotenv').config();
const axios = require('axios');
const { decrypt, encrypt, generateKeys, pick, validateField } = require('./functions');

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
    OS: '',
    OS_VERSION: '',
  };
}

function decryptRequestBody(req, res, next) {
  try {
    const { envKey, envData } = req.body;
    if (!envKey || !envData) {
      throw new Error('Invalid request body');
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Private key is required');
    }

    const decryptedData = decrypt(privateKey, envKey, envData);
    if (!decryptedData) {
      throw new Error('Failed to decrypt data');
    }

    req.body = JSON.parse(decryptedData);
    next();
  } catch (error) {
    console.error('Error decrypting request body:', error);
    res.status(400).json({ errorCode: 1 });
  }
}

function isPaymentError(errorCode) {
  return errorCode !== '00';
}

class Netopia {
  constructor({
    apiBaseUrl = process.env.API_BASE_URL,
    apiKey = process.env.NETOPIA_API_KEY,
    posSignature = process.env.NETOPIA_SIGNATURE,
    sandbox = process.env.NODE_ENV !== 'production',
  } = {}) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.baseUrl = sandbox
      ? 'https://secure.sandbox.netopia-payments.com'
      : 'https://secure.mobilpay.ro/pay';
    this.posSignature = posSignature;
    this.config = { language: 'ro' };
    this.payment = { instrument: { type: 'card' } };
    this.order = {};
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

    this.payment.instrument = {
      ...this.payment.instrument,
      account: paymentData.account,
      expMonth: Number(paymentData.expMonth),
      expYear: Number(paymentData.expYear),
      secretCode: paymentData.secretCode,
    };
  }

  setBrowserData(reqBody, reqIp) {
    if (!reqBody) {
      throw new Error('Request body is required');
    }
    if (!reqIp) {
      throw new Error('Request IP is required');
    }

    const requiredFields = [
      { field: reqBody.BROWSER_USER_AGENT, name: 'User agent' },
      { field: reqBody.BROWSER_TZ, name: 'Timezone' },
      { field: reqBody.BROWSER_COLOR_DEPTH, name: 'Color depth' },
      { field: reqBody.BROWSER_LANGUAGE, name: 'Language' },
      { field: reqBody.BROWSER_SCREEN_WIDTH, name: 'Screen width' },
      { field: reqBody.BROWSER_SCREEN_HEIGHT, name: 'Screen height' },
      { field: reqBody.MOBILE, name: 'Mobile' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    const browserFields = [
      'BROWSER_USER_AGENT',
      'BROWSER_TZ',
      'BROWSER_COLOR_DEPTH',
      'BROWSER_JAVA_ENABLED',
      'BROWSER_LANGUAGE',
      'BROWSER_TZ_OFFSET',
      'BROWSER_SCREEN_WIDTH',
      'BROWSER_SCREEN_HEIGHT',
      'BROWSER_PLUGINS',
      'MOBILE',
      'SCREEN_POINT',
      'OS',
      'OS_VERSION',
    ];

    this.payment.data = browserFields.reduce((data, field) => {
      if (reqBody[field] != null) {
        data[field] = String(reqBody[field]);
      }
      return data;
    }, {});

    this.payment.data.IP_ADDRESS = reqIp;
  }

  setOrderData(orderData) {
    if (!orderData) {
      throw new Error('Order data is required');
    }

    const requiredFields = [
      { field: orderData.orderID, name: 'Order ID' },
      { field: orderData.amount, name: 'Amount' },
      { field: orderData.billing, name: 'Billing details' },
      { field: orderData.billing?.email, name: 'Email' },
      { field: orderData.billing?.phone, name: 'Phone' },
      { field: orderData.billing?.firstName, name: 'First name' },
      { field: orderData.billing?.lastName, name: 'Last name' },
    ];

    requiredFields.forEach(({ field, name }) => validateField(field, name));

    this.order = {
      ...this.order,
      dateTime: orderData.dateTime || new Date().toISOString(),
      description: orderData.description || '',
      orderID: orderData.orderID,
      amount: Number(orderData.amount),
      currency: orderData.currency || 'RON',
      billing: {
        email: orderData.billing?.email,
        phone: orderData.billing?.phone,
        firstName: orderData.billing?.firstName,
        lastName: orderData.billing?.lastName,
        city: orderData.billing?.city || '',
        country: Number(orderData.billing?.country || 642),
        countryName: orderData.billing?.countryName || 'Romania',
        state: orderData.billing?.state || '',
        postalCode: orderData.billing?.postalCode || '',
        details: orderData.billing?.details || '',
      },
    };
  }

  setProductsData(productsData) {
    if (!Array.isArray(productsData) || productsData.length === 0) {
      throw new Error('Invalid or empty products data');
    }

    this.order.products = productsData.map((product) => {
      if (
        !product.name ||
        !product.code ||
        !product.category ||
        product.price == null ||
        product.vat == null
      ) {
        console.warn('Missing product details', product);
        return {
          name: product.name || 'Unnamed Product',
          code: product.code || 'No Code',
          category: product.category || 'No Category',
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
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message);
      } else if (error.request) {
        throw new Error('No response received');
      } else {
        throw new Error(error.message);
      }
    }
  }

  async startPayment() {
    if (!this.apiBaseUrl) {
      throw new Error('API URL is required');
    }
    if (!this.posSignature) {
      throw new Error('POS signature is required');
    }

    const requestData = {
      config: this.config,
      order: this.order,
      payment: this.payment,
    };

    requestData.config.notifyUrl = new URL('notify', this.apiBaseUrl).href;
    requestData.order.posSignature = this.posSignature;

    const requiredFields = [
      { field: requestData.config.notifyUrl, name: 'Notify URL' },
      { field: requestData.config.language, name: 'Language' },
      { field: requestData.payment.instrument?.account, name: 'Account number' },
      { field: requestData.payment.instrument?.expMonth, name: 'Expiration month' },
      { field: requestData.payment.instrument?.expYear, name: 'Expiration year' },
      { field: requestData.payment.instrument?.secretCode, name: 'Secret code' },
      { field: requestData.order.posSignature, name: 'POS signature' },
      { field: requestData.order.dateTime, name: 'Date & time' },
      { field: requestData.order.orderID, name: 'Order ID' },
      { field: requestData.order.amount, name: 'Amount' },
      { field: requestData.order.currency, name: 'Currency' },
      { field: requestData.order.billing, name: 'Billing details' },
      { field: requestData.order.billing?.email, name: 'Email' },
      { field: requestData.order.billing?.phone, name: 'Phone' },
      { field: requestData.order.billing?.firstName, name: 'First name' },
      { field: requestData.order.billing?.lastName, name: 'Last name' },
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

  rawTextBodyParser(req, _res, next) {
    if (!req.headers['content-type'] || req.headers['content-type'] === 'text/plain') {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        req.body = data;
        next();
      });
    } else {
      next();
    }
  }

  createNotifyRoute(callback) {
    return [
      '/notify',
      this.rawTextBodyParser,
      async (req, res) => {
        try {
          const { order, payment } = JSON.parse(req.body);
          if (!order || !payment) {
            throw new Error('Invalid request body');
          }

          await callback({ order, payment });

          res.header('Content-Type', 'application/json');
          res.status(200).json({ errorCode: 0 });
        } catch (error) {
          console.error('Error', error.message);
          res.status(400).json({ errorCode: 1 });
        }
      },
    ];
  }
}

module.exports = {
  collectBrowserInfo,
  decrypt,
  decryptRequestBody,
  encrypt,
  generateKeys,
  isPaymentError,
  Netopia,
};
