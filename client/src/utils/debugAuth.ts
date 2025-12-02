
export const debugAuth = () => {
  // Only run in development mode
  const isDev = import.meta.env.MODE === 'development';
  
  if (!isDev) {
    console.warn('🔒 Debug auth is disabled in production');
    return { status: '🔒 Disabled in production' };
  }
  
  console.group('🔍 Authentication Debug (DEV ONLY)');
  
  const onboardingAuth = sessionStorage.getItem('onboarding_auth');
  console.log('📦 sessionStorage.onboarding_auth:', onboardingAuth ? '✅ Present' : '❌ Missing');
  if (onboardingAuth) {
    try {
      const parsed = JSON.parse(onboardingAuth);
      console.log('  ├─ email:', parsed.email ? parsed.email.replace(/(.{3}).*(@.*)/, '$1***$2') : '❌ Missing');
      console.log('  ├─ userId:', parsed.userId ? '✅ Present' : '❌ Missing');
      console.log('  ├─ companyId:', parsed.companyId ? '✅ Present' : '❌ Missing');
      console.log('  ├─ token:', parsed.token ? '✅ Present' : '❌ Missing');
      console.log('  └─ isGoogleAuth:', parsed.isGoogleAuth);
      
      // NEVER log actual token values, even in development
    } catch (e) {
      console.error('  ❌ Failed to parse:', e);
    }
  } else {
    console.log('  ❌ Not found');
  }
  
  // Check localStorage
  const authToken = localStorage.getItem('auth_token');
  console.log('\n📦 localStorage.auth_token:', authToken ? '✅ Present' : '❌ Missing');
  // NEVER log actual token values
  
  const user = localStorage.getItem('user');
  console.log('📦 localStorage.user:', user ? '✅ Present' : '❌ Missing');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      console.log('  ├─ id:', parsed.id);
      console.log('  ├─ email:', parsed.email);
      console.log('  ├─ role:', parsed.role);
      console.log('  └─ companyId:', parsed.companyId);
    } catch (e) {
      console.error('  ❌ Failed to parse:', e);
    }
  }
  
  console.groupEnd();
  
  // Return summary
  const hasSessionToken = onboardingAuth && JSON.parse(onboardingAuth).token;
  const hasLocalToken = !!authToken;
  
  return {
    status: hasSessionToken || hasLocalToken ? '✅ Token found' : '❌ No token',
    sessionToken: !!hasSessionToken,
    localToken: !!hasLocalToken,
    recommendation: !hasSessionToken && !hasLocalToken 
      ? '⚠️ Clear storage and re-register: sessionStorage.clear(); localStorage.clear();'
      : '✅ Authentication looks good'
  };
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}

/**
 * Clear all auth data (useful for testing)
 */
export const clearAuth = () => {
  sessionStorage.clear();
  localStorage.clear();
  console.log('✅ All storage cleared. Please re-register.');
};

if (typeof window !== 'undefined') {
  (window as any).clearAuth = clearAuth;
}
