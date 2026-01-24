import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface QueuedAction {
  id: string;
  type: 'clockIn' | 'clockOut';
  timestamp: string;
  data: any;
}

const QUEUE_KEY = 'offline_attendance_queue';

export const offlineQueue = {
  /**
   * Add an action to the offline queue
   */
  async enqueue(type: 'clockIn' | 'clockOut', data: any) {
    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: QueuedAction[] = queueStr ? JSON.parse(queueStr) : [];
      
      const newAction: QueuedAction = {
        id: Math.random().toString(36).substring(7),
        type,
        timestamp: new Date().toISOString(),
        data,
      };
      
      queue.push(newAction);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log('Action queued offline:', newAction.id);
      return true;
    } catch (error) {
      console.error('Failed to enqueue action:', error);
      return false;
    }
  },

  /**
   * Get all queued actions
   */
  async getQueue(): Promise<QueuedAction[]> {
    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  },

  /**
   * Clear the queue after successful sync
   */
  async clearQueue() {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }
};
