require('dotenv').config();
const axios = require('axios');
const { generateKeys, encrypt, decrypt } = require('./functions');

class Netopia {
  constructor({
    apiBaseUrl = process.env.API_BASE_URL,
    apiKey = process.env.NETOPIA_API_KEY,
    posSignature = process.env.NETOPIA_SIGNATURE,
    sandbox = false,
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

module.exports = {
  Netopia,
  generateKeys,
  encrypt,
  decrypt,
  decryptRequestBody,
};
