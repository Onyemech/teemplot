import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { randomUUID } from 'crypto';

export interface BiometricRegistrationOptions {
  userId: string;
  companyId: string;
  deviceName?: string;
  deviceType?: 'fingerprint' | 'face' | 'voice' | 'iris';
}

export interface BiometricVerificationOptions {
  userId: string;
  companyId: string;
  credentialId: string;
  challenge: string;
  response: any;
}

export interface BiometricAuthOptions {
  userId: string;
  companyId: string;
  deviceType?: 'fingerprint' | 'face' | 'voice' | 'iris';
}

export class WebAuthnService {
  private db = DatabaseFactory.getPrimaryDatabase();
  private rpName = 'Teemplot';
  private rpID = process.env.NODE_ENV === 'production' ? 'teemplot.com' : 'localhost';
  private origin = process.env.NODE_ENV === 'production' ? 'https://teemplot.com' : 'http://localhost:3000';

  /**
   * Generate registration options for WebAuthn
   */
  async generateRegistrationOptions(options: BiometricRegistrationOptions) {
    try {
      const user = await this.db.findOne('users', { id: options.userId, company_id: options.companyId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has biometrics enabled
      const existingCredentials = await this.db.find('webauthn_credentials', { 
        user_id: options.userId, 
        company_id: options.companyId,
        is_active: true 
      });

      const opts: GenerateRegistrationOptionsOpts = {
        rpName: this.rpName,
        rpID: this.rpID,
        userID: new TextEncoder().encode(options.userId),
        userName: user.email,
        userDisplayName: `${user.first_name} ${user.last_name}`,
        attestationType: 'none',
        excludeCredentials: existingCredentials.map(cred => ({
          id: cred.credential_id,
          type: 'public-key',
          transports: cred.transports || ['internal'],
        })),
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      };

      const registrationOptions = await generateRegistrationOptions(opts);

      // Store challenge in database
      const challengeId = randomUUID();
      await this.db.insert('webauthn_challenges', {
        id: challengeId,
        user_id: options.userId,
        company_id: options.companyId,
        challenge: registrationOptions.challenge,
        challenge_type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      logger.info({
        userId: options.userId,
        companyId: options.companyId,
        challengeId,
        deviceType: options.deviceType,
      }, 'WebAuthn registration options generated');

      return {
        options: registrationOptions,
        challengeId,
      };
    } catch (error) {
      logger.error({ error, userId: options.userId, companyId: options.companyId }, 'Failed to generate registration options');
      throw error;
    }
  }

  /**
   * Verify registration response and store credential
   */
  async verifyRegistration(options: BiometricVerificationOptions) {
    try {
      // Get challenge from database
      const challenge = await this.db.findOne('webauthn_challenges', { 
        id: options.challenge, 
        user_id: options.userId,
        company_id: options.companyId,
        challenge_type: 'registration',
        used: false 
      });

      if (!challenge || new Date(challenge.expires_at) < new Date()) {
        throw new Error('Invalid or expired challenge');
      }

      const opts: VerifyRegistrationResponseOpts = {
        response: options.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      };

      const verification = await verifyRegistrationResponse(opts);

      if (!verification.verified) {
        throw new Error('Registration verification failed');
      }

      const credential = verification.registrationInfo!.credential;

      // Store credential in database
      const credentialId = randomUUID();
      await this.db.insert('webauthn_credentials', {
        id: credentialId,
        user_id: options.userId,
        company_id: options.companyId,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        credential_type: 'public-key',
        transports: options.response.response.transports || ['internal'],
        device_name: 'Biometric Device',
        device_type: 'fingerprint',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mark challenge as used
      await this.db.update('webauthn_challenges', { used: true }, { id: challenge.id });

      // Update user's biometric status
      await this.db.update('users', { 
        biometric_enabled: true,
        last_biometric_used: new Date()
      }, { id: options.userId });

      logger.info({
        userId: options.userId,
        companyId: options.companyId,
        credentialId,
      }, 'WebAuthn registration completed successfully');

      return {
        success: true,
        credentialId,
        message: 'Biometric authentication registered successfully',
      };
    } catch (error) {
      logger.error({ error, userId: options.userId, companyId: options.companyId }, 'Registration verification failed');
      throw error;
    }
  }

  /**
   * Generate authentication options for WebAuthn
   */
  async generateAuthenticationOptions(options: BiometricAuthOptions) {
    try {
      // Get user's credentials
      const credentials = await this.db.find('webauthn_credentials', { 
        user_id: options.userId, 
        company_id: options.companyId,
        is_active: true 
      });

      if (credentials.length === 0) {
        throw new Error('No biometric credentials found for user');
      }

      const opts: GenerateAuthenticationOptionsOpts = {
        rpID: this.rpID,
        allowCredentials: credentials.map(cred => ({
          id: cred.credential_id,
          transports: cred.transports || ['internal'],
        })),
        userVerification: 'preferred',
      };

      const authenticationOptions = await generateAuthenticationOptions(opts);

      // Store challenge in database
      const challengeId = randomUUID();
      await this.db.insert('webauthn_challenges', {
        id: challengeId,
        user_id: options.userId,
        company_id: options.companyId,
        challenge: authenticationOptions.challenge,
        challenge_type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      logger.info({
        userId: options.userId,
        companyId: options.companyId,
        challengeId,
      }, 'WebAuthn authentication options generated');

      return {
        options: authenticationOptions,
        challengeId,
      };
    } catch (error) {
      logger.error({ error, userId: options.userId, companyId: options.companyId }, 'Failed to generate authentication options');
      throw error;
    }
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(options: BiometricVerificationOptions) {
    try {
      // Get challenge from database
      const challenge = await this.db.findOne('webauthn_challenges', { 
        id: options.challenge, 
        user_id: options.userId,
        company_id: options.companyId,
        challenge_type: 'authentication',
        used: false 
      });

      if (!challenge || new Date(challenge.expires_at) < new Date()) {
        throw new Error('Invalid or expired challenge');
      }

      // Get credential from database
      const credential = await this.db.findOne('webauthn_credentials', { 
        credential_id: options.credentialId,
        user_id: options.userId,
        company_id: options.companyId,
        is_active: true 
      });

      if (!credential) {
        throw new Error('Credential not found');
      }

      const opts: VerifyAuthenticationResponseOpts = {
        response: options.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credential_id,
          publicKey: Buffer.from(credential.public_key, 'base64'),
          counter: credential.counter,
          transports: credential.transports || ['internal'],
        },
        requireUserVerification: false,
      };

      const verification = await verifyAuthenticationResponse(opts);

      if (!verification.verified) {
        throw new Error('Authentication verification failed');
      }

      // Update credential counter
      await this.db.update('webauthn_credentials', { 
        counter: verification.authenticationInfo!.newCounter,
        last_used_at: new Date()
      }, { id: credential.id });

      // Mark challenge as used
      await this.db.update('webauthn_challenges', { used: true }, { id: challenge.id });

      // Update user's last biometric usage
      await this.db.update('users', { 
        last_biometric_used: new Date()
      }, { id: options.userId });

      logger.info({
        userId: options.userId,
        companyId: options.companyId,
        credentialId: credential.id,
      }, 'WebAuthn authentication completed successfully');

      return {
        success: true,
        message: 'Biometric authentication successful',
      };
    } catch (error) {
      logger.error({ error, userId: options.userId, companyId: options.companyId }, 'Authentication verification failed');
      throw error;
    }
  }

  /**
   * Get user's biometric credentials
   */
  async getUserCredentials(userId: string, companyId: string) {
    try {
      const credentials = await this.db.find('webauthn_credentials', { 
        user_id: userId, 
        company_id: companyId,
        is_active: true 
      });

      return credentials.map(cred => ({
        id: cred.id,
        deviceName: cred.device_name,
        deviceType: cred.device_type,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
      }));
    } catch (error) {
      logger.error({ error, userId, companyId }, 'Failed to get user credentials');
      throw error;
    }
  }

  /**
   * Remove a biometric credential
   */
  async removeCredential(credentialId: string, userId: string, companyId: string) {
    try {
      const updatedRows = await this.db.update('webauthn_credentials', { 
        is_active: false,
        updated_at: new Date()
      }, { 
        id: credentialId,
        user_id: userId,
        company_id: companyId 
      });

      if (updatedRows.length === 0) {
        throw new Error('Credential not found or not owned by user');
      }

      // Check if user has any remaining active credentials
      const remainingCredentials = await this.db.find('webauthn_credentials', { 
        user_id: userId, 
        company_id: companyId,
        is_active: true 
      });

      // If no remaining credentials, disable biometric for user
      if (remainingCredentials.length === 0) {
        await this.db.update('users', { biometric_enabled: false }, { id: userId });
      }

      logger.info({
        credentialId,
        userId,
        companyId,
      }, 'WebAuthn credential removed successfully');

      return {
        success: true,
        message: 'Biometric credential removed successfully',
      };
    } catch (error) {
      logger.error({ error, credentialId, userId, companyId }, 'Failed to remove credential');
      throw error;
    }
  }

  /**
   * Check if user has biometric authentication enabled
   */
  async hasBiometricAuth(userId: string, companyId: string): Promise<boolean> {
    try {
      const user = await this.db.findOne('users', { id: userId, company_id: companyId });
      if (!user || !user.biometric_enabled) {
        return false;
      }

      const credentials = await this.db.find('webauthn_credentials', { 
        user_id: userId, 
        company_id: companyId,
        is_active: true 
      });

      return credentials.length > 0;
    } catch (error) {
      logger.error({ error, userId, companyId }, 'Failed to check biometric auth status');
      return false;
    }
  }
}

export const webAuthnService = new WebAuthnService();
