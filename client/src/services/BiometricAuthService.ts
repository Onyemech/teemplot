import { apiClient } from '@/lib/api'

export interface BiometricAuthResult {
  success: boolean
  method?: 'face' | 'fingerprint' | 'password'
  token?: string
  error?: string
  fallbackRequired?: boolean
}

export class BiometricAuthService {
  private static instance: BiometricAuthService
  
  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService()
    }
    return BiometricAuthService.instance
  }

  async checkBiometricSupport(): Promise<{
    supported: boolean
    methods: string[]
    error?: string
  }> {
    try {
      const methods: string[] = []
      
      // Check WebAuthn support
      if (window.PublicKeyCredential) {
        methods.push('webauthn')
        
        // Check platform authenticator
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (available) {
          methods.push('platform-authenticator')
        }
      }
      
      // Device-specific checks
      const userAgent = navigator.userAgent
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        methods.push('touchid', 'faceid')
      } else if (userAgent.includes('Android')) {
        methods.push('fingerprint', 'face')
      } else if (userAgent.includes('Windows')) {
        methods.push('windows-hello')
      }
      
      return {
        supported: methods.length > 0,
        methods
      }
    } catch (error: any) {
      return {
        supported: false,
        methods: [],
        error: error.message
      }
    }
  }

  async authenticateWithBiometric(email: string): Promise<BiometricAuthResult> {
    try {
      // First check if user has biometric enrolled
      const statusResponse = await apiClient.post('/api/auth/biometric/check', { email })
      
      if (!statusResponse.data.success || !statusResponse.data.enrolled) {
        return {
          success: false,
          fallbackRequired: true,
          error: 'Biometric authentication not enrolled. Please use password.'
        }
      }

      // Generate challenge for authentication
      const challengeResponse = await apiClient.post('/api/auth/biometric/challenge', { email })
      
      if (!challengeResponse.data.success) {
        throw new Error('Failed to generate authentication challenge')
      }

      const { challenge, allowCredentials } = challengeResponse.data

      // Perform WebAuthn authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(challenge),
          allowCredentials: allowCredentials.map((cred: any) => ({
            id: new Uint8Array(cred.id),
            type: 'public-key'
          })),
          userVerification: 'required',
          timeout: 30000
        }
      }) as PublicKeyCredential

      if (!credential) {
        throw new Error('Biometric authentication failed')
      }

      // Verify authentication with backend
      const verifyResponse = await apiClient.post('/api/auth/biometric/verify', {
        email,
        credentialId: credential.id,
        authenticatorData: Array.from(new Uint8Array((credential.response as any).authenticatorData)),
        signature: Array.from(new Uint8Array((credential.response as any).signature)),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
      })

      if (verifyResponse.data.success) {
        // Log successful authentication
        await this.logBiometricAttempt(email, 'authentication', true)
        
        return {
          success: true,
          method: 'fingerprint', // or determine from credential
          token: verifyResponse.data.token
        }
      } else {
        throw new Error(verifyResponse.data.message || 'Authentication verification failed')
      }

    } catch (error: any) {
      console.error('Biometric authentication error:', error)
      
      // Log failed attempt
      await this.logBiometricAttempt(email, 'authentication', false, error.message)
      
      // Determine if fallback is needed
      const fallbackRequired = error.name === 'NotAllowedError' || 
                              error.name === 'NotSupportedError' ||
                              error.message.includes('not enrolled')

      return {
        success: false,
        fallbackRequired,
        error: this.getFriendlyErrorMessage(error)
      }
    }
  }

  private async logBiometricAttempt(
    email: string, 
    action: string, 
    success: boolean, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await apiClient.post('/api/auth/biometric/log', {
        email,
        action,
        success,
        errorMessage,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.warn('Failed to log biometric attempt:', error)
    }
  }

  private getFriendlyErrorMessage(error: any): string {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Biometric authentication was cancelled. Please try again or use your password.'
      case 'NotSupportedError':
        return 'Biometric authentication is not supported on this device. Please use your password.'
      case 'InvalidStateError':
        return 'Biometric sensor is busy. Please wait a moment and try again.'
      case 'SecurityError':
        return 'Security error occurred. Please ensure you\'re using a secure connection.'
      case 'NetworkError':
        return 'Network error occurred. Please check your connection and try again.'
      default:
        return error.message || 'Biometric authentication failed. Please use your password.'
    }
  }

  async resetBiometricData(userId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/employees/biometric/${userId}`)
      return response.data.success
    } catch (error) {
      console.error('Failed to reset biometric data:', error)
      return false
    }
  }
}

export const biometricAuthService = BiometricAuthService.getInstance()