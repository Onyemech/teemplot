import crypto from 'crypto';

export function generateInvitationToken(): string {
  // Generate a secure random token for invitation links
  return crypto.randomBytes(32).toString('hex');
}

export function generatePasswordResetToken(): string {
  // Generate a secure random token for password reset
  return crypto.randomBytes(32).toString('hex');
}

export function generateEmailVerificationToken(): string {
  // Generate a secure random token for email verification
  return crypto.randomBytes(16).toString('hex');
}

export function generateSecureId(length: number = 16): string {
  // Generate a secure random ID of specified length
  return crypto.randomBytes(length).toString('hex');
}