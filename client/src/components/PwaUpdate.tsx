
import React, { useState, useEffect } from 'react';

const PwaUpdate: React.FC = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleSwUpdate = (event: any) => {
      const registration = event.detail;
      if (registration && registration.waiting) {
        setWaitingWorker(registration.waiting);
        setIsUpdateAvailable(true);
      }
    };

    window.addEventListener('swUpdate', handleSwUpdate);

    return () => {
      window.removeEventListener('swUpdate', handleSwUpdate);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      setIsUpdating(true);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // Simulate progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
        }
      }, 100);
    }
  };

  return (
    <div>
      {isUpdateAvailable && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p style={{ margin: 0, color: '#212121' }}>A new version is available.</p>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: isUpdating ? '#e0e0e0' : '#0F5D5D',
              color: 'white',
              cursor: 'pointer',
              minWidth: '110px',
              minHeight: '44px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isUpdating ? 'Updating...' : 'Update Now'}
          </button>
          {isUpdating && (
            <div style={{ width: '100px' }}>
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#6B7280',
                    transition: 'width 0.1s linear',
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PwaUpdate;

