import { useState } from 'react';
import MultiClockinManager from '../../components/dashboard/MultiClockinManager';
import AttendanceGeneralSettings from '../../components/dashboard/AttendanceGeneralSettings';
import CompanyLocationSettings from '../../components/dashboard/CompanyLocationSettings';
import { MapPin, Settings } from 'lucide-react';

export default function AttendanceSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'multi-clockin'>('general');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Setup</h1>
          <p className="text-gray-500">Configure auto-clockin, biometrics, and office locations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
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
            General Setup
          </button>
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
            Locations & Branches
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {activeTab === 'general' && (
          <>
            <CompanyLocationSettings />
            <AttendanceGeneralSettings />
          </>
        )}

        {activeTab === 'multi-clockin' && (
          <MultiClockinManager />
        )}
      </div>
    </div>
  );
}
