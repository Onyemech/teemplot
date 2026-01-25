import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { permissionManager, PlatformType } from '@/utils/PermissionManager';

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const platform = permissionManager.getPlatformInfo();
    // Check if running on iOS Safari (not in standalone PWA mode)
    const isIosSafari = platform.type === PlatformType.IOS_SAFARI;
    // Check if user has already dismissed it recently
    const hasDismissed = localStorage.getItem('ios_install_prompt_dismissed');

    if (isIosSafari && !hasDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    // Hide for 7 days
    localStorage.setItem('ios_install_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] z-[100] pb-safe animate-slide-up">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Install Teemplot App</h3>
            <p className="text-sm text-gray-600 mt-1">
              Install this application on your home screen for a better experience and notifications.
            </p>
          </div>
          <button onClick={handleDismiss} className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2">
            <span>Tap</span>
            <Share className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-gray-400">|</span>
          <div className="flex items-center gap-2">
            <span>Select</span>
            <span className="font-medium whitespace-nowrap">Add to Home Screen</span>
            <PlusSquare className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
