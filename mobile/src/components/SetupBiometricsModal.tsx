import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useBiometricStore } from '../store/useBiometricStore';
import { biometricService } from '../services/biometricService';
import { Fingerprint, ShieldCheck, X } from 'lucide-react-native';

interface SetupBiometricsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SetupBiometricsModal: React.FC<SetupBiometricsModalProps> = ({ isVisible, onClose }) => {
  const { setBiometricSetupComplete } = useBiometricStore();
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { isAvailable, hasHardware, isEnrolled } = await biometricService.checkHardwareAndEnrollment();

      if (!hasHardware) {
        alert("Your device doesn't support biometrics. We'll use your device PIN/password instead.");
        setBiometricSetupComplete(true); // Fallback to PIN is still "setup complete"
        onClose();
        return;
      }

      if (!isEnrolled) {
        alert('No biometrics enrolled. Go to device Settings > Security > Biometrics to set up, then try again.');
        return;
      }

      const result = await biometricService.authenticate('Set up biometric clocking');
      
      if (result.success) {
        setBiometricSetupComplete(true);
        alert('Setup complete! Use Face ID/fingerprint to clock in/out securely.');
        onClose();
      }
    } catch (error) {
      console.error('Setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    alert('Biometrics recommended for faster and more secure clocking.');
    setBiometricSetupComplete(true); // Mark as complete even if skipped to stop prompting
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#757575" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Fingerprint size={64} color="#0F5D5D" />
          </View>

          <Text style={styles.title}>Biometric Clocking Enabled</Text>
          <Text style={styles.description}>
            Your company has enabled biometric clocking. Use Face ID, Fingerprint, or your device PIN to clock in/out securely and faster.
          </Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <ShieldCheck size={20} color="#0F5D5D" />
              <Text style={styles.benefitText}>Enhanced Security</Text>
            </View>
            <View style={styles.benefitItem}>
              <ShieldCheck size={20} color="#0F5D5D" />
              <Text style={styles.benefitText}>Faster Clock-in/out</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSetup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Set Up Now'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  button: {
    width: '100%',
    backgroundColor: '#0F5D5D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
  },
});
