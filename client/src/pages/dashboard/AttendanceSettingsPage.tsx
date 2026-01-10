import { useState } from 'react';
import MultiClockinManager from '../../components/dashboard/MultiClockinManager';
import { MapPin, Settings } from 'lucide-react';

export default function AttendanceSettingsPage() {
  const [activeTab, setActiveTab] = useState<'multi-clockin' | 'general'>('multi-clockin');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Settings</h1>
          <p className="text-gray-500">Configure attendance policies and clock-in locations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('multi-clockin')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'multi-clockin'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <MapPin className="w-4 h-4" />
            Multiple Clock-in Setup
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Settings className="w-4 h-4" />
            General Policies
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'multi-clockin' && (
          <MultiClockinManager />
        )}
        
        {activeTab === 'general' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">General Policies</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              Advanced attendance policies (grace periods, overtime rules) are coming soon.
              Please check back later or contact support for early access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
