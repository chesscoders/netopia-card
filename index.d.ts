type NetopiaOptions = {
  signature?: string;
  publicKey?: string;
  privateKey?: string;
  sandbox?: boolean;
};

type ClientData = {
  billing: {
    firstName: string;
    lastName: string;
    country: string;
    county: string;
    city: string;
    zipCode: string;
    address: string;
    email: string;
    phone: string;
    bank: string;
    iban: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    country: string;
    county: string;
    city: string;
    zipCode: string;
    address: string;
    email: string;
    phone: string;
    bank: string;
    iban: string;
  };
};

type SplitPayment = {
  firstDestinationId: string;
  firstDestinationAmount: number;
  secondDestinationId: string;
  secondDestinationAmount: number;
};

type PaymentData = {
  orderId: string;
  amount: number;
  currency: string;
  details: string;
  confirmUrl: string;
  returnUrl: string;
};

type Request = {
  url: string;
  env_key: string;
  data: string;
};

declare class Netopia {
  constructor(options?: NetopiaOptions);

  setClientBillingData(data: ClientData['billing']): void;
  setClientShippingData(data: ClientData['shipping']): void;
  setSplitPayment(data: SplitPayment): void;
  setParams(params: Record<string, any>): void;
  setPaymentData(data: PaymentData): void;
  buildRequest(): Request;
  confirmPayment(env_key: string, data: string): Promise<any>;
  validatePayment(env_key: string, data: string): Promise<any>;
}

export = Netopia;
