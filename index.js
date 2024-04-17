require('dotenv').config();
const axios = require('axios');
const { generateKeys, encrypt, decrypt } = require('./functions');

/**
 * Collects and returns various browser and system information from the provided navigator and window objects.
 * @param {Navigator} navigator - The navigator object, typically available in the browser context, that provides information about the browser.
 * @param {Window} window - The window object representing the browser's window, providing information about the screen and more.
 * @returns {Object} An object containing browser and device information, such as user agent, time zone, color depth, and more.
 */
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

/**
 * Decrypts the given request body using the provided private key.
 * @param {*} req - The request object.
 * @param {*} res - The response object.
 * @param {*} next - The next middleware function.
 * @returns {void} Calls the next middleware function if successful; otherwise, sends a 400 Bad Request response.
 */
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

/**
 * Determines if a given error code represents a payment error.
 * @param {string} errorCode - The error code to check.
 * @returns {boolean} Returns true if the error code is not '00', indicating a payment error; false otherwise.
 */
function isPaymentError(errorCode) {
  return errorCode !== '00';
}

/**
 * A class that provides methods for interacting with the Netopia API.
 */
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
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data.message);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message);
      }
    }
  }

  async startPayment(requestData) {
    if (!this.apiBaseUrl) {
      throw new Error('API URL is required');
    }
    if (!this.posSignature) {
      throw new Error('POS signature is required');
    }

    requestData.config.notifyUrl = new URL('notify', this.apiBaseUrl).href;
    requestData.order.posSignature = this.posSignature;
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
