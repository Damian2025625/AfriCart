// lib/sms.js
// Termii SMS Implementation

/**
 * Send SMS using Termii API
 * @param {string} to - Phone number (e.g., "2348012345678" or "08012345678")
 * @param {string} message - SMS message
 */
export async function sendSMS(to, message) {
  try {
    // Clean and format phone number for Termii
    let cleanPhone = to.replace(/\s/g, '');
    
    // Remove + if present
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Add Nigeria country code if needed
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('234')) {
      cleanPhone = '234' + cleanPhone;
    }

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: cleanPhone,
        from: process.env.TERMII_SENDER_ID || 'AfriCart',
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: process.env.TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (data && data.message === 'Successfully Sent') {
      console.log('SMS sent successfully:', data);
      return { 
        success: true, 
        messageId: data.message_id,
        balance: data.balance
      };
    } else {
      console.error('SMS failed:', data);
      throw new Error(data.message || 'Failed to send SMS');
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    throw error;
  }
}

/**
 * Send Bulk SMS using Termii
 */
export async function sendBulkSMS(recipients, message) {
  try {
    // Format all phone numbers
    const formattedRecipients = recipients.map(phone => {
      let cleanPhone = phone.replace(/\s/g, '');
      
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith('234')) {
        cleanPhone = '234' + cleanPhone;
      }
      
      return cleanPhone;
    });

    // Send individual SMS for each recipient (Termii doesn't have bulk endpoint)
    const promises = formattedRecipients.map(phone => 
      fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          from: process.env.TERMII_SENDER_ID || 'AfriCart',
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: process.env.TERMII_API_KEY,
        }),
      }).then(res => res.json())
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.message === 'Successfully Sent').length;
    
    console.log(`Bulk SMS: ${successCount}/${recipients.length} sent successfully`);
    
    return { 
      success: true, 
      total: recipients.length,
      successful: successCount,
      results 
    };
  } catch (error) {
    console.error('Bulk SMS error:', error);
    throw error;
  }
}

/**
 * SMS Templates
 */

// Order Confirmation SMS
export function orderConfirmationSMS(orderNumber, totalAmount, customerName) {
  return `Hi ${customerName}! Your order ${orderNumber} has been confirmed. Total: ₦${totalAmount.toLocaleString()}. Track: ${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderNumber}`;
}

// Order Status Update SMS
export function orderStatusUpdateSMS(orderNumber, status, customerName) {
  const statusMessages = {
    CONFIRMED: 'confirmed by vendor',
    PROCESSING: 'being prepared',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  };

  return `Hi ${customerName}! Your order ${orderNumber} is now ${statusMessages[status]}. Check details: ${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderNumber}`;
}

// Price Offer Response SMS
export function priceOfferResponseSMS(productName, action, customerName) {
  const actions = {
    ACCEPTED: 'accepted your offer',
    DECLINED: 'declined your offer',
    COUNTERED: 'sent a counter-offer',
  };

  return `Hi ${customerName}! The vendor ${actions[action]} for ${productName}. View details: ${process.env.NEXT_PUBLIC_APP_URL}/offers`;
}

// New Message SMS
export function newMessageSMS(senderName, recipientName) {
  return `Hi ${recipientName}! You have a new message from ${senderName}. View: ${process.env.NEXT_PUBLIC_APP_URL}/chats`;
}

// Welcome SMS
export function welcomeSMS(name) {
  return `Welcome to AfriCart, ${name}! 🎉 Start shopping now: ${process.env.NEXT_PUBLIC_APP_URL}`;
}

// Password Reset SMS
export function passwordResetSMS(name, resetCode) {
  return `Hi ${name}! Your password reset code is: ${resetCode}. Valid for 10 minutes. Don't share this code.`;
}

// Low Stock Alert for Vendors
export function lowStockAlertSMS(productName, quantity, vendorName) {
  return `Hi ${vendorName}! Low stock alert: "${productName}" has only ${quantity} units left. Restock soon.`;
}

// Payment Received SMS for Vendors
export function paymentReceivedSMS(orderNumber, amount, vendorName) {
  return `Hi ${vendorName}! Payment received for order ${orderNumber}: ₦${amount.toLocaleString()}. Process the order now.`;
}

export default { sendSMS, sendBulkSMS };