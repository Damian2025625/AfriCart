// lib/notifications.js - Termii Version
import axios from 'axios';
import { sendEmail } from './email/nodemailer';

// Termii Configuration
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'AfriCart';

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Send SMS via Termii
export async function sendSMS(phoneNumber, message) {
  if (!TERMII_API_KEY) {
    console.warn('⚠️ TERMII_API_KEY not set, skipping SMS');
    return { success: false, error: 'API key not configured' };
  }

  try {
    // Clean and format phone number
    let cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Add Nigeria country code if needed
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('234')) {
      cleanPhone = '234' + cleanPhone;
    }

    console.log('📱 Sending SMS via Termii to:', cleanPhone);

    // Termii API call
    const response = await axios.post(
      'https://api.ng.termii.com/api/sms/send',
      {
        to: cleanPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: TERMII_API_KEY,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📱 Termii API Response:', response.data);

    // Check response
    if (response.data && response.data.message === 'Successfully Sent') {
      console.log('✅ SMS sent successfully via Termii');
      console.log('   Message ID:', response.data.message_id);
      console.log('   Balance:', response.data.balance || 'N/A');
      
      return { 
        success: true, 
        messageId: response.data.message_id,
        balance: response.data.balance,
        data: response.data
      };
    } else {
      console.error('❌ SMS failed:', response.data);
      return { 
        success: false, 
        error: response.data?.message || 'Failed to send SMS' 
      };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

// Main notification function
export async function sendOrderNotifications({ vendor, vendorUser, order, customer }) {
  // ✅ Get vendor info from the User model
  const vendorPhone = vendorUser.phone;
  const vendorEmail = vendorUser.email;
  const vendorName = `${vendorUser.firstName} ${vendorUser.lastName}`;
  const businessName = vendor.businessName || vendorName;

  // Customer info
  const customerName = `${customer.firstName} ${customer.lastName}`;

  // SMS Message (160 chars for single SMS)
  const smsMessage = `NEW ORDER! 
Order #${order.orderNumber}
${order.items.length} item(s) - ${formatCurrency(order.total)}
Customer: ${customerName}
Login to AfriCart to view.`;

  // Email HTML
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(135deg, #f97316 0%, #22c55e 100%); color: white; padding: 30px 20px; border-radius: 10px; text-align: center; }
        .content { background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
        .order-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .item { padding: 15px; background: white; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .total { font-size: 24px; font-weight: bold; color: #22c55e; text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; }
        .button { display: inline-block; padding: 14px 32px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; margin-top: 25px; font-weight: bold; }
        .button:hover { background: #ea580c; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎉 New Order Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You have a new order from ${customerName}</p>
        </div>
        
        <div class="content">
          <span class="badge">ORDER #${order.orderNumber}</span>
          
          <h2 style="margin-top: 0; color: #111827;">Order Details</h2>
          
          <div class="order-details">
            <h3 style="margin-top: 0; color: #374151;">Customer Information</h3>
            <div class="detail-row">
              <span style="color: #6b7280;">Name:</span>
              <strong>${customerName}</strong>
            </div>
            <div class="detail-row">
              <span style="color: #6b7280;">Phone:</span>
              <strong>${order.shippingAddress.phone}</strong>
            </div>
            <div class="detail-row">
              <span style="color: #6b7280;">Delivery Address:</span>
              <strong style="text-align: right; max-width: 60%;">
                ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state}
              </strong>
            </div>
          </div>

          <div class="order-details">
            <h3 style="margin-top: 0; color: #374151;">Items Ordered (${order.items.length})</h3>
            ${order.items.map(item => `
              <div class="item">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1;">
                    <strong style="color: #111827; display: block; margin-bottom: 5px;">${item.name}</strong>
                    <span style="color: #6b7280; font-size: 14px;">Qty: ${item.quantity} × ${formatCurrency(item.price)}</span>
                  </div>
                  <strong style="color: #f97316; font-size: 16px;">${formatCurrency(item.price * item.quantity)}</strong>
                </div>
              </div>
            `).join('')}
            
            <div class="total">
              Total: ${formatCurrency(order.total)}
            </div>
          </div>

          <div class="order-details">
            <div class="detail-row">
              <span style="color: #6b7280;">Payment Method:</span>
              <strong>${order.paymentMethod.replace(/_/g, ' ')}</strong>
            </div>
            <div class="detail-row">
              <span style="color: #6b7280;">Payment Status:</span>
              <strong style="color: #f59e0b;">${order.paymentStatus}</strong>
            </div>
            <div class="detail-row">
              <span style="color: #6b7280;">Order Status:</span>
              <strong style="color: #3b82f6;">${order.orderStatus}</strong>
            </div>
          </div>

          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/vendor/orders" class="button">
              View Order Details →
            </a>
          </center>

          <p style="margin-top: 25px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 14px;">
            <strong>⚡ Action Required:</strong> Please confirm this order and prepare it for delivery as soon as possible.
          </p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} AfriCart. All rights reserved.</p>
          <p style="margin-top: 5px;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`📬 Sending notifications to ${vendorName} (${businessName})`);
  console.log(`   📱 SMS: ${vendorPhone}`);
  console.log(`   📧 Email: ${vendorEmail}`);

  // Send both notifications in parallel
  const results = await Promise.allSettled([
    sendSMS(vendorPhone, smsMessage),
    sendEmail({
      to: vendorEmail,
      subject: `New Order #${order.orderNumber} - AfriCart`,
      html: emailHTML,
    }),
  ]);

  const smsResult = results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason };
  const emailResult = results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason };

  console.log(`   ${smsResult.success ? '✅' : '❌'} SMS: ${smsResult.success ? 'Sent' : smsResult.error}`);
  console.log(`   ${emailResult.success ? '✅' : '❌'} Email: ${emailResult.success ? 'Sent' : emailResult.error}`);

  return {
    sms: smsResult,
    email: emailResult,
  };
}