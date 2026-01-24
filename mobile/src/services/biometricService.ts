import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

export const biometricService = {
  /**
   * Check if the device has biometric hardware and if any biometrics are enrolled
   */
  async checkHardwareAndEnrollment() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    return {
      hasHardware,
      isEnrolled,
      isAvailable: hasHardware && isEnrolled
    };
  },

  /**
   * Get the types of biometrics supported by the device
   */
  async getSupportedTypes() {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris';
        default:
          return 'Biometrics';
      }
    });
  },

  /**
   * Authenticate using biometrics with fallback to device passcode
   */
  async authenticate(promptMessage: string = 'Authenticate to continue') {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allows falling back to device PIN/Pattern
      });

      return {
        success: result.success,
        error: result.error,
        warning: result.warning
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: 'unknown' };
    }
  }
};
