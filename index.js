require('dotenv').config();
const express = require('express');

class Netopia {
  constructor({
    apiKey = process.env.NETOPIA_API_KEY,
    apiUrl = process.env.API_URL,
    posSignature = process.env.NETOPIA_SIGNATURE,
    sandbox = false,
  } = {}) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.baseUrl = sandbox
      ? 'https://secure.sandbox.netopia-payments.com'
      : 'https://secure.mobilpay.ro/pay';
    this.posSignature = posSignature;
  }

  async sendRequest(url, method, data) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async startPayment(requestData) {
    if (!this.apiUrl) {
      throw new Error('API URL is required');
    }
    if (!this.posSignature) {
      throw new Error('POS signature is required');
    }

    requestData.config.notifyUrl = new URL('notify', this.apiUrl).href;
    requestData.order.posSignature = this.posSignature;
    const url = `${this.baseUrl}/payment/card/start`;

    try {
      const response = await this.sendRequest(url, 'POST', requestData);
      return response;
    } catch (error) {
      console.error('Error initiating payment:', error);
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
    const router = express.Router();

    router.post('/notify', this.rawTextBodyParser, (req, res) => {
      try {
        const { order, payment } = JSON.parse(req.body);
        if (!order || !payment) {
          throw new Error('Invalid request body');
        }

        callback({ order, payment });

        res.header('Content-Type', 'application/json');
        res.status(200).json({ errorCode: 0 });
      } catch (error) {
        console.error('Error', error.message);
        res.status(400).json({ errorCode: 1 });
      }
    });

    return router;
  }
}

module.exports = Netopia;
