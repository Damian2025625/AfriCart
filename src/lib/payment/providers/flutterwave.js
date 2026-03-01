import axios from 'axios';

export class FlutterwaveAdapter {
  constructor(config) {
    this.config = config;
    this.baseURL = config.baseURL;
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
  }

  async initializePayment(paymentData) {
    try {
      const {
        amount,
        email,
        name,
        phone,
        orderId,
        subaccounts = [],
        metadata = {},
      } = paymentData;
      
      const response = await axios.post(
        `${this.baseURL}/payments`,
        {
          tx_ref: `AFRI-${orderId}-${Date.now()}`,
          amount: amount,
          currency: this.config.currency,
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/payment/verify`,
          payment_options: 'card,banktransfer,ussd,mobilemoney',
          customer: {
            email: email,
            phonenumber: phone,
            name: name,
          },
          customizations: {
            title: 'AfriCart Payment',
            description: `Payment for order ${orderId}`,
            logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
          },
          meta: {
            orderId: orderId,
            ...metadata,
          },
          subaccounts: subaccounts.map(sub => {
            const subaccount = {
              id: sub.subaccountCode || sub.subaccountId,
            };

            // Only include fee overrides if explicitly provided
            if (sub.chargeType) {
              subaccount.transaction_charge_type = sub.chargeType;
            }
            if (sub.charge !== undefined) {
              subaccount.transaction_charge = sub.charge;
            }

            // Only include split ratio if explicitly provided and non-zero
            // Otherwise, let Flutterwave use the default dashboard configuration
            if (sub.splitRatio && sub.splitRatio > 0) {
              subaccount.transaction_split_ratio = sub.splitRatio;
            }

            return subaccount;
          }),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status === 'success') {
        return {
          success: true,
          reference: response.data.data.tx_ref,
          authorizationUrl: response.data.data.link,
          accessCode: response.data.data.tx_ref,
        };
      }
      
      throw new Error(response.data.message || 'Payment initialization failed');
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async verifyPayment(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transactions/${transactionId}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );
      
      if (response.data.status === 'success') {
        const data = response.data.data;
        
        return {
          success: true,
          verified: data.status === 'successful',
          amount: data.amount,
          currency: data.currency,
          reference: data.tx_ref,
          transactionId: data.id,
          paidAt: data.created_at,
          customer: {
            email: data.customer.email,
            name: data.customer.name,
            phone: data.customer.phone_number,
          },
          metadata: data.meta,
        };
      }
      
      return {
        success: false,
        verified: false,
        message: response.data.message || 'Verification failed',
      };
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // ✅ UPDATED: Create subaccount with proper Flutterwave format
  async createSubaccount(vendorData) {
    try {
      const {
        businessName,
        accountNumber,
        bankCode,
        email,
        phone,
        splitType = 'percentage',
        splitValue = 0.03,
      } = vendorData;

      console.log('🔄 Creating Flutterwave subaccount:', {
        businessName,
        accountNumber,
        bankCode,
      });
      
      const response = await axios.post(
        `${this.baseURL}/subaccounts`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          business_name: businessName,
          business_email: email,
          business_contact: phone || '',
          business_mobile: phone || '',
          country: 'NG',
          split_type: splitType,
          split_value: splitValue, // This is already a decimal (0.97)
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Flutterwave subaccount response:', response.data);
      
      if (response.data.status === 'success') {
        return {
          success: true,
          subaccountId: response.data.data.id,
          subaccountCode: response.data.data.subaccount_id,
          bankCode: response.data.data.account_bank,
          accountNumber: response.data.data.account_number,
          splitPercentage: splitValue * 100, // Convert back to percentage for storage
        };
      }
      
      throw new Error(response.data.message || 'Subaccount creation failed');
    } catch (error) {
      console.error('❌ Flutterwave subaccount creation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // ✅ NEW: Verify bank account
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      console.log('🔍 Verifying bank account:', { accountNumber, bankCode });

      const response = await axios.post(
        `${this.baseURL}/accounts/resolve`,
        {
          account_number: accountNumber,
          account_bank: bankCode,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Bank verification response:', response.data);

      if (response.data.status === 'success') {
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
      console.error('❌ Bank verification error:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify account',
      };
    }
  }

  // ✅ NEW: Get Nigerian banks
  async getNigerianBanks() {
    try {
      const response = await axios.get(
        `${this.baseURL}/banks/NG`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          banks: response.data.data.map(bank => ({
            name: bank.name,
            code: bank.code,
          })),
        };
      }

      return {
        success: false,
        message: 'Failed to fetch banks',
      };
    } catch (error) {
      console.error('❌ Get banks error:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to fetch banks',
      };
    }
  }

  // ✅ NEW: Update subaccount
  async updateSubaccount(subaccountId, updates) {
    try {
      console.log('🔄 Updating Flutterwave subaccount:', subaccountId);

      const response = await axios.put(
        `${this.baseURL}/subaccounts/${subaccountId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error(response.data.message || 'Subaccount update failed');
    } catch (error) {
      console.error('❌ Subaccount update error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update subaccount');
    }
  }

  // ✅ NEW: Delete subaccount
  async deleteSubaccount(subaccountId) {
    try {
      console.log('🗑️ Deleting Flutterwave subaccount:', subaccountId);

      const response = await axios.delete(
        `${this.baseURL}/subaccounts/${subaccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          message: 'Subaccount deleted successfully',
        };
      }

      throw new Error(response.data.message || 'Subaccount deletion failed');
    } catch (error) {
      console.error('❌ Subaccount deletion error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete subaccount');
    }
  }

  async processSplitPayment(splitData) {
    // Flutterwave handles split during initialization
    return this.initializePayment(splitData);
  }

  async getTransaction(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transactions/${transactionId}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        }
      );
      
      if (response.data.status === 'success') {
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
      console.error('Flutterwave get transaction error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async refundTransaction(transactionId, amount) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transactions/${transactionId}/refund`,
        {
          amount: amount,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status === 'success') {
        return {
          success: true,
          refundId: response.data.data.id,
          amount: response.data.data.amount,
          status: response.data.data.status,
        };
      }
      
      throw new Error(response.data.message || 'Refund failed');
    } catch (error) {
      console.error('Flutterwave refund error:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}