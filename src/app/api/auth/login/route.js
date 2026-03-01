import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/config';
import User from '@/lib/mongodb/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// 🛡️ SECURITY: Rate Limiting
// ==========================================
// In-memory store for login attempts (use Redis in production for scaling)
const loginAttempts = new Map();
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Reset if window has passed
  if (now - attempts.firstAttempt > ATTEMPT_WINDOW) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  // Check if max attempts exceeded
  if (attempts.count >= MAX_ATTEMPTS) {
    const timeLeft = Math.ceil((ATTEMPT_WINDOW - (now - attempts.firstAttempt)) / 1000 / 60);
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter: timeLeft 
    };
  }

  // Increment attempts
  attempts.count++;
  loginAttempts.set(identifier, attempts);
  return { allowed: true, remaining: MAX_ATTEMPTS - attempts.count };
}

function resetRateLimit(identifier) {
  loginAttempts.delete(identifier);
}

// ==========================================
// 🛡️ SECURITY: Input Sanitization
// ==========================================
function sanitizeString(input) {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }
  
  // Remove potentially dangerous characters for NoSQL injection
  // Remove $, {, }, [, ], \, null bytes
  return input
    .replace(/[\$\{\}\[\]\\]/g, '')
    .trim();
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Comprehensive email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  // Password must be between 6 and 128 characters
  return password.length >= 6 && password.length <= 128;
}

// ==========================================
// 🛡️ SECURITY: Input Validation
// ==========================================
function validateLoginInput(email, password) {
  const errors = [];

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (!validatePassword(password)) {
    errors.push('Invalid password format');
  }

  return errors;
}

// ==========================================
// 🛡️ MAIN LOGIN HANDLER
// ==========================================
export async function POST(request) {
  try {
    // ==========================================
    // 1. Extract user identifier for rate limiting
    // ==========================================
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // ==========================================
    // 2. Get request body
    // ==========================================
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // ==========================================
    // 3. SECURITY: Validate input format
    // ==========================================
    const validationErrors = validateLoginInput(email, password);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input',
          errors: validationErrors 
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. SECURITY: Sanitize inputs (prevent NoSQL injection)
    // ==========================================
    let sanitizedEmail, sanitizedPassword;
    try {
      sanitizedEmail = sanitizeString(email).toLowerCase();
      sanitizedPassword = sanitizeString(password);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid input format' },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. SECURITY: Rate limiting (prevent brute force)
    // ==========================================
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Too many login attempts. Please try again in ${rateLimit.retryAfter} minutes.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter * 60),
            'X-RateLimit-Limit': String(MAX_ATTEMPTS),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    // ==========================================
    // 6. Connect to database
    // ==========================================
    await connectDB();

    // ==========================================
    // 7. Find user (using sanitized email)
    // ==========================================
    const user = await User.findOne({ 
      email: sanitizedEmail 
    }).select('+password'); // Explicitly select password field

    if (!user) {
      // 🛡️ SECURITY: Don't reveal if email exists or not (timing attack prevention)
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ==========================================
    // 8. Check if user is active
    // ==========================================
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // ==========================================
    // 9. Verify password
    // ==========================================
    const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
    
    if (!isPasswordValid) {
      // 🛡️ SECURITY: Don't reveal if email exists or password is wrong
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ==========================================
    // 10. SECURITY: Reset rate limit on successful login
    // ==========================================
    resetRateLimit(ip);

    // ==========================================
    // 11. Create JWT token
    // ==========================================
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ==========================================
    // 12. Update last login (optional - good for audit)
    // ==========================================
    user.lastLoginAt = new Date();
    user.lastLoginIP = ip;
    await user.save();

    // ==========================================
    // 13. Return success response
    // ==========================================
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { 
        status: 200,
        headers: {
          'X-RateLimit-Limit': String(MAX_ATTEMPTS),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    
    // 🛡️ SECURITY: Don't expose internal error details to user
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred during login. Please try again.' 
      },
      { status: 500 }
    );
  }
}