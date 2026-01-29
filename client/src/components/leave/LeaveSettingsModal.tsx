import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface LeaveType {
  name: string;
  paid: boolean;
  color?: string;
}

interface LeaveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaveSettingsModal({ isOpen, onClose }: LeaveSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [annualLeaveDays, setAnnualLeaveDays] = useState(20);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [newType, setNewType] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/company-settings/leave-policy');
      if (res.data.success) {
        setAnnualLeaveDays(res.data.data.annualLeaveDays);
        setLeaveTypes(res.data.data.leaveTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/api/company-settings/leave-policy', {
        annualLeaveDays,
        leaveTypes
      });
      onClose();
    } catch (error) {
      console.error('Failed to save leave policy:', error);
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    if (!newType.trim()) return;
    setLeaveTypes([...leaveTypes, { name: newType.trim(), paid: true }]);
    setNewType('');
  };

  const removeType = (index: number) => {
    const newTypes = [...leaveTypes];
    newTypes.splice(index, 1);
    setLeaveTypes(newTypes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-900">Leave Policy Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading settings...</div>
          ) : (
            <>
              {/* Annual Leave Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Leave Allowance (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={annualLeaveDays}
                  onChange={(e) => setAnnualLeaveDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-[#0F5D5D] outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default annual leave days allocated to each employee per year.
                </p>
              </div>

              {/* Leave Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Leave Types
                </label>
                <div className="space-y-3 mb-3">
                  {leaveTypes.map((type, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex-1 font-medium text-gray-900">{type.name}</div>
                      <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                        {type.paid ? 'Paid' : 'Unpaid'}
                      </div>
                      <button
                        onClick={() => removeType(index)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {leaveTypes.length === 0 && (
                    <div className="text-sm text-gray-500 italic text-center py-2">
                      No custom types defined.
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="New leave type (e.g. Paternity)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-[#0F5D5D] outline-none text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addType()}
                  />
                  <button
                    onClick={addType}
                    disabled={!newType.trim()}
                    className="bg-[#0F5D5D] text-white px-3 py-2 rounded-lg hover:bg-[#0a4545] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0F5D5D] rounded-lg hover:bg-[#0a4545] disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
