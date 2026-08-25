# Changelog

All notable changes to this project are documented in this file. Releases before 2.2.0 are only
recorded in the [commit history](https://github.com/chesscoders/netopia-card/commits/master).

## [3.0.0] - 2026-08-24

### Removed

- **Breaking**: the `apiBaseUrl` constructor option and the `API_BASE_URL` environment variable.
  Nothing ever read them - the library calls the NETOPIA endpoints directly - while the README
  claimed they built the notify URL. Passing `apiBaseUrl` is now a TypeScript error and
  `netopia.apiBaseUrl` is `undefined`.

### Added

- `verifyNotification` and `netopia.verifyNotification(req)` verify a payment notification
  (IPN) and return the notification they verified, or throw. NETOPIA signs every notification
  and sends the signature as a JWT in the `Verification-token` header - `iss` is
  `NETOPIA Payments`, `aud` is the POS signature, `sub` is the base64 sha512 hash of the exact
  request body - so an unverified notification endpoint accepts a paid notification from anyone
  who learns its URL. The public key comes from the new `publicKey` option, defaulting to
  `NETOPIA_PUBLIC_KEY`; a PEM public key and an X.509 certificate both work, with escaped
  newlines allowed. Verified with node `crypto`, so the package still has no crypto dependency.
- `captureRawBody`, for apps that parse JSON app-wide: `express.json({ verify: captureRawBody })`
  keeps the bytes on `req.rawBody`, which is what the hash is over.
  `netopia.verifyNotification(req)` reads either `req.rawBody` or the string body
  `rawTextBodyParser` leaves behind.
- `PaymentStatus`, the full set of 23 payment statuses NETOPIA uses in its own SDKs (the API
  spec documents 3, 5, 12 and 15), plus `SETTLED_PAYMENT_STATUSES`, `FINAL_FAILURE_STATUSES`,
  `CHARGEBACK_STATUSES` and `ErrorCode`. All frozen.
- `resolvePaymentAction(paymentStatus, { expired })` maps a payment status to what to do with a
  waiting order: `approve`, `reject`, `expire`, `pending`, or `unreadable` when NETOPIA returns
  no status at all and nothing is known about the payment.
- `verifyAuth({ authenticationToken, ntpID, formData })` calls `POST /payment/card/verify-auth`,
  the step the API requires after a start response returns `error.code 100` with a
  `customerAction`. Without it, the flow that sends card data through `setPaymentData` could be
  started but never completed. `formData` is mandatory: the spec calls every field received on
  your `redirectUrl` mandatory and unaltered.
- `setPaymentOptions({ installments, bonus })` fills `payment.options`, which could not be set at
  all before. Both values are coerced to integers and rejected if they are not, and a call with
  neither of them throws instead of quietly sending `{}`.
- `setOrderData` forwards `shipping`, `data` and `clientID` when they are passed; they were
  silently dropped before. `order.ntpID` and `order.installments` stay dropped on purpose: the
  spec marks the first `_obsolete_` and the second `Not used`. Installments are configured
  through `setPaymentOptions`.
- `reset()` clears the order and the payment - `instrument`, `options` and `data` included - so
  one instance can build the next order without carrying the previous card, secret code or
  payment options. The constructor options are kept.
- `collectBrowserInfo` collects `SCREEN_PRINT` and `setBrowserData` forwards it. It appears in
  NETOPIA's own sample start request; the spec models `payment.data` as free-form attributes, so
  no device field is declared there.
- `rawTextBodyParser` reads `application/json` bodies, which is what NETOPIA sends notifications
  as - the middleware used to hand those to the next middleware unread, leaving `req.body`
  undefined and the documented `JSON.parse(req.body)` throwing on every real notification.
  Alongside that: the content type is matched case-insensitively and without its parameters, so
  `Application/JSON` and `text/plain; charset=utf-8` are read and `text/plainish` is not; the body
  is decoded with `setEncoding` so a diacritic split across two TCP segments no longer arrives as
  U+FFFD; the 1 MB cap counts bytes rather than UTF-16 units, pauses the stream and answers 413;
  a request that is destroyed, aborted or closed early ends with a single `next(error)` instead of
  hanging; and a stream another parser already drained is skipped without waiting for an `end`
  event that cannot arrive.

### Changed

- **Breaking**: values that used to reach NETOPIA broken now throw locally. `expMonth`/`expYear`
  are validated after coercion, so `expMonth: 'MM'` no longer ships as `"expMonth":null` next to
  the card number and `expYear: '30'` no longer ships as `30` to be declined for an opaque
  reason; `secretCode` longer than 4 characters is rejected (spec `maxLength: 4`); a negative
  `amount` is rejected (spec `minimum: 0`, with 0 still legal for account verification).
- `setPaymentOptions` ignores `split`. The spec marks `payment.options.split` as
  "will be available in future versions" and `PaymentSplitDestination` as a "Future feature", so
  sending it would settle the whole amount into the primary POS with no error. The 2.2.0 README
  note that split payments were unavailable was correct and stays correct.
- `setPaymentData` sends `instrument.type: 'card'`. The spec marks `type` as "mandatory for all
  payment methods except token" and the library never sent it.
- **Breaking**: `setOrderData` rebuilds the order instead of merging into the previous one.
  Merging meant `shipping`, `data`, `clientID` and `products` survived into the next order on a
  reused instance: customer B's request carried customer A's shipping address, client id and
  basket - a basket whose total no longer matched the amount charged. Products now belong to the
  order they were set for, so `setProductsData` has to be called after `setOrderData` (the order
  the examples have always used); calling it first drops the basket instead of attaching it to
  the wrong order.
- `startPayment` builds its request without mutating `this.config` and `this.order`, and sends a
  snapshot of `payment` rather than a live reference, so a setter called after the call can no
  longer rewrite a request already in flight. A second call on the same instance sends the same
  request.
- `startPayment` reports a malformed `notifyUrl`/`redirectUrl`/`cancelUrl` as
  `Invalid Notify URL` and so on, instead of a bare `TypeError [ERR_INVALID_URL]` that names no
  field.
- `sendRequest` no longer assumes every error body is `{ message }`. A spec-shaped
  `{ error: { message } }`, an HTML gateway page and an empty body used to produce
  `new Error(undefined)`; they now yield the message, the status text, or the status code.
- **Breaking**: `billing.country` and `shipping.country` must coerce to an integer, the ISO
  3166-1 numeric code the schema declares. `country: 'RO'` used to ship as `"country":null`;
  it now throws `Invalid Billing country` / `Invalid Shipping country`. `shipping.country` is
  coerced the way `billing.country` always was, so a string `'642'` from a form goes out as
  `642`.
- **Breaking**: `shipping` and `order.data` must be objects, as the schema declares them. A string
  or an array in either key used to be forwarded verbatim; it now throws
  `Invalid Shipping details` / `Invalid Order data`. `clientID` rejects objects and arrays.
- **Breaking**: `account` must be a string of digits and `secretCode` 3 or 4 digits, both sent
  trimmed. `account: {}` and `secretCode: []` used to travel verbatim next to the PAN (`String([])`
  is empty, so the old length check passed), and a card number passed as a number silently lost
  digits to float precision.
- **Breaking**: values that coerce to a number only by accident are rejected. `Number([])` and
  `Number('')` are 0 and `Number(true)` is 1, so `amount: []` - what Express `qs` produces for
  `amount[]=` - used to ship as a zero-amount order, which the spec reads as an account
  verification: a real order fulfilled for free. The same guard covers `installments`, `bonus` and
  both country fields.
- **Breaking**: `billing.country`/`shipping.country` must be inside the ISO 3166-1 numeric range
  (4 to 894). Integer-ness alone let an empty form select through as `country: 0`.
- **Breaking**: `verifyAuth` requires `formData` to be an object. `Object.keys` of a string is
  its length, so the raw string `rawTextBodyParser` produces used to pass the emptiness check and
  be POSTed as a JSON string - failing after the customer had already completed 3-D Secure.
- **Breaking**: `notifyUrl`, `redirectUrl` and `cancelUrl` must be `http:` or `https:`.
- Requests time out after 30 seconds, configurable with the `timeout` constructor option. A silent
  gateway used to hang the merchant request with no upper bound.
- A whitespace-only `posSignature` is rejected again. Dropping the duplicate `requiredFields`
  entry had narrowed the check to a truthiness test, so a blank quoted `.env` value reached the
  gateway.
- `IP_ADDRESS` is stringified like every other device field: Express' `req.ips` is an array.
- **Breaking**: `billing.phone` accepts only a string or a finite number. An object, an array, a
  boolean, `NaN` or `Infinity` is treated as no phone and omitted from the request - 2.2.0 sent
  `"phone":{}` for an object, because `String({})` is not empty.
- `billing.countryName` no longer defaults to `Romania` for a country other than 642. With
  `country: 276` and no `countryName` the request used to claim Romania; it now sends an empty
  string, like the other address fields the caller left out.

### Security

- `.env.example` carries a `NETOPIA_API_KEY` placeholder instead of a key-shaped value, matching
  the `XXXX-` placeholder used for the signature right below it. The value was not a production
  key and the file is not part of the npm package, but an example file should not look like it
  holds a working credential.
- Notifications can be verified, and the README says how. API v2 does sign them, through the
  `Verification-token` header, even though its OpenAPI spec never mentions it - so the previous
  advice to treat the endpoint as unauthenticated understated what is available. Anything that
  reaches `confirmOrder` should have gone through `verifyNotification` first. The middleware
  behind it also no longer accumulates an unbounded body.

### Fixed

- The README no longer claims the library "validates Netopia mobilPay responses using the private
  key associated with your account". It does not, and API v2 has no such mechanism.
- The backend example called `startPayment(requestData)`, which takes no arguments and would have
  sent an empty order. It now reads the request, creates the order server-side and shows where
  `setBrowserData` belongs.
- The frontend example's guard was `!error?.code === '101'`, which parses as
  `(!error?.code) === '101'` and is always false, so the redirect check was dead code. It also
  imported a default export by name.
- The migration guide referenced `createNotifyRoute`, which does not exist in this package, and
  claimed `redirectUrl` had been removed from the `Config` type, where it is still required.
- `npm test` no longer needs network access or credentials: the start-payment suite mocks the
  API call and asserts the request the library builds. The sandbox round-trip lives in
  `tests/start-payment.live.test.js` and is skipped unless `NETOPIA_LIVE_TEST` is set.
- `NODE_ENV` is documented: it selects sandbox or production whenever `sandbox` is not passed, so
  a deployment where it is not exactly `production` transacts against the sandbox while looking
  healthy.

The card flow that NETOPIA hosts (no `setPaymentData`, `error.code 101` plus
`payment.paymentURL`) still sends a byte-identical request to 2.2.0, as long as
`setProductsData` is called after `setOrderData`. Payload changes only reach
callers that use `setPaymentData` (`instrument.type`), `collectBrowserInfo` (`SCREEN_PRINT`), a
non-Romanian `billing.country` without `countryName`, or the order fields that are now forwarded.

## [2.2.0] - 2026-08-24

### Added

- `cancelUrl` constructor option, defaulting to `process.env.NETOPIA_CANCEL_URL`. When set, it is
  normalized through `new URL()` and sent as `config.cancelUrl`; NETOPIA returns the customer there
  if they cancel the payment, which previously had nowhere to land. When unset, the key stays out of
  the request, exactly as before.

### Changed

- `billing.phone` is now optional, in both `setOrderData` and `startPayment`. NETOPIA does not
  require it: with `order.billing.phone` missing, the start request still answers `error.code 101`
  with a `payment.paymentURL`, and the NETOPIA page shows an empty phone field (placeholder
  `07xxxxxxxx`) and asks the customer for the number itself.
- An empty or whitespace-only `billing.phone` no longer throws - the key is omitted from the request
  instead, so neither `""` nor `null` is sent. Because the library used to require a phone,
  integrators without a phone field in their form passed placeholders such as `-`, which the NETOPIA
  page rejects with "Numărul de telefon nu este valid", blocking the payment on its first step.

NETOPIA's [OpenAPI spec](https://secure.sandbox.netopia-payments.com/spec) lists `billing.phone`
under `Address.required`, but the API accepts the key being absent: it answers 200 with
`error.code 101` and a `payment.paymentURL`, and the hosted page asks the customer for the number
(empty field, placeholder `07xxxxxxxx`). Verified on sandbox. A strict contract check against the
spec (`prism --errors`) will therefore flag a missing phone as invalid - that is a known spec/API
divergence, not a bug in this library.

This is the only behavior change: a request that carries a valid phone today is byte-identical, no
method signature or existing option name changed.
