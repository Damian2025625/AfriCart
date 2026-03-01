// Welcome Email Template
export const welcomeEmailTemplate = (firstName) => ({
  subject: "🎉 Welcome to Africart!",
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Africart</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #10b981 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🛒 Africart</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                      Welcome${firstName ? ", " + firstName : ""}! 🎉
                    </h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      Thank you for joining Africart, your premier marketplace for African products!
                    </p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      Your account has been successfully created. You can now:
                    </p>
                    <ul style="color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; font-size: 16px;">
                      <li>Browse thousands of products</li>
                      <li>Connect with local vendors</li>
                      <li>Track your orders in real-time</li>
                      <li>Enjoy secure checkout</li>
                    </ul>
                    <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background: linear-gradient(135deg, #f97316 0%, #10b981 100%);">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Start Shopping
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                      Need help? Contact us at <a href="mailto:support@africart.com" style="color: #f97316; text-decoration: none;">support@africart.com</a>
                    </p>
                    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                      © 2024 Africart. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  text: `Welcome${firstName ? ", " + firstName : ""}!\n\nThank you for joining Africart. Your account has been successfully created.\n\nStart shopping: ${process.env.NEXT_PUBLIC_APP_URL}/login`,
});

// Order Confirmation Email
export function orderConfirmationEmailTemplate(order, customer) {
  return {
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .order-item { border-bottom: 1px solid #e5e7eb; padding: 15px 0; }
          .total { font-size: 20px; font-weight: bold; color: #16a34a; margin-top: 20px; }
          .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! ✅</h1>
          </div>
          <div class="content">
            <h2>Thank you for your order, ${customer.name}!</h2>
            <p>Your order has been confirmed and is being processed.</p>
            
            <div class="order-info">
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              
              <h3>Order Items:</h3>
              ${order.items
                .map(
                  (item) => `
                <div class="order-item">
                  <p><strong>${item.productName}</strong></p>
                  <p>Quantity: ${item.quantity} × ₦${item.price.toLocaleString()}</p>
                  <p>Subtotal: ₦${(item.quantity * item.price).toLocaleString()}</p>
                </div>
              `,
                )
                .join("")}
              
              <div class="total">
                <p>Total: ₦${order.totalAmount.toLocaleString()}</p>
              </div>
            </div>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/orders/${order.orderNumber}" class="button">Track Order</a>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

// Order Status Update Email
export function orderStatusUpdateEmailTemplate(order, customer, newStatus) {
  const statusMessages = {
    CONFIRMED: "Your order has been confirmed by the vendor.",
    PROCESSING: "Your order is being prepared for shipment.",
    SHIPPED: "Your order has been shipped!",
    DELIVERED: "Your order has been delivered!",
    CANCELLED: "Your order has been cancelled.",
  };

  return {
    subject: `Order Update - ${order.orderNumber} is now ${newStatus}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 10px 20px; background: #16a34a; color: white; border-radius: 20px; font-weight: bold; }
          .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${customer.name}!</h2>
            <p><span class="status-badge">${newStatus}</span></p>
            <p>${statusMessages[newStatus]}</p>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/orders/${order.orderNumber}" class="button">View Order Details</a>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

// Price Offer Response Email
export function priceOfferResponseEmailTemplate(
  offer,
  customer,
  action,
  vendorNote,
) {
  const actions = {
    ACCEPTED: {
      title: "Offer Accepted! 🎉",
      color: "#16a34a",
      message: "Great news! The vendor has accepted your price offer.",
    },
    DECLINED: {
      title: "Offer Declined",
      color: "#dc2626",
      message: "Unfortunately, the vendor has declined your price offer.",
    },
    COUNTERED: {
      title: "Counter-Offer Received",
      color: "#2563eb",
      message: "The vendor has sent you a counter-offer.",
    },
  };

  const actionInfo = actions[action];

  return {
    subject: `${actionInfo.title} - ${offer.productName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${actionInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .offer-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${actionInfo.title}</h1>
          </div>
          <div class="content">
            <h2>Hi ${customer.name}!</h2>
            <p>${actionInfo.message}</p>
            
            <div class="offer-box">
              <p><strong>Product:</strong> ${offer.productName}</p>
              <p><strong>Your Offer:</strong> ₦${offer.minPrice.toLocaleString()} - ₦${offer.maxPrice.toLocaleString()}</p>
              ${vendorNote ? `<p><strong>Vendor's Note:</strong> ${vendorNote}</p>` : ""}
            </div>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer/offers" class="button">View Offer Details</a>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

// New Message Notification Email
export function newMessageEmailTemplate(recipient, sender, preview) {
  return {
    subject: `New message from ${sender}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; padding: 20px; border-left: 4px solid #f97316; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Message 💬</h1>
          </div>
          <div class="content">
            <h2>Hi ${recipient}!</h2>
            <p>You have a new message from <strong>${sender}</strong></p>
            
            <div class="message-box">
              <p>${preview}</p>
            </div>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chats" class="button">View Message</a>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

// Password Reset Email Template
export const passwordResetEmailTemplate = (resetUrl, firstName) => ({
  subject: "🔐 Reset Your Africart Password",
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #8b5cf6; padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🔐 Password Reset</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                      Hi${firstName ? " " + firstName : ""}!
                    </h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      We received a request to reset your password for your Africart account.
                    </p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                      Click the button below to reset your password:
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #8b5cf6;">
                          <a href="${resetUrl}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6b7280; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #8b5cf6; line-height: 1.6; margin: 10px 0 30px 0; font-size: 14px; word-break: break-all;">
                      ${resetUrl}
                    </p>
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0;">
                      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
                      </p>
                    </div>
                    <p style="color: #6b7280; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
                      If you didn't request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                      Need help? Contact us at <a href="mailto:support@africart.com" style="color: #8b5cf6; text-decoration: none;">support@africart.com</a>
                    </p>
                    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                      © 2024 Africart. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  text: `Hi${firstName ? " " + firstName : ""}!\n\nWe received a request to reset your password.\n\nClick here to reset: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
});

// Vendor Welcome Email Template
export const vendorWelcomeEmailTemplate = (firstName, businessName) => ({
  subject: "🎉 Welcome to Africart Vendor Platform!",
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome Vendor</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🏪 Welcome Vendor!</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
                      Welcome${firstName ? ", " + firstName : ""}! 🎉
                    </h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      Congratulations! Your vendor account for <strong>${businessName || "your business"}</strong> has been successfully created on Africart.
                    </p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      You can now start selling to thousands of customers across Africa!
                    </p>
                    
                    <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">
                      Next Steps:
                    </h3>
                    <ol style="color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; font-size: 16px;">
                      <li>Complete your business profile</li>
                      <li>Upload your first products</li>
                      <li>Set up your payment information</li>
                      <li>Start receiving orders!</li>
                    </ol>
                    
                    <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            Go to Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                      Questions? Contact vendor support at <a href="mailto:vendors@africart.com" style="color: #f97316; text-decoration: none;">vendors@africart.com</a>
                    </p>
                    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                      © 2024 Africart. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  text: `Welcome${firstName ? ", " + firstName : ""}!\n\nYour vendor account for ${businessName || "your business"} has been created.\n\nGo to your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/vendor`,
});
