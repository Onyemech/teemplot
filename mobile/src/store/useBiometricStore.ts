import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricState {
  isBiometricSetupComplete: boolean;
  setBiometricSetupComplete: (value: boolean) => void;
  resetBiometricSetup: () => void;
}

export const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isBiometricSetupComplete: false,
      setBiometricSetupComplete: (value) => set({ isBiometricSetupComplete: value }),
      resetBiometricSetup: () => set({ isBiometricSetupComplete: false }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
