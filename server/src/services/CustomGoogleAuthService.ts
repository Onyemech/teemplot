import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

const db = DatabaseFactory.getPrimaryDatabase();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_REDIRECT_URI!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const avatarUrl = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists
        let user = await db.findOne('users', { email });

        if (user) {
          // Update Google ID if not set
          if (!user.google_id) {
            await db.update('users', { google_id: googleId }, { id: user.id });
          }

          // Update last login
          await db.update('users', { last_login_at: new Date().toISOString() }, { id: user.id });

          return done(null, user);
        }

        // Create new user and company
        const userId = uuidv4();
        const companyId = uuidv4();
        const companySlug = slugify(`${firstName}-${lastName}-${Date.now()}`, { lower: true });

        // Create company
        await db.insert('companies', {
          id: companyId,
          name: `${firstName} ${lastName}'s Company`,
          slug: companySlug,
          email: email,
          subscription_plan: 'trial',
          subscription_status: 'active',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          onboarding_completed: 0,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Create user
        await db.insert('users', {
          id: userId,
          company_id: companyId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          google_id: googleId,
          role: 'owner',
          email_verified: 1, // Google emails are pre-verified
          is_active: 1,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        user = await db.findOne('users', { id: userId });

        logger.info({
          userId,
          companyId,
          email,
          provider: 'google'
        }, 'New user created via Google OAuth');

        return done(null, user);
      } catch (error: any) {
        logger.error({ err: error }, 'Google OAuth error');
        return done(error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.findOne('users', { id });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export class CustomGoogleAuthService {
  /**
   * Get Google OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    return response.json();
  }

  /**
   * Handle Google OAuth callback
   */
  async handleCallback(code: string): Promise<{
    user: any;
    isNewUser: boolean;
    requiresOnboarding: boolean;
  }> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);

      // Get user info
      const googleUser = await this.getUserInfo(tokens.access_token);

      const email = googleUser.email;
      const firstName = googleUser.given_name || '';
      const lastName = googleUser.family_name || '';
      const avatarUrl = googleUser.picture;
      const googleId = googleUser.id;

      if (!email) {
        throw new Error('No email found in Google profile');
      }

      // Check if user exists
      let user = await db.findOne('users', { email });
      let isNewUser = false;

      if (user) {
        // Update Google ID if not set
        if (!user.google_id) {
          await db.update('users', { google_id: googleId }, { id: user.id });
        }

        // Update last login
        await db.update('users', { last_login_at: new Date().toISOString() }, { id: user.id });
      } else {
        // Create new user and company
        isNewUser = true;
        const userId = uuidv4();
        const companyId = uuidv4();
        const companySlug = slugify(`${firstName}-${lastName}-${Date.now()}`, { lower: true });

        // Create company
        await db.insert('companies', {
          id: companyId,
          name: `${firstName} ${lastName}'s Company`,
          slug: companySlug,
          email: email,
          subscription_plan: 'trial',
          subscription_status: 'active',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          onboarding_completed: 0,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Create user
        await db.insert('users', {
          id: userId,
          company_id: companyId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          google_id: googleId,
          role: 'owner',
          email_verified: 1,
          is_active: 1,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        user = await db.findOne('users', { id: userId });

        logger.info({
          userId,
          companyId,
          email,
          provider: 'google'
        }, 'New user created via Google OAuth');
      }

      // Check if onboarding is completed
      const company = await db.findOne('companies', { id: user.company_id });
      const requiresOnboarding = !company?.onboarding_completed;

      return {
        user,
        isNewUser,
        requiresOnboarding,
      };
    } catch (error: any) {
      logger.error({ err: error }, 'Google OAuth callback error');
      throw error;
    }
  }
}

export const customGoogleAuthService = new CustomGoogleAuthService();
export { passport };
