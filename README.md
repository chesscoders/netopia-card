# Netopia Card

Lightweight NodeJS library to integrate [Netopia mobilPay](https://netopia-payments.com) payment gateway in your projects.

- builds Netopia mobilPay request from the input data
- adds split payments field to the request to send part of the payment to another account
- validates Netopia mobilPay response based on the private key associated with the account

## Installation

```sh
npm i netopia-card
#or
yarn add netopia-card
```

## Useful links

- [request structure for card payments](https://support.netopia-payments.com/en-us/article/39-care-este-structura-unui-request-de-plata-prin-card)
- [demo cards used for sandbox](https://support.netopia-payments.com/en-us/article/52-carduri-de-test)

## Usage

The first step for using this library is to set yor unique environment variables from an **approved** Netopia sales point.

You can find these keys in the [Netopia admin dashboard](https://admin.netopia-payments.com/domains) > Puncte de vanzare > Vezi lista > Setari tehnice

Your `.env` file should look like this:

```sh
NETOPIA_SIGNATURE="XXXX-XXXX-XXXX-XXXX-XXXX"
NETOPIA_PRIVATE_KEY_B64="-----BEGIN PRIVATE KEY-----
XXXX...XXXX
-----END PRIVATE KEY-----"
NETOPIA_PUBLIC_KEY_B64="-----BEGIN CERTIFICATE-----
XXXX...XXXX
-----END CERTIFICATE-----"
```

Import the library

```javascript
const Netopia = require('netopia-card'); // ES5
import Netopia from 'netopia-card'; // ES6
```

| `constructor` params | Type      | Description                      |
| -------------------- | --------- | -------------------------------- |
| signature            | `String`  | Signature provided by Mobilpay   |
| publicKey            | `String`  | Public key provided by Mobilpay  |
| privateKey           | `String`  | Private key provided by Mobilpay |
| sandbox              | `Boolean` | Use for sandbox                  |

If you saved the signature, the public key, and the private key in the `.env` file, you do not have to provide the constructor with parameters. These will be taken from the environment variables if they exist.

```javascript
const netopia = new Netopia();
```

or

```javascript
const netopia = new Netopia({
  signature, // Netopia mobilPay signature
  publicKey, // Netopia mobilPay public key
  privateKey, // Netopia mobilPay private key
});
```

After initialization, you need to initialize and set the client and payment details.

| `setClientBillingData` params | Type     | Description               |
| ----------------------------- | -------- | ------------------------- |
| firstName                     | `String` | The client's first name   |
| lastName                      | `String` | The client's last name    |
| county                        | `String` | The client's county       |
| city                          | `String` | The client's city         |
| address                       | `String` | The client's address      |
| email                         | `String` | The client's email        |
| phone                         | `String` | The client's phone number |

```javascript
netopia.setClientBillingData({
  firstName: "John",
  lastName: "Doe",
  county: "Romania",
  city: "Bucharest",
  address: "123 Main St",
  email: "example@email.com",
  phone: "1234567890",
});
```

| `setPaymentData` params | Type     | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| orderId                 | `String` | The unique identifier for the payment                           |
| amount                  | `Number` | The amount to be paid                                           |
| currency                | `String` | The currency in which the payment will take place               |
| details                 | `String` | The details of the payment                                      |
| confirmUrl              | `String` | The url which the Netopia API should call for confirmation      |
| returnUrl               | `String` | The url which the Netopia API should return after confirmation  |

```javascript
netopia.setPaymentData({
  orderId: Date.now().toString(),
  amount: 1,
  currency: "RON",
  details: "No details",
  confirmUrl: "http://confirm.url",
  returnUrl: "http://return.url",
});
```

You can also set a different shipping address by using `netopia.setClientShippingData({...})` which has the same parameters as `netopia.setClientBillingData({...})` presented above.

For setting up split payments you can use the `setSplitPayment` function:

| `setSplitPayment` params | Type     | Description                                    |
| ------------------------ | -------- | ---------------------------------------------- |
| firstDestinationId       | `String` | The sac id (signature) of the first recipient  |
| firstDestinationAmount   | `Number` | The amount for the first recipient             |
| secondDestinationId      | `String` | The sac id (signature) of the second recipient |
| secondDestinationAmount  | `Number` | The amount for the second recipient            |

```javascript
netopia.setSplitPayment("<first_recipient_sac_id>", 1, "<second_recipient_sac_id>", 2);
```

To build the request

```javascript
const request = netopia.buildRequest();
```

The `request` that will be constructed will look like:

```javascript
{
  "url": "http://sandboxsecure.mobilpay.ro",
  "env_key": "OQR4VUMOHY1W+jMcE8NCc7Es2mf37+lqECwygW8rS1O55E2kkwwZqY9oyG4WuXeyN7rjIiC3YvmvJ1od8+5f2p1ygxe4H1gp0naxfEi52W/PAuoChgqkVKswvI67kzKg3yc7JGpbPcOp+hTgnTAzegWGb69WTpLxWf+HGHs0A/o=",
  "data": "OImfydaqxpWVm0ygudhUNaV0vlBkpHSEcs+gqX5z8vr1rt5KXCLtODtTsXo2/B4D7sYpIj21sm4hr4M/80/DuaH/46tw2v602PUs3MdVqY7/KWiDUw3EywwB5Vjvwqd4DfIUtOBYTvbTPvnj2Ly5MdUWxtJpOFkE3UbmmbJqDYIqQDus/G8EisHeJI73pWumoSOZjYpukV6wj4uh9Pbp/GlnaFPIvKWECF0lBx8yr6kYbLGcDYqB6ly8yAtr1BOcCmcfV2J5BGbnPnF3RbAdGYvwd5Vt2MvzdETeoYrtb+hTjw1c2HSo/P/NhbKzk9IOA6ZkMcDE4Lti82c4QkwfwSTtyYlrkszk1CmU+m3r6if0qPqvTd5KTn7Zi/YcRNvwYmu05MKgth8MuAl/guqx37H9o6dSBDpBmCi+fRQ09J/BvzjIihAVpqypayByRu/jB6KJ4PZrBMHdsTdkbjDosuWfJPeEl+HwkWXnTsTdemGjsxpIE80Cat8c2ma/LHMvcRkpowOwX6YAhKBifI+s7zKbbA9L351YqgUSwKLXT2IuWiaPWIF+0ppSMI3Kc3Eqd6GdnFLy1Ku+IX3wpY4rOetbdYdotdLSfTceThx1raQfA6UMqbW7JdRgo++SfLXXO+p9QatWps+ZvLjhFCqufF5l0SeNFyXvmVkk1Qvu0uBxLy+V1t6qoX3SiVho/tEIFf6EcZ3Rp8pHUo+YTQmME+kXP0lexp6Ur3BNYiCqmi6Vobg23IguNzjZV0PIIH0etbq186Rqcz9otmPekO6/z1cZKTVtgoO2t+5PNWQ4ivjvSizUlV2Ltv3D7YqC1bOMJR4rrKarMLUnczAoWplT9OIK7eSnwo3kF7/vceKZJt4J+CbRBWHGATV/c7ktgkJXoOyPyjq8NqRnkX2ECnRVwegOa/ZIoIldPUuQoEqi1Ie5m4IerUDULBVoOGzbzEeq+3H2oGTPyoyCdmK1nz6DiDTMrnRb7C++hPz2+MN6DxYYFAIkXmh6NzfLTK8x/vVeSHkCea1drjSIUTscx9U+uYtcgUpl81IIhGGbvoCaqScf7Pedrj8pZujyX34DBqJ0wdHtFwu3jDL5znRiCIqlmJCYErweJoUCcTphDvpUwY6vWOise+5n33gCf1/FrUrXRApcU9N3/HokiT90cIfyK95TGunU5Q=="
}
```

To send a request to Mobilpay, you need to setup a `form` with `method="POST"`, and `action=request.url`.
As inputs for the form, you need to send the `request.env_key` and `request.data`.

After being processed and the payment has been made, the Mobilpay API will make an API call to the `confirmUrl` set above. The `confirmUrl` should be an endpoint on the API you are building, because it needs to verify the response from Mobilpay.

To verify, you need the `validatePayment` method which take the `env_key` and `data` from the Mobilpay request body, and also set the private key (from file or string).

| `validatePayment` params | Type     | Description                                |
| ------------------------ | -------- | ------------------------------------------ |
| env_key                  | `String` | The env_key from the Mobilpay request body |
| data                     | `String` | The data from the Mobilpay request body    |

```js
const { data, env_key } = req.body;
const netopia = new Netopia();
const response = await netopia.validatePayment(env_key, data);

if (response.error) {
  /*
   * Code in case of error
   */
  res.set(response.res.set.key, response.res.set.value);
  res.status(200).send(response.res.send);
}

/*
 * Code in case of success
 */
switch (response.action) {
  case "confirmed":
    // do something
    break;
  case "paid":
    // do something
    break;
  case "paid_pending":
    // do something
    break;
  case "confirmed_pending":
    // do something
    break;
}

res.set(response.res.set.key, response.res.set.value);
res.status(200).send(response.res.send);
```

A successful `response` from the validation looks like this:

```javascript
{
    "action": mobilpayAction,
    "errorMessage": null,
    "error": null,
    $: {...},
    "orderInvoice": {...},
    "res": {
        "set": {
            "key": "Content-Type",
            "value": "application/xml"
        },
        "send": `<?xml version="1.0" encoding="utf-8" ?><crc>errorMessage</crc>`
    }
}
```

## Implementation details

### Confirm URL vs return URL

- **confirm URL** - a URL in your API that will be called whenever the status of a payment changes
- **return URL** - a URL in your web application where the client will be redirected to once the payment is complete.

The `returnUrl` **should not be confused with a success or cancel URL**, the information displayed here is dynamic,
based on the information previously sent to the `confirmUrl`.

The `returnUrl` should be a static page to indicate the end-user that the payment has been made.
