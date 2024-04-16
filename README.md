# Netopia Card

**Version 2 Update Notice**: This version (v2) introduces significant changes from v1, including configuration options and methods. Please see the migration guide below for details.

Netopia Card is a lightweight NodeJS library designed to integrate the [Netopia mobilPay](https://netopia-payments.com) payment gateway into your projects with ease. It allows for the construction of Netopia mobilPay requests from input data, supports split payments, and validates Netopia mobilPay responses using the private key associated with your account.

## Installation

To add Netopia Card to your project, run:

```sh
npm install netopia-card
# or, using Yarn
yarn add netopia-card
```

## Features

- Easy-to-use API for initiating card payments and handling callbacks
- Support for split payments, allowing a portion of the payment to be sent to another account
- Robust validation of Netopia mobilPay responses for secure transaction processing

## Configuration

Before using Netopia Card, set your environment variables based on the credentials provided by Netopia for your sales point.

```sh
API_BASE_URL="https://example.com/"
NETOPIA_API_KEY="Your_API_Key_Here"
NETOPIA_SIGNATURE="XXXX-XXXX-XXXX-XXXX-XXXX"
```

These credentials can be found in the [NETOPIA Payments admin](https://admin.netopia-payments.com/) > Profile > Security.

## Quick Start

First, import the library into your project:

```javascript
const { Netopia } = require('netopia-card');
```

Create a new instance of Netopia by providing your API key and other configuration options:

```javascript
const netopia = new Netopia({
  apiKey: 'Your_API_Key_Here',
  sandbox: true, // Use `false` for production
});
```

Initiate a payment by calling the `startPayment` method with the necessary payment details:

```javascript
const { decryptRequestBody } = require('netopia-card');

router.post('/payment/start', decryptRequestBody, async function (req, res) {
  const requestData = {
    config: {
      emailTemplate: '',
      emailSubject: '',
      language: 'ro',
    },
    payment: {
      options: {
        installments: 0,
        bonus: 0,
      },
      instrument: {
        type: 'card',
        account: '9900009184214768',
        expMonth: 12,
        expYear: 2022,
        secretCode: '111',
        token: '',
      },
      data: {
        BROWSER_USER_AGENT:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        BROWSER_TZ: 'Europe/Bucharest',
        BROWSER_COLOR_DEPTH: '32',
        BROWSER_JAVA_ENABLED: 'true',
        BROWSER_LANGUAGE: 'en-US,en;q=0.9',
        BROWSER_TZ_OFFSET: '0',
        BROWSER_SCREEN_WIDTH: '1200',
        BROWSER_SCREEN_HEIGHT: '1400',
        BROWSER_PLUGINS: 'Chrome PDF Plugin, Chrome PDF Viewer, Native Client',
        MOBILE: 'false',
        SCREEN_POINT: 'false',
        OS: 'macOS',
        OS_VERSION: '10.15.7 (32-bit)',
        IP_ADDRESS: '127.0.0.1',
      },
    },
    order: {
      ntpID: '',
      posSignature: 'XXXX-XXXX-XXXX-XXXX-XXXX',
      dateTime: '2023-08-24T14:15:22Z',
      description: 'Some order description',
      orderID: 'Merchant order Id',
      amount: 1,
      currency: 'RON',
      billing: {
        email: 'user@example.com',
        phone: '+407xxxxxxxx',
        firstName: 'First',
        lastName: 'Last',
        city: 'City',
        country: 642,
        countryName: 'Romania',
        state: 'State',
        postalCode: 'Zip',
        details: '',
      },
      shipping: {
        email: 'user@example.com',
        phone: '+407xxxxxxxx',
        firstName: 'First',
        lastName: 'Last',
        city: 'City',
        country: 642,
        state: 'State',
        postalCode: 'Zip',
        details: '',
      },
      products: [
        {
          name: 'string',
          code: 'SKU',
          category: 'category',
          price: 1,
          vat: 19,
        },
      ],
      installments: {
        selected: 0,
        available: [0],
      },
      data: {
        property1: 'string',
        property2: 'string',
      },
    },
  };

  try {
    const response = await netopia.startPayment(requestData);
    console.log(response);

    if (response.error?.code === '00') {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('Error', error.message);
    res.status(500).json({ message: error.message });
  }
});
```

Handle payment notifications by creating a notification route:

```javascript
const express = require('express');
const app = express();

app.use(
  ...netopia.createNotifyRoute(({ payment, order }) => {
    console.log('Order ID:', order?.orderID);

    switch (payment?.status) {
      case 3:
        console.log('Payment was successful');
        break;
      case 5:
        console.log('Payment was confirmed');
        break;
      case 12:
        console.log('Payment was rejected');
        break;
      default:
        console.log('Payment status unknown');
        break;
    }
  })
);

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Migration Guide from v1 to v2

Version 2 of Netopia Card introduces several key changes:

- The configuration process now includes setting the `API_BASE_URL` in your environment variables. This URL is used to construct the full URL for the Netopia notify callback endpoint.
- The `startPayment` and `createNotifyRoute` methods have been updated to accommodate the new configuration options.
- Removal of `redirectUrl` from the `Config` type in favor of a server-side handling approach for payment completion redirection.

**To migrate from v1 to v2:**

1. Update your environment variables to include `API_BASE_URL`.
2. Adjust your `Netopia` instantiation to include the new `apiBaseUrl` option if you were previously passing `redirectUrl` and `notifyUrl` directly to the `startPayment` method.
3. Update any calls to `startPayment` to match the new method signature.

## Further Resources

- [Sandbox Testing Cards](https://support.netopia-payments.com/en-us/article/52-carduri-de-test)

For detailed information on the API and configuration options, please refer to the [NETOPIA Payments - merchant API](https://apidoc.netopia-payments.com/index.html).

## Contributing

We welcome contributions to improve Netopia Card. Please feel free to submit pull requests or report issues via the [GitHub repository](https://github.com/chesscoders/netopia-card).

## License

Netopia Card is licensed under the MIT License. See the LICENSE file for more details.
