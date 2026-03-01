import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb/config';
import Vendor from '@/lib/mongodb/models/Vendor';
import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Verify JWT token
function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ✅ CREATE SUBACCOUNT
export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { accountNumber, bankCode, businessName, email, phone, accountName } = await request.json();

    if (!accountNumber || !bankCode || !businessName || !email) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    // Check if Paystack subaccount already exists
    if (vendor.paystackSubaccount?.subaccountCode) {
      return NextResponse.json(
        { success: false, message: 'Paystack subaccount already exists', subaccountCode: vendor.paystackSubaccount.subaccountCode },
        { status: 400 }
      );
    }

    // ── Step 1: Resolve / verify bank account ───────────────────────────────
    console.log('🔍 Resolving bank account with Paystack...');
    let resolvedName = accountName || businessName;
    try {
      const resolveRes = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      if (resolveRes.data.status) {
        resolvedName = resolveRes.data.data.account_name;
        console.log('✅ Bank account resolved:', resolvedName);
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid bank account. Please check account number and bank.', error: resolveRes.data.message },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { success: false, message: 'Could not verify bank account. Check the account number and bank code.', error: err.response?.data?.message || err.message },
        { status: 400 }
      );
    }


    // ── Step 2: Create Paystack subaccount ──────────────────────────────────
    console.log('🔄 Creating Paystack subaccount...');
    const createRes = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name:         businessName,
        settlement_bank:       bankCode,
        account_number:        accountNumber,
        percentage_charge:     3, // Platform takes 3%, vendor gets 97%
        description:           `AfricArt vendor – ${businessName}`,
        primary_contact_email: email,
        primary_contact_name:  resolvedName,
        primary_contact_phone: phone || '',
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    );

    if (!createRes.data.status) {
      throw new Error(createRes.data.message || 'Paystack subaccount creation failed');
    }

    const subData = createRes.data.data;
    console.log('✅ Paystack subaccount created:', subData.subaccount_code);

    // ── Step 3: Save to vendor record ───────────────────────────────────────
    vendor.paystackSubaccount = {
      subaccountId:    String(subData.id),
      subaccountCode:  subData.subaccount_code,
      percentageCharge: subData.percentage_charge || 3,
      isActive: true,
      createdAt: new Date(),
    };

    vendor.bankAccount = {
      accountName:   resolvedName,
      accountNumber: accountNumber,
      bankName:      subData.settlement_bank || '',
      bankCode:      bankCode,
    };
    vendor.isBankVerified = true;
    vendor.bankVerificationDate = new Date();
    await vendor.save();

    return NextResponse.json({
      success: true,
      message: 'Paystack subaccount created successfully',
      data: {
        subaccountId:   subData.id,
        subaccountCode: subData.subaccount_code,
        accountName:    resolvedName,
        percentageCharge: subData.percentage_charge || 3,
      },
    });

  } catch (error) {
    console.error('❌ Subaccount creation error:', error);
    return NextResponse.json(
      { success: false, message: error.response?.data?.message || error.message || 'Failed to create subaccount' },
      { status: 500 }
    );
  }
}

// ✅ GET SUBACCOUNT DETAILS
export async function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
    }

    const sub = vendor.paystackSubaccount;
    const bank = vendor.bankAccount;

    return NextResponse.json({
      success: true,
      data: {
        hasSubaccount: !!sub?.subaccountCode,
        subaccount: sub?.subaccountCode ? {
          subaccountId:    sub.subaccountId,
          subaccountCode:  sub.subaccountCode,
          percentageCharge: sub.percentageCharge,
          isActive:        sub.isActive,
          createdAt:       sub.createdAt,
        } : null,
        bankAccount: bank ? {
          accountName:   bank.accountName,
          accountNumber: bank.accountNumber,
          bankName:      bank.bankName,
        } : null,
        isBankVerified: vendor.isBankVerified,
      },
    });
  } catch (error) {
    console.error('❌ Get subaccount error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch subaccount details' }, { status: 500 });
  }
}

// ✅ UPDATE SUBACCOUNT
export async function PUT(request) {
  try {
    const user = verifyToken(request);
    
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const { accountNumber, bankCode, businessName, email, phone } = await request.json();

    const vendor = await Vendor.findOne({ userId: user.userId });
    
    if (!vendor || !vendor.flutterwaveSubaccount?.subaccountId) {
      return NextResponse.json(
        { success: false, message: 'No subaccount found to update' },
        { status: 404 }
      );
    }

    // Update subaccount with payment provider
    const paymentAdapter = createPaymentAdapter();
    
    const updates = {};
    if (businessName) updates.business_name = businessName;
    if (email) updates.business_email = email;
    if (phone) updates.business_mobile = phone;
    if (accountNumber) updates.account_number = accountNumber;
    if (bankCode) updates.account_bank = bankCode;

    const result = await paymentAdapter.updateSubaccount(
      vendor.flutterwaveSubaccount.subaccountId,
      updates
    );

    // Update local vendor record
    if (accountNumber) vendor.bankAccount.accountNumber = accountNumber;
    if (bankCode) vendor.bankAccount.bankCode = bankCode;
    
    await vendor.save();

    return NextResponse.json({
      success: true,
      message: 'Subaccount updated successfully',
      data: result.data,
    });

  } catch (error) {
    console.error('❌ Subaccount update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to update subaccount',
      },
      { status: 500 }
    );
  }
}

// ✅ DELETE SUBACCOUNT
export async function DELETE(request) {
  try {
    const user = verifyToken(request);
    
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectDB();

    const vendor = await Vendor.findOne({ userId: user.userId });
    
    if (!vendor || !vendor.flutterwaveSubaccount?.subaccountId) {
      return NextResponse.json(
        { success: false, message: 'No subaccount found to delete' },
        { status: 404 }
      );
    }

    // Delete subaccount with payment provider
    const paymentAdapter = createPaymentAdapter();
    
    await paymentAdapter.deleteSubaccount(vendor.flutterwaveSubaccount.subaccountId);

    // Clear subaccount from vendor record
    vendor.flutterwaveSubaccount = {
      isActive: false,
    };
    
    await vendor.save();

    return NextResponse.json({
      success: true,
      message: 'Subaccount deleted successfully',
    });

  } catch (error) {
    console.error('❌ Subaccount deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to delete subaccount',
      },
      { status: 500 }
    );
  }
}