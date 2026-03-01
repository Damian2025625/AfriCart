import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectDB();

    const { token, password } = await request.json();

    // Validate inputs
    if (!token || !token.trim()) {
      return NextResponse.json(
        { success: false, message: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Token not expired
    });

    if (!user) {
      console.log('⚠️ Invalid or expired reset token:', token);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      );
    }

    console.log('✅ Valid reset token for user:', user.email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('✅ Password reset successful for user:', user.email);

    return NextResponse.json(
      {
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}