import jwt from 'jsonwebtoken';
import connectDB from './mongodb/config';
import User from './mongodb/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies the authentication token and returns the authenticated user.
 * This is a stateless verification that supports multiple concurrent sessions.
 * 
 * @param {Request} request - The incoming Next.js request object
 * @returns {Promise<Object>} The sanitized user object
 * @throws {Error} If authentication fails
 */
export async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.status = 401;
    throw error;
  }

  const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    const error = new Error('Server configuration error');
    error.status = 500;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    await connectDB();
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated. Please contact support.');
      error.status = 403;
      throw error;
    }

    return user;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      const authError = new Error('Invalid or expired token');
      authError.status = 401;
      throw authError;
    }
    if (error.name === 'TokenExpiredError') {
      const authError = new Error('Token expired');
      authError.status = 401;
      throw authError;
    }
    throw error;
  }
}

/**
 * Helper to handle auth errors and return appropriate Response
 * @param {Error} error - The caught error
 * @returns {Response}
 */
export function handleAuthError(error) {
  const status = error.status || 500;
  const message = error.message || 'An error occurred during authentication';
  
  return Response.json(
    { success: false, message },
    { status }
  );
}
