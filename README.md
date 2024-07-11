# Netopia Card

**Version 2 Update Notice**: This version (v2) introduces significant changes from v1, including configuration options and methods. Please see the migration guide below for details.

Netopia Card is a lightweight NodeJS library designed to integrate the [Netopia mobilPay](https://netopia-payments.com) payment gateway into your projects with ease. It allows for the construction of Netopia mobilPay requests from input data and validates Netopia mobilPay responses using the private key associated with your account.

## Installation

To add Netopia Card to your project, run:

```sh
npm install netopia-card
# or, using Yarn
yarn add netopia-card
```

## Features

- Easy-to-use API for initiating card payments and handling callbacks
- Robust validation of Netopia mobilPay responses for secure transaction processing

## Note

Currently, split payments and setting custom parameters are not available due to the transition from v1 to v2, but these features will be available soon.

## Configuration

Before using Netopia Card, set your environment variables based on the credentials provided by Netopia for your sales point.

```sh
API_BASE_URL="https://example.com/"
NETOPIA_API_KEY="Your_API_Key_Here"
NETOPIA_CONFIRM_URL="https://example.com/api/payment/notify"
NETOPIA_RETURN_URL="https://example.com/redirect"
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
  apiKey: process.env.NETOPIA_API_KEY,
  sandbox: true, // Use `false` for production
});
```

### Frontend Integration

To handle the payment redirection in a React application using Next.js:

```javascript
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

const NetopiaRedirect = ({ error, payment }) => {
  const router = useRouter();
  const ref = useRef();

  useEffect(() => {
    if (error?.code === '101' && payment?.paymentURL) {
      ref.current.click();
    }
  }, [error, payment]);

  if (!error?.code === '101' || !payment?.paymentURL) {
    return null;
  }

  return (
    <button
      className="hidden"
      onClick={() => router.push(payment.paymentURL)}
      ref={ref}
      type="button"
    />
  );
};

export default NetopiaRedirect;
```

### Integrate the form and payment handling logic

Here's an example of how to integrate the form and payment handling logic using Formik and a simple form component:

```javascript
import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import { NetopiaRedirect } from './NetopiaRedirect';
import { collectBrowserInfo } from 'netopia-card';
import { useMutation } from 'react-query';
import axios from 'axios';

const PaymentForm = () => {
  const [netopia, setNetopia] = useState({});

  const mutation = useMutation((payload) => axios.post('/api/payment/start', payload));

  const handleSubmit = async (values) => {
    const payload = {
      ...collectBrowserInfo(navigator, window),
      invoiceData: values,
    };
    try {
      const { data } = await mutation.mutateAsync(payload);
      setNetopia(data);
    } catch (error) {
      console.error('Payment initiation failed:', error);
    }
  };

  return (
    <Formik initialValues={{ firstName: '', lastName: '', email: '' }} onSubmit={handleSubmit}>
      <Form>
        <div>
          <label htmlFor="firstName">First Name</label>
          <Field id="firstName" name="firstName" placeholder="John" />
        </div>
        <div>
          <label htmlFor="lastName">Last Name</label>
          <Field id="lastName" name="lastName" placeholder="Doe" />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <Field id="email" name="email" type="email" placeholder="john@example.com" />
        </div>
        <button type="submit">Submit</button>
        <NetopiaRedirect {...netopia} />
      </Form>
    </Formik>
  );
};

export default PaymentForm;
```

### Backend API

To start a payment, use the `startPayment` method with the necessary payment details:

```javascript
const express = require('express');
const { Netopia } = require('netopia-card');

const router = express.Router();

router.post('/api/payment/start', async (req, res) => {
  const netopia = new Netopia({
    apiKey: process.env.NETOPIA_API_KEY,
    sandbox: true,
  });

  const requestData = {
    // Define your request data here
  };

  try {
    const response = await netopia.startPayment(requestData);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

Handle payment notifications by creating a notification route:

```javascript
const express = require('express');
const { rawTextBodyParser } = require('netopia-card');
const { confirmOrder } = require('./orderHandlers');

const app = express();

app.post('/api/payment/notify', rawTextBodyParser, async (req, res) => {
  try {
    const { order, payment } = JSON.parse(req.body);
    if (!order || !payment) {
      throw new Error('Invalid request body');
    }

    await confirmOrder({ order, payment });

    res.status(200).json({ errorCode: 0 });
  } catch (error) {
    res.status(400).json({ errorCode: 1 });
  }
});

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
