import { useState } from 'react';
import { MapPin } from 'lucide-react';
// import { useUser } from '../../contexts/UserContext';

interface LocationVerificationModalProps {
  onVerify: (location: { latitude: number; longitude: number }) => Promise<void>;
  isOpen: boolean;
}

export default function LocationVerificationModal({ onVerify, isOpen }: LocationVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await onVerify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        } catch {
          setError('Failed to verify location. Please try again.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Unable to retrieve your location. Please allow location access.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Location Verification</h3>
          <p className="text-sm text-gray-500 px-4">
            It's time to verify your location. This helps ensure accurate attendance tracking.
            Please confirm your current location.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-[#0F5D5D] text-white font-bold hover:bg-[#0a4545] transition-colors shadow-lg shadow-teal-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify Location</span>
          )}
        </button>
      </div>
    </div>
  );
}
