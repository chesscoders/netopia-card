import { Router } from 'express';

/**
 * Represents a request to start a payment.
 */
type StartRequest = {
  config: Config;
  payment: PaymentRequest;
  order: Order;
};

/**
 * Configuration options for a payment request.
 */
type Config = {
  emailTemplate?: string; // Optional email template for the payment request.
  emailSubject?: string; // Optional subject line for the payment request email.
  cancelUrl?: string; // Optional URL to which the user should be redirected if the payment is cancelled.
  redirectUrl: string; // URL to which the user should be redirected after the payment is processed.
  language: string; // Language code for the payment interface.
};

/**
 * Detailed payment information.
 */
type PaymentRequest = {
  options: PaymentOptions; // Payment options such as installments and bonus points.
  instrument: PaymentInstrument; // Payment instrument details.
  data: Attributes; // Additional attributes/data for the payment request.
};

/**
 * Options for the payment.
 */
type PaymentOptions = {
  installments: number; // Number of installments for the payment.
  bonus: number; // Bonus points for the payment.
  split?: PaymentSplitDestination[]; // Optional split payment destinations.
};

/**
 * Payment instrument details.
 */
type PaymentInstrument = {
  type?: string; // Type of payment instrument (e.g., card).
  account?: string; // Account number for the payment instrument.
  expMonth?: number; // Expiry month for the payment instrument.
  expYear?: number; // Expiry year for the payment instrument.
  secretCode?: string; // Secret code for the payment instrument.
  token?: string; // Token for the payment instrument.
  clientID?: string; // Client ID associated with the payment instrument.
};

/**
 * Represents a destination for split payments.
 */
type PaymentSplitDestination = {
  posID: number; // POS ID of the split payment destination.
  amount: number; // Amount to be split to the destination.
};

/**
 * Order details for the payment.
 */
type Order = {
  ntpID?: string; // Optional Netopia ID for the order.
  posSignature: string; // POS signature for the order.
  dateTime: string; // Date and time of the order.
  description: string; // Description of the order.
  orderID: string; // Order ID.
  amount: number; // Amount for the order.
  currency: string; // Currency for the order.
  billing: Address; // Billing address for the order.
  shipping?: ShippingAddress; // Optional shipping address for the order.
  products?: Product[]; // Optional list of products included in the order.
  installments?: Installments; // Optional installment options for the order.
  data?: Attributes; // Optional additional attributes/data for the order.
};

/**
 * Represents an address.
 */
type Address = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  country: number;
  countryName: string;
  state: string;
  postalCode: string;
  details: string;
};

// ShippingAddress has the same structure as Address.
type ShippingAddress = Address;

/**
 * Represents a product included in the order.
 */
type Product = {
  name: string; // Name of the product.
  code: string; // Code of the product.
  category: string; // Category of the product.
  price: number; // Price of the product.
  vat: number; // VAT for the product.
};

/**
 * Represents installment options for the payment.
 */
type Installments = {
  selected: number; // Selected number of installments.
  available: number[]; // Array of available installment options.
};

/**
 * Defines a flexible object with dynamic keys, all of which map to any type.
 */
type Attributes = {
  [key: string]: any;
};

/**
 * Represents a notification request received from Netopia.
 */
type NotifyRequest = {
  payment: PaymentNotify; // Payment notification details.
  order: OrderNotify; // Order details from the notification.
};

/**
 * Payment notification details.
 */
type PaymentNotify = {
  method: string;
  ntpID: string;
  status: number;
  amount: number;
  currency: string;
  token?: string;
  binding?: PaymentBinding;
  code?: string;
  message?: string;
  data: Attributes;
};

/**
 * Order details from the notification.
 */
type OrderNotify = {
  orderID: string;
  data: Attributes;
};

/**
 * Represents a payment binding for recurring payments.
 */
type PaymentBinding = {
  token?: string;
  expireMonth?: number;
  expireYear?: number;
};

/**
 * A callback type for processing payment notifications.
 */
type NotificationCallback = (payload: NotifyRequest) => void;

/**
 * Represents the Netopia payment integration class.
 */
declare class Netopia {
  /**
   * Constructs a new instance of the Netopia class.
   * @param config Configuration options for the Netopia instance.
   */
  constructor(config: {
    apiKey?: string;
    apiUrl?: string;
    posSignature?: string;
    sandbox?: boolean;
  });

  /**
   * Initiates a payment with the given request data.
   * @param requestData The data needed to initiate the payment.
   * @returns A promise that resolves with the details of the initiated payment.
   */
  startPayment(requestData: StartRequest): Promise<any>;

  /**
   * Creates an Express route for handling payment notifications.
   * @param callback The function to call with the payment notification data.
   * @returns An Express Router configured for the notification route.
   */
  createNotifyRoute(callback: NotificationCallback): Router;
}

export = Netopia;
