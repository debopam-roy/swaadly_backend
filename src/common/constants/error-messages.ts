export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token provided',
  SESSION_NOT_FOUND: 'Session not found or has been revoked',

  // OTP
  OTP_INVALID: 'Invalid OTP code',
  OTP_EXPIRED: 'OTP has expired',
  OTP_MAX_ATTEMPTS: 'Maximum OTP verification attempts exceeded',
  TOO_MANY_OTP_REQUESTS: 'Too many OTP requests. Please try again later',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_BLOCKED: 'User account has been blocked',
  USER_INACTIVE: 'User account is inactive',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  PHONE_ALREADY_EXISTS: 'Phone number already exists',

  // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format. Use E.164 format',
  PHONE_REQUIRED: 'Phone number is required',
  EMAIL_REQUIRED: 'Email is required',

  // Google OAuth
  INVALID_GOOGLE_TOKEN: 'Invalid Google token',
  GOOGLE_EMAIL_NOT_FOUND: 'Email not found in Google account',

  // Generic
  INTERNAL_SERVER_ERROR: 'Internal server error. Please try again later',
  BAD_REQUEST: 'Bad request',
} as const;

export const SUCCESS_MESSAGES = {
  OTP_SENT_EMAIL: 'OTP sent to your email',
  OTP_SENT_PHONE: 'OTP sent to your phone',
  OTP_VERIFIED: 'OTP verified successfully',
  LOGGED_IN: 'Logged in successfully',
  LOGGED_OUT: 'Logged out successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',
} as const;
