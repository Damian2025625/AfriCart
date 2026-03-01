import { getActiveProvider, getProviderName } from "./config";
import { FlutterwaveAdapter } from "./providers/flutterwave";
import { PaystackAdapter } from "./providers/paystack";

export class PaymentAdapter {
  constructor() {
    const providerName = getProviderName();
    const config = getActiveProvider();

    // Initialize the correct adapter
    switch (providerName) {
      case "flutterwave":
        this.adapter = new FlutterwaveAdapter(config);
        break;
      case "paystack":
        this.adapter = new PaystackAdapter(config);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${providerName}`);
    }

    this.providerName = providerName;
    this.config = config;
  }

  async initializePayment(paymentData) {
    return this.adapter.initializePayment(paymentData);
  }

  async verifyPayment(reference) {
    return this.adapter.verifyPayment(reference);
  }

  async createSubaccount(vendorData) {
    return this.adapter.createSubaccount(vendorData);
  }

  async processSplitPayment(splitData) {
    return this.adapter.processSplitPayment(splitData);
  }

  async verifyBankAccount(accountNumber, bankCode) {
    if (typeof this.adapter.verifyBankAccount !== "function") {
      throw new Error(
        `${this.providerName} does not support bank verification`,
      );
    }
    return await this.adapter.verifyBankAccount(accountNumber, bankCode);
  }

  async getTransaction(transactionId) {
    return this.adapter.getTransaction(transactionId);
  }

  async refundTransaction(transactionId, amount) {
    return this.adapter.refundTransaction(transactionId, amount);
  }

  getSupportedMethods() {
    return this.config.supportedMethods;
  }

  getProviderName() {
    return this.providerName;
  }

  getDisplayName() {
    return this.config.name;
  }
}

export function createPaymentAdapter() {
  return new PaymentAdapter();
}

export default PaymentAdapter;
