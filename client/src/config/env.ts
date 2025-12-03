/**
 * Environment Configuration
 * 
 * SECURITY NOTE:
 * All VITE_ prefixed variables are exposed to the browser.
 * This is intentional and safe for:
 * - API URLs (public endpoints)
 * - Supabase Anon Key (designed to be public, protected by RLS)
 * - Google Maps API Key (restrict by domain in Google Console)
 * - OAuth Client IDs (meant to be public)
 * 
 * NEVER store secrets here:
 * - Database passwords
 * - Service role keys
 * - Private API keys
 * - JWT secrets
 */

interface EnvConfig {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  
  // Supabase (Public keys only)
  supabase: {
    url: string;
    anonKey: string;
  };
  
  // Google Services (Public keys only)
  google: {
    clientId: string;
    mapsApiKey: string;
  };
  
  // Application
  app: {
    name: string;
    url: string;
    environment: 'development' | 'production' | 'staging';
  };
  
  // Feature Flags
  features: {
    googleAuth: boolean;
    mfa: boolean;
  };
}

// Validate required environment variables
function validateEnv(): void {
  const required = [
    'VITE_API_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    // Don't throw in production to allow graceful degradation
    if (import.meta.env.DEV) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Validate on module load
validateEnv();

// Export typed configuration
export const env: EnvConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  apiTimeout: 30000, // 30 seconds
  
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },
  
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Teemplot',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    environment: (import.meta.env.MODE as any) || 'development',
  },
  
  features: {
    googleAuth: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
    mfa: import.meta.env.VITE_ENABLE_MFA === 'true',
  },
};

// Helper to check if we're in development
export const isDevelopment = env.app.environment === 'development';
export const isProduction = env.app.environment === 'production';

// Helper to get full API URL with path
export function getApiUrl(path: string = ''): string {
  const baseUrl = env.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
}

// Export for backward compatibility
export const API_URL = env.apiUrl;

export default env;
