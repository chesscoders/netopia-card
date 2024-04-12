import { Router } from 'express';

type StartRequest = {
  config: Config;
  payment: PaymentRequest;
  order: Order;
};

type Config = {
  emailTemplate?: string;
  emailSubject?: string;
  cancelUrl?: string;
  redirectUrl: string;
  language: string;
};

type PaymentRequest = {
  options: PaymentOptions;
  instrument: PaymentInstrument;
  data: Attributes;
};

type PaymentOptions = {
  installments: number;
  bonus: number;
  split?: PaymentSplitDestination[];
};

type PaymentInstrument = {
  type?: string;
  account?: string;
  expMonth?: number;
  expYear?: number;
  secretCode?: string;
  token?: string;
  clientID?: string;
};

type PaymentSplitDestination = {
  posID: number;
  amount: number;
};

type Order = {
  ntpID?: string;
  posSignature: string;
  dateTime: string;
  description: string;
  orderID: string;
  amount: number;
  currency: string;
  billing: Address;
  shipping?: ShippingAddress;
  products?: Product[];
  installments?: Installments;
  data?: Attributes;
};

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

type ShippingAddress = Address;

type Product = {
  name: string;
  code: string;
  category: string;
  price: number;
  vat: number;
};

type Installments = {
  selected: number;
  available: number[];
};

// Attributes type is defined as an object with dynamic keys, all of which are strings.
type Attributes = {
  [key: string]: any;
};

type NotifyRequest = {
  payment: PaymentNotify;
  order: OrderNotify;
};

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

type OrderNotify = {
  orderID: string;
  data: Attributes;
};

type PaymentBinding = {
  token?: string;
  expireMonth?: number;
  expireYear?: number;
};

type NotificationCallback = (payload: NotifyRequest) => void;

declare class Netopia {
  constructor(config: {
    apiKey?: string;
    apiUrl?: string;
    posSignature?: string;
    sandbox?: boolean;
  });

  startPayment(requestData: StartRequest): Promise<any>;
  createNotifyRoute(callback: NotificationCallback): Router;
}

export = Netopia;
