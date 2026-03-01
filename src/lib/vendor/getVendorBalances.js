// lib/vendor/getVendorBalances.js
/**
 * ✅ PRODUCTION-GRADE: Calculate vendor balances from ORDERS (source of truth)
 * 
 * This is the CORRECT way to track vendor settlements:
 * - Orders are created immediately when payment succeeds
 * - Settlement status tracked in database
 * - Flutterwave settlements used ONLY for confirmation (not primary data)
 */

import Order from '@/lib/mongodb/models/Order';
import mongoose from 'mongoose';

/**
 * Get vendor's real-time settlement breakdown
 * SOURCE OF TRUTH: Orders in database, NOT Flutterwave API
 * 
 * @param {ObjectId} vendorId - Vendor's MongoDB ID
 * @returns {Object} Vendor's settlement balances
 */
export async function getVendorBalances(vendorId) {
  try {
    // ✅ AGGREGATE ORDERS BY SETTLEMENT STATUS
    const balances = await Order.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          paymentStatus: 'PAID', // Only count paid orders
          isMasterOrder: false,  // Only sub-orders (vendor orders)
        },
      },
      {
        $group: {
          _id: '$vendorSettlement.status',
          totalAmount: { $sum: '$vendorSettlement.amount' },
          count: { $sum: 1 },
          orders: { $push: {
            orderNumber: '$orderNumber',
            amount: '$vendorSettlement.amount',
            paidAt: '$vendorSettlement.paidAt',
            expectedSettlementDate: '$vendorSettlement.expectedSettlementDate',
          }},
        },
      },
    ]);

    // ✅ FORMAT RESULTS
    const breakdown = {
      pending: 0,        // Paid today, not in settlement yet (PENDING status)
      inSettlement: 0,   // In Flutterwave settlement batch (IN_SETTLEMENT status)
      settled: 0,        // Money in vendor's bank (SETTLED status)
      
      pendingCount: 0,
      inSettlementCount: 0,
      settledCount: 0,
      
      pendingOrders: [],
      inSettlementOrders: [],
      settledOrders: [],
    };

    balances.forEach(item => {
      switch (item._id) {
        case 'PENDING':
          breakdown.pending = item.totalAmount;
          breakdown.pendingCount = item.count;
          breakdown.pendingOrders = item.orders;
          break;
        case 'IN_SETTLEMENT':
          breakdown.inSettlement = item.totalAmount;
          breakdown.inSettlementCount = item.count;
          breakdown.inSettlementOrders = item.orders;
          break;
        case 'SETTLED':
          breakdown.settled = item.totalAmount;
          breakdown.settledCount = item.count;
          breakdown.settledOrders = item.orders;
          break;
      }
    });

    // ✅ CALCULATE TOTALS
    const totalEarned = breakdown.pending + breakdown.inSettlement + breakdown.settled;
    
    // ✅ GET NEXT EXPECTED SETTLEMENT
    const oldestPending = await Order.findOne({
      vendorId,
      'vendorSettlement.status': 'PENDING',
      paymentStatus: 'PAID',
    })
    .sort({ 'vendorSettlement.expectedSettlementDate': 1 })
    .select('vendorSettlement.expectedSettlementDate vendorSettlement.amount');

    return {
      // Balances by status
      pending: breakdown.pending,
      pendingCount: breakdown.pendingCount,
      
      inSettlement: breakdown.inSettlement,
      inSettlementCount: breakdown.inSettlementCount,
      
      settled: breakdown.settled,
      settledCount: breakdown.settledCount,
      
      // Totals
      totalEarned: totalEarned,
      
      // Next settlement info
      nextSettlementDate: oldestPending?.vendorSettlement.expectedSettlementDate || null,
      nextSettlementAmount: breakdown.pending, // All pending will be in next settlement
      
      // Order details (for debugging/audit)
      pendingOrders: breakdown.pendingOrders,
      inSettlementOrders: breakdown.inSettlementOrders,
      settledOrders: breakdown.settledOrders.slice(0, 10), // Last 10 settled
    };

  } catch (error) {
    console.error('Error calculating vendor balances:', error);
    throw error;
  }
}

/**
 * Get settlement history for vendor (last 30 days)
 * 
 * @param {ObjectId} vendorId - Vendor's MongoDB ID
 * @param {Number} limit - Number of settlements to return (default: 10)
 * @returns {Array} Recent settlements
 */
export async function getVendorSettlementHistory(vendorId, limit = 10) {
  try {
    const settlements = await Order.find({
      vendorId,
      'vendorSettlement.status': { $in: ['IN_SETTLEMENT', 'SETTLED'] },
      'vendorSettlement.settledAt': { $ne: null },
    })
    .sort({ 'vendorSettlement.settledAt': -1 })
    .limit(limit)
    .select('orderNumber vendorSettlement total createdAt');

    return settlements.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      amount: order.vendorSettlement.amount,
      status: order.vendorSettlement.status === 'SETTLED' ? 'Completed' : 'Pending',
      date: order.vendorSettlement.settledAt || order.vendorSettlement.expectedSettlementDate,
      reference: order.vendorSettlement.flutterwaveSettlementId || order.orderNumber,
      transactionCount: 1, // Each order is one transaction
    }));

  } catch (error) {
    console.error('Error fetching settlement history:', error);
    return [];
  }
}

/**
 * Get orders that should have been settled but haven't
 * (For monitoring/alerting)
 * 
 * @param {ObjectId} vendorId - Vendor's MongoDB ID
 * @returns {Array} Overdue orders
 */
export async function getOverdueSettlements(vendorId) {
  try {
    const now = new Date();
    
    const overdueOrders = await Order.find({
      vendorId,
      'vendorSettlement.status': { $in: ['PENDING', 'IN_SETTLEMENT'] },
      'vendorSettlement.expectedSettlementDate': { $lt: now },
    })
    .sort({ 'vendorSettlement.expectedSettlementDate': 1 })
    .select('orderNumber vendorSettlement total createdAt');

    return overdueOrders.map(order => ({
      orderNumber: order.orderNumber,
      amount: order.vendorSettlement.amount,
      status: order.vendorSettlement.status,
      expectedDate: order.vendorSettlement.expectedSettlementDate,
      daysOverdue: Math.floor((now - order.vendorSettlement.expectedSettlementDate) / (24 * 60 * 60 * 1000)),
    }));

  } catch (error) {
    console.error('Error fetching overdue settlements:', error);
    return [];
  }
}