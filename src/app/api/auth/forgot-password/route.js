import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email/emailService';

export async function POST(request) {
  try {
    await connectDB();

    const { email } = await request.json();

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('⚠️ Password reset requested for non-existent email:', email);
      return NextResponse.json(
        { 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link shortly.' 
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    console.log('✅ Reset token generated for user:', user.email);

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    // Send password reset email (async, don't wait)
    sendPasswordResetEmail(user.email, resetUrl, user.firstName)
      .then(() => console.log('✅ Password reset email sent to:', user.email))
      .catch((error) => console.error('❌ Failed to send password reset email:', error));

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset link has been sent to your email. Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}