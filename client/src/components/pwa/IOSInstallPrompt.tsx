import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS and not already in PWA mode
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    // Only show if iOS and not installed
    if (isIOSDevice && !isStandalone) {
      // Delay showing to not be intrusive immediately
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-500">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <img src="/logo.png" alt="Teemplot" className="w-12 h-12 rounded-xl shadow-sm" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Install Teemplot App</h3>
            <p className="text-sm text-gray-600 mt-1">
              Install the app for faster access, offline mode, and a better experience.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Share className="w-4 h-4 text-blue-600" />
            </div>
            <span>Tap the <strong>Share</strong> button in the menu bar</span>
          </div>
          
          <div className="h-px bg-gray-100 w-full ml-11" />
          
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <PlusSquare className="w-4 h-4 text-gray-600" />
            </div>
            <span>Scroll down and select <strong>Add to Home Screen</strong></span>
          </div>
        </div>
      </div>
      
      {/* Triangle pointer pointing to the bottom center (approximate location of share button on iPhone) */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full w-4 h-4 bg-white rotate-45 border-r border-b border-gray-200 hidden md:hidden" /> 
      {/* Note: Precise pointing is hard across devices, better to keep it generic */}
    </div>
  );
}
