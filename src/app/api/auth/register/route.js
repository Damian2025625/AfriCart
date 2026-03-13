import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import Customer from '@/lib/mongodb/models/Customer';
import Vendor from '@/lib/mongodb/models/Vendor';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail, sendVendorWelcomeEmail } from '@/lib/email/emailService';
import { createPaymentAdapter } from '@/lib/payment/adapter';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      country,
      state,
      city,
      role,
      shopName,
      categories,
      shopDescription,
      businessAddress, // ✅ NEW: Business Address
      // ✅ NEW: Bank account fields
      accountName,
      accountNumber,
      bankName,
      bankCode,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phone || !country || !state || !city) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: role || 'CUSTOMER',
    });

    console.log('✅ User created:', user._id);

    // Create role-specific profile
    if (role === 'VENDOR') {
      // Validate vendor-specific fields
      if (!shopName || !categories || !shopDescription || !businessAddress) {
        await User.findByIdAndDelete(user._id);
        return NextResponse.json(
          { success: false, message: 'Missing vendor information including business address' },
          { status: 400 }
        );
      }

      if (!Array.isArray(categories) || categories.length === 0) {
        await User.findByIdAndDelete(user._id);
        return NextResponse.json(
          { success: false, message: 'Please select at least one category' },
          { status: 400 }
        );
      }

      // ✅ NEW: Validate bank account fields
      if (!accountName || !accountNumber || !bankName || !bankCode) {
        await User.findByIdAndDelete(user._id);
        return NextResponse.json(
          { success: false, message: 'Bank account details are required' },
          { status: 400 }
        );
      }

      if (!/^\d{10}$/.test(accountNumber)) {
        await User.findByIdAndDelete(user._id);
        return NextResponse.json(
          { success: false, message: 'Account number must be 10 digits' },
          { status: 400 }
        );
      }

      // ✅ Create vendor profile WITH bank account
      const vendor = await Vendor.create({
        userId: user._id,
        businessName: shopName,
        businessAddress: businessAddress,
        businessPhone: phone,
        description: shopDescription,
        categories,
        country,
        state,
        city,
        // ✅ Save bank account details
        bankAccount: {
          accountName: accountName,
          accountNumber: accountNumber,
          bankName: bankName,
          bankCode: bankCode,
        },
        isBankVerified: false, // Will be verified when creating subaccount
      });

      console.log('✅ Vendor profile created with bank account');

      // ✅ Create Payment Subaccounts (async, don't block registration)
      setTimeout(async () => {
        try {
          await connectDB();
          
          // Re-fetch vendor to ensure we have the latest document
          const currentVendor = await Vendor.findById(vendor._id);
          if (!currentVendor) return;

          const email = body.email;
          const phone = body.phone;
          const shopName = body.shopName;
          const accountNumber = body.accountNumber;
          const bankCode = body.bankCode;

          // ── STEP 1: Bank Verification ──────────────────────────────────
          const paymentAdapter = createPaymentAdapter();
          const provider = paymentAdapter.getProviderName();
          
          console.log(`🔄 Verifying bank account via ${paymentAdapter.getDisplayName()}...`);
          const verification = await paymentAdapter.verifyBankAccount(accountNumber, bankCode);

          if (verification.success) {
            console.log('✅ Bank account verified:', verification.accountName);
            currentVendor.bankAccount.accountName = verification.accountName;
            currentVendor.isBankVerified = true;
            currentVendor.bankVerificationDate = new Date();
          } else {
            console.warn('⚠️ Bank verification failed:', verification.message);
          }

          // ── STEP 2: Create Subaccount (Active Provider Only) ───────────
          console.log(`🔄 Creating ${paymentAdapter.getDisplayName()} subaccount for ${shopName}...`);
          
          try {
            const result = await paymentAdapter.createSubaccount({
              businessName: shopName,
              accountNumber: accountNumber,
              bankCode: bankCode,
              email: email,
              phone: phone,
              // Percentage charge for the platform (3%)
              percentageCharge: 3, 
              // Some providers might need splitValue as decimal
              splitValue: 0.03, 
            });

            if (provider === 'paystack') {
              await Vendor.updateOne(
                { _id: currentVendor._id },
                {
                  $set: {
                    paystackSubaccount: {
                      subaccountId:     String(result.subaccountId),
                      subaccountCode:   result.subaccountCode,
                      percentageCharge: 3,
                      isActive:         true,
                      createdAt:        new Date(),
                    }
                  }
                }
              );
            } else if (provider === 'flutterwave') {
              await Vendor.updateOne(
                { _id: currentVendor._id },
                {
                  $set: {
                    flutterwaveSubaccount: {
                      subaccountId:    result.subaccountId,
                      subaccountCode:  result.subaccountCode,
                      splitPercentage: 97, // Vendor gets 97%
                      isActive:        true,
                      createdAt:       new Date(),
                    }
                  }
                }
              );
            }
            
            console.log(`✅ ${paymentAdapter.getDisplayName()} subaccount created and saved in DB:`, result.subaccountCode);
          } catch (subErr) {
            console.error(`❌ ${paymentAdapter.getDisplayName()} subaccount failed:`, subErr.message);
          }

          console.log('✅ Vendor profile background setup complete');

        } catch (error) {
          console.error('❌ Critical error in vendor payment setup background task:', error.message);
        }
      }, 3000); // Wait 3 seconds to ensure DB is consistent

      // Send vendor welcome email
      sendVendorWelcomeEmail(email, firstName, shopName)
        .then(() => console.log('✅ Vendor welcome email sent'))
        .catch((error) => console.error('❌ Failed to send vendor welcome email:', error));

    } else {
      // Create customer profile
      await Customer.create({
        userId: user._id,
        country,
        state,
        city,
      });

      console.log('✅ Customer profile created');

      // Send customer welcome email
      sendWelcomeEmail(email, firstName)
        .then(() => console.log('✅ Welcome email sent'))
        .catch((error) => console.error('❌ Failed to send welcome email:', error));
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful! Your payment account is being set up.',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}