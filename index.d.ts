// Netopia Class Definition
declare class Netopia {
    constructor(config?: {
        signature?: string;
        publicKey?: string;
        privateKey?: string;
        sandbox?: boolean;
    });

    setClientBillingData(data: {
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
    }): void;

    setClientShippingData(data: {
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
    }): void;

    setSplitPayment(data: {
        firstDestinationId: string;
        firstDestinationAmount: number;
        secondDestinationId: string;
        secondDestinationAmount: number;
    }): void;

    setParams(params: Record<string, any>): void;

    setPaymentData(data: {
        orderId: string;
        amount: number;
        currency: string;
        details: string;
        confirmUrl: string;
        returnUrl: string;
    }): void;

    buildRequest(): {
        url: string;
        env_key: string;
        data: string;
    };

    confirmPayment(env_key: string, data: string): Promise<Record<string, any>>;

    validatePayment(env_key: string, data: string): Promise<{
        order: Record<string, any>;
        action: string | null;
        errorMessage: string | null;
        error: Record<string, any> | null;
        res: {
            set: {
                key: 'Content-Type';
                value: 'application/xml';
            };
            send: string;
        };
    }>;
}
export = Netopia;
// export default Netopia;
// export { Netopia }
