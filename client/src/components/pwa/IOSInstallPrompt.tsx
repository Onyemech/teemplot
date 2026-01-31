import { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';
import { isPWA, isMobile } from '../../utils/pwa';

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if it's already installed
    const isInstalled = isPWA();

    // Check if user has dismissed it before
    const hasDismissed = localStorage.getItem('ios_install_prompt_dismissed');

    // Show only on iOS, mobile, not installed, and not dismissed
    if (isIOS && isMobile() && !isInstalled && !hasDismissed) {
      // Show after a small delay to not annoy immediately
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('ios_install_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-8 bg-white border-t shadow-2xl animate-in slide-in-from-bottom duration-500">
      <div className="max-w-md mx-auto relative">
        <button 
          onClick={dismissPrompt}
          className="absolute -top-2 -right-2 p-1 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <img src="/logo.png" alt="Teemplot" className="w-12 h-12 rounded-xl shadow-sm" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Install Teemplot</h3>
            <p className="text-sm text-gray-600 mb-3">
              Install this app on your iPhone for the best experience.
            </p>
            
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-bold">1</span>
                <span>Tap the <Share className="inline w-4 h-4 mx-1" /> Share button below</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-bold">2</span>
                <span>Select <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow pointing down to the share button area on standard iOS Safari */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-40px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
      </div>
    </div>
  );
}
