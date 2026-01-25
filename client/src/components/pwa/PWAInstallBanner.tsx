import { useState, useEffect } from 'react';
import { Share, PlusSquare, Smartphone } from 'lucide-react';
import { permissionManager, PlatformType } from '@/utils/PermissionManager';

export default function PWAInstallBanner() {
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    const platform = permissionManager.getPlatformInfo();
    setIsIosSafari(platform.type === PlatformType.IOS_SAFARI);
  }, []);

  if (!isIosSafari) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm text-primary hidden md:block">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Install App for Best Experience</h3>
          <p className="text-sm text-gray-600 mb-3">
            To invite employees and manage your team effectively, please install the Teemplot app on your device.
          </p>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 bg-white/50 p-2.5 rounded-lg border border-primary/10 w-fit">
            <span className="flex items-center gap-2">
              Tap <Share className="w-4 h-4 text-blue-500" />
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-2">
              Select <span className="font-medium">Add to Home Screen</span> <PlusSquare className="w-4 h-4 text-gray-600" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
