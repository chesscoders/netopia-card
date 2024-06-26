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

/**
 * Represents a shipping address. It is the same as an address.
 */
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
 * A callback type for asynchronously processing payment notifications.
 */
type NotificationCallback = (payload: NotifyRequest) => Promise<void>;

/**
 * Defines the type for an Express request object.
 */
interface Request {
  body: any;
  query: { [key: string]: string | undefined };
  params: { [key: string]: string };
  headers: { [key: string]: string | undefined };
}

/**
 * Defines the type for an Express response object.
 */
interface Response {
  send: (body?: any) => Response;
  json: (body: any) => Response;
  status: (statusCode: number) => Response;
  header: (name: string, value?: string) => Response;
}

/**
 * Defines the type for the next function in Express middleware.
 */
type NextFunction = (err?: any) => void;

/**
 * Defines the type for middleware functions in Express. Middleware functions can perform the following tasks:
 * - Execute any code.
 * - Make changes to the request and the response objects.
 * - End the request-response cycle.
 * - Call the next middleware in the stack.
 * @param req The HTTP request object.
 * @param res The HTTP response object.
 * @param next A callback to signal Express to move to the next middleware function in the stack.
 */
type Middleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Defines the type for request handler functions in Express. Request handlers are similar to middleware but are typically
 * used to terminate the request-response cycle by sending a response back to the client.
 * @param req The HTTP request object.
 * @param res The HTTP response object.
 */
type RequestHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Interface representing the information collected from the browser and window.
 */
interface BrowserInfo {
  BROWSER_USER_AGENT: string;
  BROWSER_TZ: string;
  BROWSER_COLOR_DEPTH: number;
  BROWSER_JAVA_ENABLED: boolean;
  BROWSER_LANGUAGE: string;
  BROWSER_TZ_OFFSET: number;
  BROWSER_SCREEN_WIDTH: number;
  BROWSER_SCREEN_HEIGHT: number;
  BROWSER_PLUGINS: string;
  MOBILE: boolean;
  SCREEN_POINT: string;
  OS: string;
  OS_VERSION: string;
}

/**
 * Represents the payment data required to process a payment.
 */
interface PaymentData {
  account: string;
  expMonth: number;
  expYear: number;
  secretCode: string;
}

/**
 * Represents the browser data collected from the user to aid in fraud prevention.
 */
interface BrowserData {
  BROWSER_USER_AGENT?: string;
  BROWSER_TZ?: string;
  BROWSER_COLOR_DEPTH?: string;
  BROWSER_JAVA_ENABLED?: string;
  BROWSER_LANGUAGE?: string;
  BROWSER_TZ_OFFSET?: string;
  BROWSER_SCREEN_WIDTH?: string;
  BROWSER_SCREEN_HEIGHT?: string;
  BROWSER_PLUGINS?: string;
  MOBILE?: string;
  SCREEN_POINT?: string;
  OS?: string;
  OS_VERSION?: string;
}

/**
 * Represents the order data needed to create a new order.
 */
interface OrderData {
  orderID: string;
  amount: number;
  currency?: string;
  dateTime?: string;
  description?: string;
  billing: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    country?: number;
    countryName?: string;
    state?: string;
    postalCode?: string;
    details?: string;
  };
}

/**
 * Represents the data for products included in an order.
 */
interface ProductData {
  name: string;
  code: string;
  category: string;
  price: number;
  vat: number;
}

/**
 * Collects and returns various browser and system information from the provided navigator and window objects.
 * @param navigator The navigator object from the browser context.
 * @param window The window object representing the browser's window.
 * @returns BrowserInfo An object containing detailed browser and device information.
 */
export function collectBrowserInfo(navigator: Navigator, window: Window): BrowserInfo;

/**
 * Decrypts data that was encrypted with an RSA public key using AES-CBC encryption.
 * The function uses the private key to first decrypt the AES key and IV, and then uses them
 * to decrypt the actual data.
 * @param privateKeyPem The PEM-encoded RSA private key.
 * @param envKey The base64-encoded encrypted AES key and IV.
 * @param encryptedData The base64-encoded data encrypted with the AES key.
 * @returns The decrypted string.
 */
export function decrypt(privateKeyPem: string, envKey: string, encryptedData: string): string;

/**
 * Decrypts the request body of an incoming request.
 * @param req The incoming request object.
 * @param res The outgoing response object.
 * @param next The next middleware function in the stack.
 */
export function decryptRequestBody(req: Request, res: Response, next: NextFunction): void;

/**
 * Encrypts data using an RSA public key for the AES key and IV, and AES-CBC for the actual data encryption.
 * The function generates a random AES key and IV, encrypts the data, and then encrypts the AES key and IV using the RSA public key.
 * @param certificatePem The PEM-encoded certificate containing the RSA public key.
 * @param data The plaintext data to encrypt.
 * @returns An object containing base64-encoded strings of the encrypted key (envKey) and the encrypted data (envData).
 */
export function encrypt(certificatePem: string, data: string): { envKey: string; envData: string };

/**
 * Asynchronous function that generates a self-signed certificate and its corresponding private key.
 * @param options Options for certificate generation.
 * @returns A promise that resolves with the generated certificate and private key.
 */
export function generateKeys(options: {
  serialNumber: string;
  attrs: { name: string; value: string }[];
}): Promise<{ privateKey: string; publicKey: string }>;

/**
 * Determines if a given error code represents a payment error.
 * @param errorCode The error code to check.
 * @returns true if the error code represents a payment error; otherwise, false.
 */
export function isPaymentError(errorCode: string): boolean;

/**
 * Represents the Netopia payment integration class.
 */
export declare class Netopia {
  /**
   * Constructs a new instance of the Netopia class.
   * @param config Configuration options for the Netopia instance.
   */
  constructor(config: {
    apiBaseUrl?: string;
    apiKey?: string;
    posSignature?: string;
    sandbox?: boolean;
  });

  /**
   * Sets the payment data required for initiating a payment.
   * @param paymentData The payment data including account details and security information.
   */
  setPaymentData(paymentData: PaymentData): void;

  /**
   * Sets browser-related data collected from the user, enhancing security and fraud prevention.
   * @param reqBody The body of the HTTP request containing browser information.
   * @param reqIp The IP address of the user making the request.
   */
  setBrowserData(reqBody: BrowserData, reqIp: string): void;

  /**
   * Sets the order data including details about the transaction and billing information.
   * @param orderData The data necessary to create and describe an order.
   */
  setOrderData(orderData: OrderData): void;

  /**
   * Sets the product data for the items included in the order.
   * @param productsData Array of product data, detailing each product involved in the transaction.
   */
  setProductsData(productsData: ProductData[]): void;

  /**
   * Initiates a payment using the internal configuration, order, and payment information.
   * This method prepares the request data, sets the notification URL and POS signature,
   * and sends the payment request to the configured API endpoint.
   * @returns A promise that resolves with the details of the initiated payment.
   */
  startPayment(): Promise<any>;

  /**
   * Creates an Express route array for handling payment notifications.
   * This method configures a route to receive payment notifications, parse the request body,
   * validate it, and then invoke a callback function with the parsed data. If the request is invalid,
   * it responds with an error code. Otherwise, it calls the provided callback with the notification data
   * and responds to the requestor to acknowledge the notification.
   * @param callback The function to call with the parsed notification data.
   * It receives a single parameter of type `NotifyRequest` which contains the notification details.
   * @returns An array containing the route path, middleware for parsing the raw text body,
   * and the route handler function configured for the `/notify` endpoint.
   */
  createNotifyRoute(callback: NotificationCallback): [string, Middleware, RequestHandler];
}
