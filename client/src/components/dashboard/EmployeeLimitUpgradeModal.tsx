import { useState } from 'react';
import { X, Users, CreditCard } from 'lucide-react';

interface EmployeeLimitUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  currentPlan: string;
  pricePerEmployee: number;
  currency: string;
  onUpgrade: (additionalEmployees: number) => Promise<void>;
}

export default function EmployeeLimitUpgradeModal({
  isOpen,
  onClose,
  currentLimit,
  currentPlan,
  pricePerEmployee,
  currency,
  onUpgrade
}: EmployeeLimitUpgradeModalProps) {
  const [additionalEmployees, setAdditionalEmployees] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const totalCost = additionalEmployees * pricePerEmployee;
  const newLimit = currentLimit + additionalEmployees;

  // Format plan name for display
  const planName = currentPlan
    .replace('_', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await onUpgrade(additionalEmployees);
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upgrade Employee Limit</h2>
              <p className="text-sm text-gray-600">Add more team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Plan</span>
              <span className="text-sm font-semibold text-gray-900">{planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Employee Limit</span>
              <span className="text-sm font-semibold text-gray-900">{currentLimit} employees</span>
            </div>
          </div>

          {/* Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many additional employees do you need?
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdditionalEmployees(Math.max(1, additionalEmployees - 1))}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center font-bold text-gray-700"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={additionalEmployees}
                onChange={(e) => setAdditionalEmployees(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="flex-1 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg py-2 focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setAdditionalEmployees(Math.min(100, additionalEmployees + 1))}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center font-bold text-gray-700"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can add between 1 and 100 employees at a time
            </p>
          </div>

          {/* Calculation */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Additional Employees</span>
                <span className="font-medium text-gray-900">{additionalEmployees}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Price per Employee</span>
                <span className="font-medium text-gray-900">
                  {currency === 'NGN' ? '₦' : '$'}{pricePerEmployee.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total Cost</span>
                  <span className="text-2xl font-bold text-primary">
                    {currency === 'NGN' ? '₦' : '$'}{totalCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* New Limit Preview */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-900">New Employee Limit</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{newLimit} employees</p>
            <p className="text-sm text-green-700 mt-1">
              You'll be able to invite {newLimit - 1} additional team members
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary rounded-lg font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Proceed to Payment
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-center text-gray-500">
            You'll be redirected to a secure payment page to complete your upgrade
          </p>
        </div>
      </div>
    </div>
  );
}
