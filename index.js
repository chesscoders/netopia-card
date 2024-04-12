require('dotenv').config();
const express = require('express');

/**
 * The Netopia class manages integration with NETOPIA Payments API.
 */
class Netopia {
  /**
   * Creates an instance of the Netopia class.
   * @param {Object} [options] The options for configuring the Netopia instance.
   * @param {string} [options.apiKey] The API key for authentication with the Netopia service. If not specified, the value from the `API_KEY` environment variable is used.
   * @param {string} [options.apiUrl] The API URL for the Netopia notification callback. It is used to construct the full URL for the Netopia `notifyUrl` callback endpoint. If not specified, the value from the `API_URL` environment variable is used.
   * @param {string} [options.posSignature] The POS signature. If not specified, the value from the `POS_SIGNATURE` environment variable is used.
   * @param {boolean} [options.sandbox=false] If `true`, the sandbox environment is used for testing. Otherwise, the production environment is used.
   */
  constructor({
    apiKey = process.env.API_KEY,
    apiUrl = process.env.API_URL,
    posSignature = process.env.POS_SIGNATURE,
    sandbox = false,
  } = {}) {
    if (!apiUrl) {
      throw new Error('API URL is required');
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.posSignature = posSignature;
    this.baseUrl = sandbox
      ? 'https://secure.sandbox.netopia-payments.com'
      : 'https://secure.mobilpay.ro/pay';
  }

  /**
   * Sends an HTTP request to the Netopia service.
   * @param {string} url The URL to which the request is made.
   * @param {'POST'} method The HTTP method used for the request.
   * @param {Object} data The request body for POST methods.
   * @returns {Promise<Object>} The response from the server as a JSON object.
   * @throws {Error} Throws an error if the request does not complete successfully.
   */
  async sendRequest(url, method, data) {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Initiates a payment through Netopia.
   * @param {StartRequest} requestData The data needed to initiate the payment, which includes:
   * - `config`: Configuration options for the payment.
   *    - `emailTemplate` (optional): The email template to use.
   *    - `emailSubject` (optional): The subject line for the email.
   *    - `cancelUrl` (optional): The URL to redirect to if the payment is cancelled.
   *    - `redirectUrl`: The URL to redirect to after payment completion.
   *    - `language`: The language code for the payment interface.
   * - `payment`: Payment details.
   *    - `options`: Payment options, such as installments and bonus points.
   *    - `instrument`: The payment instrument, e.g., card details.
   *    - `data`: Additional attributes/data for the payment request.
   * - `order`: Order details.
   *    - `billing`: Billing information.
   *    - `shipping` (optional): Shipping information, if different from billing.
   *    - `products` (optional): List of products included in the order.
   *    - `installments` (optional): Installment options for the payment.
   *    - `data` (optional): Additional attributes/data for the order.
   * @returns {Promise<Object>} The response from Netopia with details about the payment.
   * @throws {Error} Throws an error if the payment initiation request fails.
   */
  async startPayment(requestData) {
    requestData.config.notifyUrl = this.apiUrl + '/notify';
    const url = `${this.baseUrl}/payment/card/start`;
    try {
      const response = await this.sendRequest(url, 'POST', requestData);
      return response;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  /**
   * Middleware for parsing raw text body requests.
   * @param {express.Request} req The Express request object.
   * @param {express.Response} _res The Express response object.
   * @param {Function} next The callback function to pass control to the next middleware.
   */
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

  /**
   * Creates an Express route that handles payment notifications from Netopia.
   * @param {NotificationCallback} callback The function to be called with the payment notification data. The callback receives a `NotifyRequest` object:
   *    - `payment`: Payment notification details.
   *    - `order`: Order details from the notification.
   * @returns {express.Router} The Express router configured for the notification route.
   */
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
