import { AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TooManyRequestsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gray-100">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Too Many Requests</h1>
        
        <p className="text-gray-500 mb-6">
          We've detected an unusual amount of activity from your device. 
          To keep our service stable and secure, we've temporarily paused your access.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-8 text-left flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Please wait a few minutes</p>
            <p>Your access will be restored automatically. Trying again too soon may extend the wait time.</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        
        <p className="mt-6 text-xs text-gray-400">
          Error Code: 429 | Rate Limit Exceeded
        </p>
      </div>
    </div>
  );
}
