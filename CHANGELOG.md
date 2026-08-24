# Changelog

All notable changes to this project are documented in this file. Releases before 2.2.0 are only
recorded in the [commit history](https://github.com/chesscoders/netopia-card/commits/master).

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
- An empty or whitespace-only `billing.phone` no longer throws — the key is omitted from the request
  instead, so neither `""` nor `null` is sent. Because the library used to require a phone,
  integrators without a phone field in their form passed placeholders such as `-`, which the NETOPIA
  page rejects with "Numărul de telefon nu este valid", blocking the payment on its first step.

NETOPIA's [OpenAPI spec](https://secure.sandbox.netopia-payments.com/spec) lists `billing.phone`
under `Address.required`, but the API accepts the key being absent: it answers 200 with
`error.code 101` and a `payment.paymentURL`, and the hosted page asks the customer for the number
(empty field, placeholder `07xxxxxxxx`). Verified on sandbox. A strict contract check against the
spec (`prism --errors`) will therefore flag a missing phone as invalid — that is a known spec/API
divergence, not a bug in this library.

This is the only behavior change: a request that carries a valid phone today is byte-identical, no
method signature or existing option name changed.
