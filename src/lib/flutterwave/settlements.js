// lib/flutterwave/settlements.js
// 🔍 DEBUG VERSION - Shows exactly what Flutterwave returns

async function getSettlementDetails(settlementId) {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/settlements/${settlementId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    if (data.status === 'success') {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching settlement ${settlementId} details:`, error);
    return null;
  }
}

export async function getVendorTransactionsAndSettlements(vendorSubaccountCode) {
  try {
    console.log(`\n🔍 Fetching settlement data for subaccount: ${vendorSubaccountCode}\n`);

    const settlementsResponse = await fetch(
      `https://api.flutterwave.com/v3/settlements?subaccount=${vendorSubaccountCode}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const settlementsData = await settlementsResponse.json();

    console.log(`📊 Settlements API Response:`);
    console.log(`   Status: ${settlementsData.status}`);
    console.log(`   Settlements found: ${settlementsData.data?.length || 0}`);

    const settlements = settlementsData.data || [];

    if (settlements.length === 0) {
      console.log('   No settlements found for this vendor\n');
      const processingData = await getProcessingTransactions(vendorSubaccountCode, new Set());
      
      return {
        success: true,
        balances: {
          processing: processingData.processingBalance,
          processingCount: processingData.processingTransactions.length,
          pendingPayout: 0,
          pendingPayoutCount: 0,
          totalWithdrawn: 0,
          completedCount: 0,
        },
        recentSettlements: [],
        debug: {
          processingTransactions: processingData.processingTransactions.slice(0, 5),
        },
      };
    }

    console.log(`\n🔍 Fetching detailed settlement data...`);
    
    const detailedSettlements = await Promise.all(
      settlements.map(async (settlement) => {
        const details = await getSettlementDetails(settlement.id);
        return details;
      })
    );

    const validDetailedSettlements = detailedSettlements.filter(s => s !== null);
    
    console.log(`   Detailed settlements fetched: ${validDetailedSettlements.length}`);

    // ✅ ADD DETAILED DEBUG LOGGING HERE
    console.log(`\n🔍 DEBUG: Examining settlement structure...\n`);
    
    const pendingSettlements = [];
    const completedSettlements = [];
    const settledTxnIds = new Set();
    
    validDetailedSettlements.forEach((settlement, idx) => {
      console.log(`\n📋 Settlement #${idx + 1}: ${settlement.id}`);
      console.log(`   Status: ${settlement.status}`);
      console.log(`   Net Amount: ₦${settlement.net_amount}`);
      console.log(`   Transaction Count: ${settlement.transaction_count}`);
      console.log(`   Transactions Array Length: ${settlement.transactions?.length || 0}`);
      
      if (settlement.transactions && settlement.transactions.length > 0) {
        console.log(`\n   First Transaction Details:`);
        const firstTxn = settlement.transactions[0];
        console.log(`   - ID: ${firstTxn.id}`);
        console.log(`   - Charged Amount: ₦${firstTxn.charged_amount}`);
        console.log(`   - Settlement Amount: ₦${firstTxn.settlement_amount}`);
        console.log(`   - Subaccount Settlement: ${firstTxn.subaccount_settlement}`);
        console.log(`   - App Fee: ₦${firstTxn.app_fee}`);
        console.log(`   - Status: ${firstTxn.status}`);
        
        // 🔍 CHECK ALL POSSIBLE SUBACCOUNT FIELDS
        console.log(`\n   Checking all possible subaccount fields:`);
        console.log(`   - subaccount_settlement: ${firstTxn.subaccount_settlement}`);
        console.log(`   - subaccount_amount: ${firstTxn.subaccount_amount}`);
        console.log(`   - split_amount: ${firstTxn.split_amount}`);
        console.log(`   - Full transaction object keys:`, Object.keys(firstTxn));
      }
      
      // Try MULTIPLE ways to identify vendor transactions
      const vendorTransactions = (settlement.transactions || []).filter(txn => {
        // Method 1: subaccount_settlement > 0
        if (txn.subaccount_settlement && txn.subaccount_settlement > 0) {
          console.log(`   ✅ Found via subaccount_settlement: ₦${txn.subaccount_settlement}`);
          return true;
        }
        
        // Method 2: Check if settlement_amount equals the vendor's 97% split
        // (If this transaction belongs to vendor, settlement_amount should be vendor's share)
        if (txn.settlement_amount && txn.settlement_amount > 0) {
          const vendorShare = txn.charged_amount * 0.97;
          const diff = Math.abs(txn.settlement_amount - vendorShare);
          if (diff < 1) { // Within ₦1 tolerance
            console.log(`   ✅ Found via settlement_amount match: ₦${txn.settlement_amount}`);
            return true;
          }
        }
        
        // Method 3: Check meta field for subaccount info
        if (txn.meta && typeof txn.meta === 'string') {
          if (txn.meta.includes(vendorSubaccountCode)) {
            console.log(`   ✅ Found via meta field containing subaccount code`);
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`   Vendor Transactions Found: ${vendorTransactions.length}`);
      
      if (vendorTransactions.length === 0) {
        console.log(`   ⚠️ NO VENDOR TRANSACTIONS in this settlement!`);
        return;
      }
      
      settledTxnIds.add(settlement.id.toString());
      vendorTransactions.forEach(txn => settledTxnIds.add(txn.id.toString()));
      
      const vendorAmount = vendorTransactions.reduce((sum, txn) => {
        // Try multiple amount fields
        const amount = txn.subaccount_settlement || 
                      txn.settlement_amount || 
                      txn.split_amount || 
                      (txn.charged_amount * 0.97);
        return sum + (parseFloat(amount) || 0);
      }, 0);
      
      console.log(`   ✅ Vendor's Total from Settlement: ₦${vendorAmount.toFixed(2)}`);
      
      const settlementInfo = {
        id: settlement.id,
        amount: vendorAmount,
        status: settlement.status === 'completed' ? 'Completed' : 'Pending',
        date: settlement.processed_date ? new Date(settlement.processed_date).toISOString().split('T')[0] :
              settlement.due_date ? new Date(settlement.due_date).toISOString().split('T')[0] : 
              'Processing',
        reference: settlement.id || `SETL-${settlement.id}`,
        bankName: settlement.destination || 'N/A',
        accountNumber: settlement.settlement_account || 'N/A',
        transactionCount: vendorTransactions.length,
      };
      
      if (settlement.status === 'completed') {
        completedSettlements.push(settlementInfo);
      } else if (settlement.status === 'pending') {
        pendingSettlements.push(settlementInfo);
      }
    });

    const pendingBalance = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
    const completedBalance = completedSettlements.reduce((sum, s) => sum + s.amount, 0);

    console.log(`\n💰 Vendor's Settlement Breakdown:`);
    console.log(`   ✅ Pending Payout: ₦${pendingBalance.toFixed(2)} (${pendingSettlements.length} settlements)`);
    console.log(`   💸 Completed: ₦${completedBalance.toFixed(2)} (${completedSettlements.length} settlements)`);

    const processingData = await getProcessingTransactions(vendorSubaccountCode, settledTxnIds);

    console.log(`   ⏳ Processing: ₦${processingData.processingBalance.toFixed(2)} (${processingData.processingTransactions.length} txns)\n`);

    const allRecentSettlements = [...pendingSettlements, ...completedSettlements]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      balances: {
        processing: processingData.processingBalance,
        processingCount: processingData.processingTransactions.length,
        pendingPayout: pendingBalance,
        pendingPayoutCount: pendingSettlements.length,
        totalWithdrawn: completedBalance,
        completedCount: completedSettlements.length,
      },
      recentSettlements: allRecentSettlements,
      nextSettlement: getNextSettlementDate(),
      debug: {
        processingTransactions: processingData.processingTransactions.slice(0, 5),
        pendingSettlements: pendingSettlements.slice(0, 3),
        completedSettlements: completedSettlements.slice(0, 3),
      },
    };

  } catch (error) {
    console.error('❌ Error fetching vendor settlement data:', error);
    return {
      success: false,
      message: error.message,
      balances: {
        processing: 0,
        processingCount: 0,
        pendingPayout: 0,
        pendingPayoutCount: 0,
        totalWithdrawn: 0,
        completedCount: 0,
      },
      recentSettlements: [],
    };
  }
}

async function getProcessingTransactions(vendorSubaccountCode, settledTxnIds) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    console.log(`\n📊 Fetching transactions from ${fromDate} to ${toDate}...`);

    const transactionsResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions?status=successful&subaccount=${vendorSubaccountCode}&from=${fromDate}&to=${toDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const transactionsData = await transactionsResponse.json();
    
    if (transactionsData.status !== 'success') {
      console.warn('⚠️ Failed to fetch transactions:', transactionsData.message);
      return { processingBalance: 0, processingTransactions: [] };
    }

    const allTransactions = transactionsData.data || [];
    console.log(`   Total vendor transactions: ${allTransactions.length}`);

    const processingTransactions = allTransactions.filter(txn => {
      const txnIdStr = txn.id.toString();
      
      if (settledTxnIds.has(txnIdStr)) {
        return false;
      }
      
      if (txn.amount_settled !== null && txn.amount_settled !== undefined) {
        return false;
      }
      
      return true;
    }).map(txn => {
      let vendorAmount = 0;
      
      if (txn.subaccount_settlement) {
        vendorAmount = parseFloat(txn.subaccount_settlement);
      } else if (txn.meta?.split_amount) {
        vendorAmount = parseFloat(txn.meta.split_amount);
      } else if (txn.charged_amount) {
        vendorAmount = parseFloat(txn.charged_amount);
      } else {
        vendorAmount = txn.amount * 0.97;
      }
      
      return {
        txnId: txn.id,
        amount: vendorAmount,
        txnRef: txn.tx_ref,
        date: new Date(txn.created_at).toISOString().split('T')[0],
        hoursSince: Math.floor((Date.now() - new Date(txn.created_at)) / (1000 * 60 * 60)),
      };
    });

    const processingBalance = processingTransactions.reduce((sum, t) => sum + t.amount, 0);

    console.log(`   ⏳ Processing (unsettled): ${processingTransactions.length} transactions`);
    console.log(`   💰 Processing balance: ₦${processingBalance.toFixed(2)}`);

    return {
      processingBalance,
      processingTransactions,
    };

  } catch (error) {
    console.error('❌ Error fetching processing transactions:', error);
    return {
      processingBalance: 0,
      processingTransactions: [],
    };
  }
}

function getNextSettlementDate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayOfWeek = tomorrow.getDay();
  if (dayOfWeek === 0) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  } else if (dayOfWeek === 6) {
    tomorrow.setDate(tomorrow.getDate() + 2);
  }
  
  return tomorrow.toISOString().split('T')[0];
}

