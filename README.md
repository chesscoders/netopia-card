# Netopia Card

**Version 3 Update Notice**: v3 removes the unused `apiBaseUrl` option and `API_BASE_URL` environment variable, validates card and order data before sending it, and fixes the notification middleware to read the JSON body NETOPIA actually sends. See the migration guides below.

**Version 2 Update Notice**: v2 introduced significant changes from v1, including configuration options and methods.

Netopia Card is a lightweight NodeJS library designed to integrate the [Netopia mobilPay](https://netopia-payments.com) payment gateway into your projects with ease. It builds NETOPIA Payments API v2 requests from your input data, validates them before they are sent, and exposes the follow-up calls the API needs.

## Installation

To add Netopia Card to your project, run:

```sh
npm install netopia-card
# or, using Yarn
yarn add netopia-card
```

## Features

- Easy-to-use API for initiating card payments and handling callbacks
- Input validation before a request is sent, so bad data fails locally instead of on the payment page
- Signature verification for payment notifications through `verifyNotification`
- Payment status and error code constants, so nothing branches on a bare number
- 3-D Secure continuation through `verifyAuth`
- Installments and bonus points through `setPaymentOptions`

## Note

This library covers the card payment flow: `/payment/card/start` and `/payment/card/verify-auth`. Installments, bonus points, shipping addresses and custom order data are supported.

Not covered, because NETOPIA has not shipped it: **split payments**. The spec marks `payment.options.split` as "will be available in future versions" and `PaymentSplitDestination` as a "Future feature", so `setPaymentOptions` drops the field rather than sending something the gateway ignores - the whole amount would settle into the primary POS with no error. Also not covered: BNPL, Apple Pay, card-present terminals, the `/operation/*` calls (capture, void, credit, refund, expire) and order status, which the API documents as "will be available at a future date".

## Configuration

Before using Netopia Card, set your environment variables based on the credentials provided by Netopia for your sales point.

```sh
NETOPIA_API_KEY="Your_API_Key_Here"
NETOPIA_CONFIRM_URL="https://example.com/api/payment/notify"
NETOPIA_RETURN_URL="https://example.com/redirect"
NETOPIA_SIGNATURE="XXXX-XXXX-XXXX-XXXX-XXXX"

# Public key or certificate for verifying notifications, newlines escaped as \n
NETOPIA_PUBLIC_KEY="-----BEGIN CERTIFICATE-----\nMIIDIT...\n-----END CERTIFICATE-----"

# Optional: where the customer lands if they cancel the payment on the NETOPIA page
NETOPIA_CANCEL_URL="https://example.com/cancel"
```

These credentials can be found in the [NETOPIA Payments admin](https://admin.netopia-payments.com/) > Profile > Security.

### Sandbox or production

One more variable decides where the requests go: **`NODE_ENV`**. It picks the host when you do not pass the `sandbox` option:

```javascript
sandbox: process.env.NODE_ENV !== 'production'; // the default
```

So anywhere `NODE_ENV` is not exactly `production` - a container started without it, `NODE_ENV=prod`, a worker that never inherited it - every order goes to `secure.sandbox.netopia-payments.com`, answers a healthy `error.code '101'` with a payment URL, and looks paid end to end while no money moves. Pass `sandbox` explicitly if you do not control `NODE_ENV`:

```javascript
const netopia = new Netopia({ apiKey: process.env.NETOPIA_API_KEY, sandbox: false });
```

### Optional fields

- **`NETOPIA_CANCEL_URL`** (or the `cancelUrl` constructor option) is optional. When set, it is sent as `config.cancelUrl` and NETOPIA returns the customer there if they cancel the payment. When it is not set, the key is left out of the request.
- **`billing.phone`** is optional. NETOPIA does not require it: with the key missing, the payment starts normally and the NETOPIA page asks the customer for the phone number itself. A value that is empty, whitespace-only, or not a string or finite number (an object, an array, a boolean) is omitted from the request rather than sent. Do not pass a placeholder such as `-` instead: the NETOPIA page rejects it with "Numărul de telefon nu este valid" and the customer cannot get past the first step.

**Note on the OpenAPI spec**: NETOPIA's [OpenAPI spec](https://secure.sandbox.netopia-payments.com/spec) lists `billing.phone` under `Address.required`, but the API accepts the key being absent: it answers 200 with `error.code 101` and a `payment.paymentURL`, and the hosted page asks the customer for the number (empty field, placeholder `07xxxxxxxx`). Verified on sandbox. A strict contract check against the spec (`prism --errors`) will therefore flag a missing phone as invalid - that is a known spec/API divergence, not a bug in this library.

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

  if (error?.code !== '101' || !payment?.paymentURL) {
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
import NetopiaRedirect from './NetopiaRedirect';
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

  const { invoiceData, ...browserInfo } = req.body;
  const order = await createOrder(invoiceData); // your own record, your own amount

  try {
    netopia.setOrderData({
      amount: order.total,
      billing: {
        email: invoiceData.email,
        firstName: invoiceData.firstName,
        lastName: invoiceData.lastName,
        // phone is optional - NETOPIA asks the customer for it on its own page
      },
      description: `Order ${order.id}`,
      orderID: String(order.id),
    });

    netopia.setProductsData(order.products);

    // Optional: installments and bonus points
    // netopia.setPaymentOptions({ installments: 3 });

    // Only when you collect the card yourself; skip it for the NETOPIA-hosted page
    netopia.setBrowserData(browserInfo, req.ip);

    const response = await netopia.startPayment();
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

Handle payment notifications by creating a notification route. Verify the notification
before you act on it: `verifyNotification` checks the signature NETOPIA sends and returns the
notification it verified, or throws.

```javascript
const express = require('express');
const { Netopia, rawTextBodyParser } = require('netopia-card');
const { confirmOrder } = require('./orderHandlers');

const app = express();

app.post('/api/payment/notify', rawTextBodyParser, async (req, res) => {
  const netopia = new Netopia();

  try {
    // Throws unless the signature, the POS signature and the body hash all match.
    const { order, payment } = netopia.verifyNotification(req);

    await confirmOrder({ order, payment });

    res.status(200).json({ errorCode: 0 });
  } catch (error) {
    res.status(400).json({ errorCode: 1 });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

`rawTextBodyParser` reads the body raw for `application/json` (what NETOPIA sends), `text/plain`, or a missing content type, and skips anything else. Bodies over 1 MB are rejected with a 413, and an aborted request ends with a 400 instead of hanging.

**Security**: NETOPIA signs the notifications it sends, even though its OpenAPI spec does not mention it. The `Verification-token` header carries a JWT: `iss` is `NETOPIA Payments`, `aud` is the POS signature the notification is for, and `sub` is the base64 sha512 hash of the exact request body. `verifyNotification` checks all three plus the RSA signature, using the public key from NETOPIA Payments admin > Profile > Security (`NETOPIA_PUBLIC_KEY`).

Without that check the endpoint is open: anyone who learns your `notifyUrl` can post a paid notification to it. With it, still treat the notification as a trigger rather than the whole truth - check that `order.orderID` belongs to an order you created and that the amount matches what you charged, and make the handler idempotent so a replay changes nothing - a replayed notification is a valid notification, and NETOPIA retries. `netopia.verifyNotification(req, { maxAgeSeconds: 900 })` additionally rejects a token older than that, for tokens that carry `iat`. Mind the units when comparing: the spec documents the notification amount as "amount in decimal units, i.e. 1234 = 12.34", while the start response mirrors the amount you sent.

The hash is over the bytes as received, so the body has to reach `verifyNotification` unparsed. Pick one of two setups - `verifyNotification` accepts either.

**A. Raw on the notification route**, as in the example above. `rawTextBodyParser` leaves the bytes in `req.body` as a string. This only works if nothing parsed the body first: `express.json()` sets `req.body` before it even looks at the content type, and for `application/json` it consumes the stream, so an app-wide JSON parser leaves this route nothing to read. Mount the JSON parser per route, or use setup B.

```javascript
app.post('/api/payment/notify', rawTextBodyParser, handler);
```

**B. Parse JSON app-wide, keep the bytes.** `captureRawBody` stores them on `req.rawBody`, which `verifyNotification` prefers over `req.body`. Nothing else is needed on the route.

```javascript
const { captureRawBody } = require('netopia-card');

app.use(express.json({ verify: captureRawBody }));
app.post('/api/payment/notify', handler);
```

### Reusing an instance

A `Netopia` instance accumulates whatever you set on it: the order, the products, the card, the payment options and the browser data. Build one per payment, or call `reset()` between orders:

```javascript
netopia.reset(); // clears the order and the payment, instrument and options included
```

`reset()` keeps the constructor options - API key, URLs, language, sandbox - and drops everything else, notably the card number and the secret code, which should not outlive the request that used them.

### Error and status codes

`isPaymentError(code)` is true for everything except `'00'`, on purpose. `'100'` (3-D Secure needed) and `'101'` (redirect to `payment.paymentURL`) are normal answers, but nothing is settled yet, so treating "not an error" as "paid" would fulfil an order the customer has not paid for. Branch on the code itself:

```javascript
const { ErrorCode, isPaymentError } = require('netopia-card');

const { error, payment, customerAction } = await netopia.startPayment();

if (error.code === ErrorCode.REDIRECT_TO_PAYMENT_URL) {
  return res.json({ redirectTo: payment.paymentURL }); // not paid yet
}
if (error.code === ErrorCode.THREE_D_AUTH_REQUIRED) {
  return res.json({ customerAction }); // 3-D Secure, not paid yet
}
if (isPaymentError(error.code)) {
  throw new Error(error.message);
}
// ErrorCode.APPROVED: payment.status 3 (paid) or 5 (confirmed)
```

### Payment statuses

`error.code` tells you how the request went; `payment.status` tells you where the money is. The first is a string (`'00'`, `'101'`), the second a number, and both arrive bare, so the package exports the names:

```javascript
const { PaymentStatus, resolvePaymentAction } = require('netopia-card');

const { order, payment } = netopia.verifyNotification(req);

switch (resolvePaymentAction(payment.status, { expired: isPastDeadline(order) })) {
  case 'approve': // 3 paid, 5 confirmed
    return fulfill(order.orderID);
  case 'chargeback': // 9, 10, 16 - settled, then taken back
    return escalate(order.orderID);
  case 'reject': // 4 canceled, 11 error, 12 declined, 13 fraud, 17 reversed, 23 expired
    return release(order.orderID);
  case 'expire':
    return close(order.orderID);
  case 'unreadable': // NETOPIA sent no status: nothing is known, leave the order alone
  case 'pending':
    return;
}

// or branch on the status yourself
if (payment.status === PaymentStatus.THREE_D_AUTH) {
  // the customer is still on the 3-D Secure page
}
```

A status read back from storage as a string is accepted, since `payment.status` often makes a round trip through a database column.

Also exported: `SETTLED_PAYMENT_STATUSES`, `FINAL_FAILURE_STATUSES`, `CHARGEBACK_STATUSES` and `ErrorCode`. The spec names only four statuses, so the rest come from NETOPIA's own SDK, which also describes status 13 as "payment in reviewing" - `FINAL_FAILURE_STATUSES` counts it as a failure anyway, so check `PaymentStatus.FRAUD` yourself first if you would rather hold such an order than release it.

### 3-D Secure continuation

When NETOPIA hosts the card form, `startPayment` answers `error.code === '101'` with `payment.paymentURL`: redirect the customer there and NETOPIA runs 3-D Secure itself.

If you collect the card yourself with `setPaymentData`, the answer can instead be `error.code === '100'` with `payment.status === 15` and a `customerAction`. Post a form to `customerAction.url` with the fields in `customerAction.formData`, keep `customerAction.authenticationToken` and `payment.ntpID` in the session, then authorize the payment when the customer comes back to your `redirectUrl`:

```javascript
const response = await netopia.verifyAuth({
  authenticationToken: req.session.authenticationToken,
  ntpID: req.session.ntpID,
  formData: req.body,
});
```

## Migration Guide from v2 to v3

- The `apiBaseUrl` constructor option and the `API_BASE_URL` environment variable are gone. Nothing read them: the library calls the NETOPIA endpoints directly. Delete `API_BASE_URL` from your environment and stop passing `apiBaseUrl`; TypeScript will point at the call site. If you read `netopia.apiBaseUrl` anywhere, it is now `undefined`.
- Values that used to reach NETOPIA broken now throw locally: an expiry that does not coerce to a real month or a 4-digit year (`expYear: '30'` was sent as `30`), a secret code longer than 4 characters, a negative amount, `setPaymentOptions` with no usable `installments`/`bonus`, and a `billing.country`/`shipping.country` that is not an ISO 3166-1 numeric code (`country: 'RO'` used to ship as `"country":null`). Each one used to be silently declined or silently ignored by the gateway.
- `billing.phone` accepts a string or a finite number. An object, an array, a boolean, `NaN` or `Infinity` is treated as no phone at all and omitted; 2.2.0 sent `"phone":{}` for an object.
- `shipping.country` is coerced to an integer, like `billing.country` always was.
- `setOrderData` forwards `shipping`, `data` and `clientID`, which were dropped before. If you have been passing malformed values in those keys, NETOPIA now sees them.
- `verifyAuth` requires `formData`, and it must be an object. The spec calls every field received on your `redirectUrl` mandatory and unaltered, and `rawTextBodyParser` hands you a string - parse it before passing it on.
- `account` must be a string of digits and `secretCode` 3 or 4 digits. A card number passed as a number loses digits to float precision, and an array used to be sent verbatim next to the PAN.
- `setOrderData` no longer carries products over from a previous order on the same instance. Call `setProductsData` after `setOrderData`, as the examples do, or the basket is dropped instead of being attached to the wrong order.
- `notifyUrl`, `redirectUrl` and `cancelUrl` must be `http:` or `https:`.
- Requests time out after 30 seconds instead of hanging forever; pass `timeout` to the constructor to change it.
- `rawTextBodyParser` now reads `application/json` bodies, which is what NETOPIA sends, and leaves the bytes on `req.rawBody` as well as the string on `req.body`. Do not mount another body parser ahead of it on that route: it skips a request whose body was already read, and `verifyNotification` then has nothing to hash. Either keep the JSON parser off the notification route, or drop `rawTextBodyParser` and use `express.json({ verify: captureRawBody })`.

`isPaymentError` is unchanged: only `'00'` is a success.

## Migration Guide from v1 to v2

Version 2 of Netopia Card introduces several key changes:

- `startPayment` no longer takes the configuration as an argument; the constructor and the `set*` methods carry it.

**To migrate from v1 to v2:**

1. Set `NETOPIA_CONFIRM_URL` and `NETOPIA_RETURN_URL` (or pass `notifyUrl` and `redirectUrl` to the constructor) instead of passing them to `startPayment`.
2. Update any calls to `startPayment` to match the new method signature: it takes no arguments and reads the data you passed to `setOrderData`, `setProductsData`, `setPaymentOptions`, `setPaymentData` and `setBrowserData`.

## Further Resources

- [Sandbox Testing Cards](https://support.netopia-payments.com/en-us/article/52-carduri-de-test)

For detailed information on the API and configuration options, please refer to the [NETOPIA Payments - merchant API](https://apidoc.netopia-payments.com/index.html).

## Contributing

We welcome contributions to improve Netopia Card. Please feel free to submit pull requests or report issues via the [GitHub repository](https://github.com/chesscoders/netopia-card).

`npm test` runs offline: the API call is mocked. One suite talks to the real sandbox and is skipped unless you ask for it, which needs valid credentials in your environment:

```sh
NETOPIA_LIVE_TEST=1 npm test
```

## License

Netopia Card is licensed under the MIT License. See the LICENSE file for more details.
