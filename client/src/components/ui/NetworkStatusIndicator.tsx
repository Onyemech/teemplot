import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function NetworkStatusIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Show indicator when offline or slow connection
    if (!isOnline || isSlowConnection) {
      setShowIndicator(true);
      setIsReconnecting(false);
    } else if (showIndicator) {
      // When connection is restored, show "reconnecting" briefly
      setIsReconnecting(true);
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setIsReconnecting(false);
      }, 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection, showIndicator]);

  if (!showIndicator) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
        isReconnecting
          ? 'bg-green-500 text-white'
          : !isOnline
          ? 'bg-red-500 text-white'
          : 'bg-yellow-500 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isReconnecting ? (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>Connection restored</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>No internet connection</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>Slow connection detected</span>
        </>
      )}
    </div>
  );
}