export async function getVendorSettlementOverview(vendorSubaccountCode) {
  try {
    console.log(`\n🏪 Getting settlement overview for subaccount: ${vendorSubaccountCode}\n`);

    const data = await getVendorTransactionsAndSettlements(vendorSubaccountCode);

    if (!data.success) {
      throw new Error(data.message);
    }

    return {
      success: true,
      settlements: {
        processingBalance: data.balances.processing,
        processingCount: data.balances.processingCount,
        pendingBalance: data.balances.pendingPayout,
        pendingCount: data.balances.pendingPayoutCount,
        totalWithdrawn: data.balances.totalWithdrawn,
        completedCount: data.balances.completedCount,
        nextSettlement: data.nextSettlement,
        nextSettlementAmount: data.balances.pendingPayout,
        availableBalance: data.balances.totalWithdrawn,
      },
      recentSettlements: data.recentSettlements,
      debug: data.debug,
    };

  } catch (error) {
    console.error('❌ Error getting vendor settlement overview:', error);
    return {
      success: false,
      message: error.message,
      settlements: {
        processingBalance: 0,
        processingCount: 0,
        pendingBalance: 0,
        pendingCount: 0,
        totalWithdrawn: 0,
        completedCount: 0,
        nextSettlement: getNextSettlementDate(),
        nextSettlementAmount: 0,
        availableBalance: 0,
      },
      recentSettlements: [],
    };
  }
}