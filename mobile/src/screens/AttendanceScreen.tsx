import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useBiometricClockAuth } from '../hooks/useBiometricClockAuth';
import { SetupBiometricsModal } from '../components/SetupBiometricsModal';
import { useBiometricStore } from '../store/useBiometricStore';
import { useAuthStore } from '../store/useAuthStore';
import { Fingerprint, Clock, MapPin } from 'lucide-react-native';

export const AttendanceScreen: React.FC = () => {
  const { authenticateAndAction, loading, isBiometricsEnabled } = useBiometricClockAuth();
  const { isBiometricSetupComplete } = useBiometricStore();
  const { fetchCompanySettings, companySettings } = useAuthStore();
  
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);

  useEffect(() => {
    // Initial fetch of company settings
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    // Show setup modal if biometrics enabled but not setup yet
    // Biometric prompt should ONLY target regular employees
    const user = useAuthStore.getState().user;
    if (isBiometricsEnabled && !isBiometricSetupComplete && user?.role === 'employee') {
      setShowSetupModal(true);
    }
  }, [isBiometricsEnabled, isBiometricSetupComplete]);

  const handleClockAction = (type: 'clockIn' | 'clockOut') => {
    authenticateAndAction(type, async () => {
      // API call to record clock action
      // const response = await apiClient.post('/api/attendance/record', { type, timestamp: new Date() });
      
      console.log(`Successfully recorded ${type}`);
      setIsClockedIn(type === 'clockIn');
      alert(`Clocked ${type === 'clockIn' ? 'in' : 'out'} successfully!`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.timeContainer}>
          <Clock size={24} color="#0F5D5D" />
          <Text style={styles.timeText}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isClockedIn ? '#4CAF50' : '#757575' }]} />
          <Text style={styles.statusText}>{isClockedIn ? 'Clocked In' : 'Clocked Out'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.clockButton, isClockedIn ? styles.clockOutButton : styles.clockInButton]}
          onPress={() => handleClockAction(isClockedIn ? 'clockOut' : 'clockIn')}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Fingerprint size={24} color="#ffffff" />
              <Text style={styles.clockButtonText}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
            </>
          )}
        </TouchableOpacity>

        {isBiometricsEnabled && (
          <View style={styles.biometricIndicator}>
            <Fingerprint size={12} color="#757575" />
            <Text style={styles.biometricIndicatorText}>Biometric Clocking Active</Text>
          </View>
        )}
      </View>

      <SetupBiometricsModal 
        isVisible={showSetupModal} 
        onClose={() => setShowSetupModal(false)} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  date: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  card: {
    margin: 24,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 32,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  clockButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  clockInButton: {
    backgroundColor: '#0F5D5D',
  },
  clockOutButton: {
    backgroundColor: '#d32f2f',
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  biometricIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricIndicatorText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
});
