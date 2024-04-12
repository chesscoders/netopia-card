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
API_URL="https://api.yourdomain.com/v1/"
NETOPIA_API_KEY="Your_API_Key_Here"
NETOPIA_SIGNATURE="XXXX-XXXX-XXXX-XXXX-XXXX"
```

These credentials can be found in the [NETOPIA Payments admin](https://admin.netopia-payments.com/) > Profile > Security.

## Quick Start

First, import the library into your project:

```javascript
const Netopia = require('netopia-card');
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
const paymentDetails = {
  // Define your payment details here
};

netopia
  .startPayment(paymentDetails)
  .then((response) => console.log(response))
  .catch((error) => console.error(error));
```

Handle payment notifications by creating a notification route:

```javascript
const express = require('express');
const app = express();

app.use(
  netopia.createNotifyRoute((notification) => {
    console.log('Payment notification received:', notification);
  })
);

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Migration Guide from v1 to v2

Version 2 of Netopia Card introduces several key changes:

- The configuration process now includes setting the `API_URL` in your environment variables. This URL is used to construct the full URL for the Netopia notify callback endpoint.
- The `startPayment` and `createNotifyRoute` methods have been updated to accommodate the new configuration options.
- Removal of `redirectUrl` from the `Config` type in favor of a server-side handling approach for payment completion redirection.

**To migrate from v1 to v2:**

1. Update your environment variables to include `API_URL`.
2. Adjust your `Netopia` instantiation to include the new `apiUrl` option if you were previously passing `redirectUrl` and `notifyUrl` directly to the `startPayment` method.
3. Update any calls to `startPayment` to match the new method signature.

## Further Resources

- [Sandbox Testing Cards](https://support.netopia-payments.com/en-us/article/52-carduri-de-test)

For detailed information on the API and configuration options, please refer to the [NETOPIA Payments - merchant API](https://apidoc.netopia-payments.com/index.html).

## Contributing

We welcome contributions to improve Netopia Card. Please feel free to submit pull requests or report issues via the [GitHub repository](https://github.com/chesscoders/netopia-card).

## License

Netopia Card is licensed under the MIT License. See the LICENSE file for more details.
