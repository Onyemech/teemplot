import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { biometricService } from '../services/biometricService';
import { useBiometricStore } from '../store/useBiometricStore';
import { Alert } from 'react-native';

export type ClockActionType = 'clockIn' | 'clockOut';

export const useBiometricClockAuth = () => {
  const [loading, setLoading] = useState(false);
  const { companySettings, user } = useAuthStore();
  const { isBiometricSetupComplete } = useBiometricStore();

  const authenticateAndAction = async (
    actionType: ClockActionType,
    onSuccess: () => Promise<void>
  ) => {
    // 1. Check if biometrics enabled for company
    const isBiometricsEnabled = companySettings?.biometrics_required ?? false;

    // 2. Biometric prompt should ONLY target regular employees
    if (user?.role !== 'employee') {
      await performAction(onSuccess);
      return;
    }

    if (!isBiometricsEnabled) {
      // Direct action if disabled
      await performAction(onSuccess);
      return;
    }

    // 2. Biometrics enabled - Try to authenticate
    setLoading(true);
    try {
      const promptMessage = `Clock ${actionType === 'clockIn' ? 'In' : 'Out'} with Face ID/Fingerprint`;
      const result = await biometricService.authenticate(promptMessage);

      if (result.success) {
        await performAction(onSuccess);
      } else {
        if (result.error === 'user_cancel') {
          // Silent fail on cancel
        } else {
          Alert.alert(
            'Authentication Failed',
            'Could not verify your identity. Please try again or use your device passcode.'
          );
        }
      }
    } catch (error) {
      console.error('Biometric clock auth error:', error);
      Alert.alert('Error', 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (onSuccess: () => Promise<void>) => {
    setLoading(true);
    try {
      await onSuccess();
      // Log successful authentication for admin if needed
      // await logBiometricUsage(user?.id, 'biometric_success');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    authenticateAndAction,
    loading,
    isBiometricsEnabled: companySettings?.biometric_clocking ?? false,
    isSetupComplete: isBiometricSetupComplete
  };
};
