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

      // ✅ Create Flutterwave + Paystack subaccounts (async, don't block registration)
      setTimeout(async () => {
        try {
          // ── STEP 1: Verify bank account via Flutterwave ──────────────────
          const paymentAdapter = createPaymentAdapter();
          console.log('🔄 Verifying bank account for', shopName);

          const verification = await paymentAdapter.verifyBankAccount(
            accountNumber,
            bankCode
          );

          if (!verification.success) {
            console.error('❌ Bank verification failed:', verification.message);
            // Still try Paystack resolve below
          } else {
            console.log('✅ Bank account verified:', verification.accountName);
          }

          // ── STEP 2: Create Flutterwave subaccount ────────────────────────
          try {
            console.log('🔄 Creating Flutterwave subaccount for', shopName);
            const fwResult = await paymentAdapter.createSubaccount({
              businessName: shopName,
              accountNumber: accountNumber,
              bankCode: bankCode,
              email: email,
              phone: phone,
              splitType: 'percentage',
              splitValue: 0.03,
            });

            vendor.flutterwaveSubaccount = {
              subaccountId:   fwResult.subaccountId,
              subaccountCode: fwResult.subaccountCode,
              splitPercentage: fwResult.splitPercentage || 97,
              isActive: true,
              createdAt: new Date(),
            };
            console.log('✅ Flutterwave subaccount created:', fwResult.subaccountCode);
          } catch (fwErr) {
            console.error('❌ Flutterwave subaccount failed:', fwErr.message);
          }

          // ── STEP 3: Create Paystack subaccount ───────────────────────────
          try {
            console.log('🔄 Creating Paystack subaccount for', shopName);
            const axios = (await import('axios')).default;
            const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

            // Resolve account name via Paystack
            let resolvedName = verification?.accountName || accountName;
            try {
              const resolveRes = await axios.get(
                `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
                { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
              );
              if (resolveRes.data.status) {
                resolvedName = resolveRes.data.data.account_name;
              }
            } catch (resolveErr) {
              console.warn('⚠️ Paystack account resolve failed, using fallback name');
            }

            const psRes = await axios.post(
              'https://api.paystack.co/subaccount',
              {
                business_name:         shopName,
                settlement_bank:       bankCode,
                account_number:        accountNumber,
                percentage_charge:     3,
                description:           `AfricArt vendor – ${shopName}`,
                primary_contact_email: email,
                primary_contact_name:  resolvedName,
                primary_contact_phone: phone || '',
              },
              {
                headers: {
                  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (psRes.data.status) {
              vendor.paystackSubaccount = {
                subaccountId:    String(psRes.data.data.id),
                subaccountCode:  psRes.data.data.subaccount_code,
                percentageCharge: psRes.data.data.percentage_charge || 3,
                isActive: true,
                createdAt: new Date(),
              };
              console.log('✅ Paystack subaccount created:', psRes.data.data.subaccount_code);
            } else {
              console.error('❌ Paystack subaccount failed:', psRes.data.message);
            }
          } catch (psErr) {
            console.error('❌ Paystack subaccount error:', psErr.response?.data?.message || psErr.message);
          }

          // ── STEP 4: Update vendor record ─────────────────────────────────
          if (verification?.accountName) {
            vendor.bankAccount.accountName = verification.accountName;
          }
          vendor.isBankVerified = true;
          vendor.bankVerificationDate = new Date();
          await vendor.save();

          console.log('✅ Vendor updated with payment accounts:', vendor._id);

        } catch (error) {
          console.error('❌ Failed to set up vendor payment accounts:', error.message);
          // Don't fail registration — vendor can retry from dashboard
        }
      }, 2000); // Run 2 seconds after registration

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