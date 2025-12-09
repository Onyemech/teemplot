import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string;
  downlink: number;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    effectiveType: 'unknown',
    downlink: 0,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const isOnline = navigator.onLine;
      let isSlowConnection = false;
      let effectiveType = 'unknown';
      let downlink = 0;

      if (connection) {
        effectiveType = connection.effectiveType || 'unknown';
        downlink = connection.downlink || 0;
        
        // Consider connection slow if:
        // - effectiveType is 'slow-2g' or '2g'
        // - downlink is less than 1 Mbps
        // - rtt (round trip time) is greater than 500ms
        isSlowConnection = 
          effectiveType === 'slow-2g' || 
          effectiveType === '2g' ||
          downlink < 1 ||
          (connection.rtt && connection.rtt > 500);
      }

      setNetworkStatus({
        isOnline,
        isSlowConnection,
        effectiveType,
        downlink,
      });
    };

    // Initial check
    updateNetworkStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
}
