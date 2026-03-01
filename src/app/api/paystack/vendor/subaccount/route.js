import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb/config";
import Vendor from "@/lib/mongodb/models/Vendor";
import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function verifyToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// ✅ CREATE PAYSTACK SUBACCOUNT
export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const {
      accountNumber,
      bankCode,
      businessName,
      email,
      phone,
      accountName,
    } = await request.json();

    if (!accountNumber || !bankCode || !businessName || !email) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor not found" },
        { status: 404 }
      );
    }

    // Check if Paystack subaccount already exists
    if (vendor.paystackSubaccount?.subaccountCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Paystack subaccount already exists",
          subaccountCode: vendor.paystackSubaccount.subaccountCode,
        },
        { status: 400 }
      );
    }

    // ✅ Step 1: Resolve bank account (verify account name)
    console.log("🔍 Resolving bank account with Paystack...");
    const resolveResponse = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!resolveResponse.data.status) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid bank account. Please check account number and bank.",
          error: resolveResponse.data.message,
        },
        { status: 400 }
      );
    }

    const resolvedAccountName = resolveResponse.data.data.account_name;
    console.log("✅ Bank account resolved:", resolvedAccountName);

    // ✅ Step 2: Create Paystack subaccount
    console.log("🔄 Creating Paystack subaccount...");
    const subaccountResponse = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 3, // Platform takes 3%, vendor gets 97%
        description: `AfricArt vendor account for ${businessName}`,
        primary_contact_email: email,
        primary_contact_name: resolvedAccountName || accountName || businessName,
        primary_contact_phone: phone || "",
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!subaccountResponse.data.status) {
      throw new Error(
        subaccountResponse.data.message || "Subaccount creation failed"
      );
    }

    const subaccountData = subaccountResponse.data.data;
    console.log("✅ Paystack subaccount created:", subaccountData.subaccount_code);

    // ✅ Step 3: Create Paystack Transfer Recipient (needed for escrow payouts)
    console.log("🔄 Creating Paystack transfer recipient for escrow payouts...");
    let recipientCode = null;
    try {
      const recipientResponse = await axios.post(
        "https://api.paystack.co/transferrecipient",
        {
          type: "nuban",
          name: resolvedAccountName || accountName || businessName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (recipientResponse.data.status) {
        recipientCode = recipientResponse.data.data.recipient_code;
        console.log("✅ Transfer recipient created:", recipientCode);
      }
    } catch (recipientError) {
      // Non-fatal: subaccount still works, escrow will fall back gracefully
      console.warn("⚠️ Transfer recipient creation failed (non-fatal):", recipientError.message);
    }

    // ✅ Step 4: Save subaccount + recipient details to vendor
    vendor.paystackSubaccount = {
      subaccountId: String(subaccountData.id),
      subaccountCode: subaccountData.subaccount_code,
      percentageCharge: subaccountData.percentage_charge || 3,
      isActive: true,
      createdAt: new Date(),
    };

    // Also update bank account info if not already set
    if (!vendor.bankAccount?.accountNumber) {
      vendor.bankAccount = {
        accountName: resolvedAccountName || accountName,
        accountNumber: accountNumber,
        bankName: subaccountData.settlement_bank || "",
        bankCode: bankCode,
        paystackRecipientCode: recipientCode,
      };
      vendor.isBankVerified = true;
      vendor.bankVerificationDate = new Date();
    } else {
      // Update recipient code even if bank account already existed
      vendor.bankAccount.paystackRecipientCode = recipientCode;
    }

    await vendor.save();

    return NextResponse.json({
      success: true,
      message: "Paystack subaccount created successfully",
      data: {
        subaccountId: subaccountData.id,
        subaccountCode: subaccountData.subaccount_code,
        accountName: resolvedAccountName,
        percentageCharge: subaccountData.percentage_charge || 3,
        settlementBank: subaccountData.settlement_bank,
      },
    });
  } catch (error) {
    console.error("❌ Paystack subaccount creation error:", error.message);
    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create Paystack subaccount",
      },
      { status: 500 }
    );
  }
}

// ✅ GET PAYSTACK SUBACCOUNT DETAILS
export async function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Vendor not found" },
        { status: 404 }
      );
    }

    const subaccount = vendor.paystackSubaccount;
    const bankAccount = vendor.bankAccount;

    return NextResponse.json({
      success: true,
      data: {
        hasSubaccount: !!subaccount?.subaccountCode,
        subaccount: subaccount?.subaccountCode
          ? {
              subaccountId: subaccount.subaccountId,
              subaccountCode: subaccount.subaccountCode,
              percentageCharge: subaccount.percentageCharge,
              isActive: subaccount.isActive,
              createdAt: subaccount.createdAt,
            }
          : null,
        bankAccount: bankAccount
          ? {
              accountName: bankAccount.accountName,
              accountNumber: bankAccount.accountNumber,
              bankName: bankAccount.bankName,
              bankCode: bankAccount.bankCode,
            }
          : null,
        isBankVerified: vendor.isBankVerified,
      },
    });
  } catch (error) {
    console.error("❌ Get Paystack subaccount error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch subaccount details" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE PAYSTACK SUBACCOUNT
export async function PUT(request) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== "VENDOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    const { accountNumber, bankCode, businessName, email, phone, accountName } =
      await request.json();

    const vendor = await Vendor.findOne({ userId: user.userId });
    if (!vendor || !vendor.paystackSubaccount?.subaccountCode) {
      return NextResponse.json(
        { success: false, message: "No Paystack subaccount found to update" },
        { status: 404 }
      );
    }

    const updates = {};
    if (businessName) updates.business_name = businessName;
    if (email) updates.primary_contact_email = email;
    if (phone) updates.primary_contact_phone = phone;

    let resolvedAccountName = accountName;
    if (accountNumber && bankCode) {
      try {
        const resolveResponse = await axios.get(
          `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
        );
        if (resolveResponse.data.status) {
          resolvedAccountName = resolveResponse.data.data.account_name;
        }
      } catch (err) {
        return NextResponse.json({ success: false, message: "Invalid bank account details." }, { status: 400 });
      }
      updates.account_number = accountNumber;
      updates.settlement_bank = bankCode;
      if (resolvedAccountName) updates.primary_contact_name = resolvedAccountName;
    }

    const response = await axios.put(
      `https://api.paystack.co/subaccount/${vendor.paystackSubaccount.subaccountCode}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.status) {
      throw new Error(response.data.message || "Subaccount update failed");
    }

    // Update local vendor record
    if (accountNumber) vendor.bankAccount.accountNumber = accountNumber;
    if (bankCode) vendor.bankAccount.bankCode = bankCode;
    if (resolvedAccountName) vendor.bankAccount.accountName = resolvedAccountName;
    if (response.data.data.settlement_bank) vendor.bankAccount.bankName = response.data.data.settlement_bank;
    await vendor.save();

    return NextResponse.json({
      success: true,
      message: "Paystack subaccount updated successfully",
      data: response.data.data,
    });
  } catch (error) {
    console.error("❌ Paystack subaccount update error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update subaccount",
      },
      { status: 500 }
    );
  }
}
