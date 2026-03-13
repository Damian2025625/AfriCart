// lib/payment/providers/paystack.js
// Paystack Payment Provider Implementation

import axios from 'axios';

export class PaystackAdapter {
  constructor(config) {
    this.config = config;
    this.baseURL = config.baseURL;
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
  }
  
  /**
   * Initialize payment
   */
  async initializePayment(paymentData) {
    try {
      const {
        amount,
        email,
        name,
        phone,
        orderId,
        subaccount,
        metadata = {},
      } = paymentData;
      
      const payload = {
        email: email,
        amount: amount * 100, // Paystack uses kobo
        currency: this.config.currency,
        reference: `AFRI-${orderId}-${Date.now()}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
        metadata: {
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: orderId,
            },
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: name,
            },
          ],
          ...metadata,
        },
      };
      
      // Add subaccount if provided
      if (subaccount) {
        payload.subaccount = subaccount.subaccountCode;
        payload.transaction_charge = subaccount.charge || 0;
        payload.bearer = subaccount.bearer || 'account'; // who pays Paystack fee
      }
      
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status) {
        return {
          success: true,
          reference: response.data.data.reference,
          authorizationUrl: response.data.data.authorization_url,
          accessCode: response.data.data.access_code,
        };
      }
      
      throw new Error(response.data.message || 'Payment initialization failed');
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Verify bank account
   */
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      const response = await axios.get(
        `${this.baseURL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );
      
      if (response.data.status) {
        return {
          success: true,
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
      }
      
      return {
        success: false,
        message: response.data.message || 'Account verification failed',
      };
    } catch (error) {
      console.error('Paystack account verification error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify account',
      };
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );
      
      if (response.data.status) {
        const data = response.data.data;
        
        return {
          success: true,
          verified: data.status === 'success',
          amount: data.amount / 100, // Convert from kobo
          currency: data.currency,
          reference: data.reference,
          transactionId: data.id,
          paidAt: data.paid_at,
          customer: {
            email: data.customer.email,
            name: `${data.customer.first_name} ${data.customer.last_name}`,
            phone: data.customer.phone,
          },
          metadata: data.metadata,
        };
      }
      
      return {
        success: false,
        verified: false,
        message: response.data.message || 'Verification failed',
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Create subaccount for vendor
   */
  async createSubaccount(vendorData) {
    try {
      const {
        businessName,
        accountNumber,
        bankCode,
        email,
        percentageCharge = 3, // Platform takes 3%
      } = vendorData;
      
      const response = await axios.post(
        `${this.baseURL}/subaccount`,
        {
          business_name: businessName,
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: percentageCharge,
          description: `Vendor account for ${businessName}`,
          primary_contact_email: email,
          primary_contact_name: vendorData.contactName || businessName,
          primary_contact_phone: vendorData.phone || '',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status) {
        return {
          success: true,
          subaccountId: response.data.data.id,
          subaccountCode: response.data.data.subaccount_code,
          bankCode: response.data.data.settlement_bank,
          accountNumber: response.data.data.account_number,
        };
      }
      
      throw new Error(response.data.message || 'Subaccount creation failed');
    } catch (error) {
      console.error('Paystack subaccount creation error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Process split payment
   */
  async processSplitPayment(splitData) {
    // Paystack handles split via subaccount during initialization
    return this.initializePayment(splitData);
  }
  
  /**
   * Get transaction details
   */
  async getTransaction(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );
      
      if (response.data.status) {
        return {
          success: true,
          transaction: response.data.data,
        };
      }
      
      return {
        success: false,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Paystack get transaction error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
  
  /**
   * Refund transaction
   */
  async refundTransaction(transactionId, amount) {
    try {
      const response = await axios.post(
        `${this.baseURL}/refund`,
        {
          transaction: transactionId,
          amount: amount * 100, // Convert to kobo
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status) {
        return {
          success: true,
          refundId: response.data.data.id,
          amount: response.data.data.amount / 100,
          status: response.data.data.status,
        };
      }
      
      throw new Error(response.data.message || 'Refund failed');
    } catch (error) {
      console.error('Paystack refund error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}