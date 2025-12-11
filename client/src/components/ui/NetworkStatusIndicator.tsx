import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function NetworkStatusIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show indicator when offline or slow connection (and not dismissed)
    if ((!isOnline || isSlowConnection) && !isDismissed) {
      setShowIndicator(true);
      setIsReconnecting(false);
    } else if (showIndicator && isOnline && !isSlowConnection) {
      // When connection is restored, show "reconnecting" briefly
      setIsReconnecting(true);
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setIsReconnecting(false);
        setIsDismissed(false); // Reset dismiss state when connection is restored
      }, 1500); // Hide after 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection, showIndicator, isDismissed]);

  // Reset dismiss state when going offline again
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowIndicator(false);
  };

  if (!showIndicator) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 max-w-sm rounded-lg shadow-lg border transition-all duration-300 ${
        isReconnecting
          ? 'bg-green-50 border-green-200 text-green-800'
          : !isOnline
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="p-3 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isReconnecting ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : !isOnline ? (
            <WifiOff className="w-4 h-4 text-red-600" />
          ) : (
            <Wifi className="w-4 h-4 text-amber-600 animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isReconnecting
              ? 'Connection restored'
              : !isOnline
              ? 'No internet connection'
              : 'Slow connection detected'
            }
          </p>
          {!isReconnecting && (
            <p className="text-xs mt-1 opacity-75">
              {!isOnline
                ? 'Please check your network and try again'
                : 'Some features may be slower than usual'
              }
            </p>
          )}
        </div>

        {!isReconnecting && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
