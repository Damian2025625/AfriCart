import { sendEmail } from './nodemailer';
import {
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  vendorWelcomeEmailTemplate,
} from './templates';

export const sendWelcomeEmail = async (to, firstName) => {
  try {
    const { subject, html, text } = welcomeEmailTemplate(firstName);

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async (to, resetUrl, firstName) => {
  try {
    const { subject, html, text } = passwordResetEmailTemplate(resetUrl, firstName);

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

export const sendVendorWelcomeEmail = async (to, firstName, businessName) => {
  try {
    const { subject, html, text } = vendorWelcomeEmailTemplate(firstName, businessName);

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error('❌ Error sending vendor welcome email:', error);
    return { success: false, error: error.message };
  }
};