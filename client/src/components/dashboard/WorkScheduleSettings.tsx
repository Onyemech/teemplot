import { useState, useEffect } from 'react';
import { Calendar, Clock, Save, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface WorkSchedule {
    work_start_time: string;
    work_end_time: string;
    working_days: Record<string, boolean>; // e.g. { "1": true, "2": true ... } where 1=Monday
    timezone: string;
}

const DAYS = [
    { id: '1', label: 'Mon' },
    { id: '2', label: 'Tue' },
    { id: '3', label: 'Wed' },
    { id: '4', label: 'Thu' },
    { id: '5', label: 'Fri' },
    { id: '6', label: 'Sat' },
    { id: '0', label: 'Sun' },
];

export default function WorkScheduleSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
    const { success, error: showError } = useToast();

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/company-settings');
            if (response.data.success) {
                // Ensure defaults if null
                const data = response.data.data;
                setSchedule({
                    work_start_time: data.work_start_time || '09:00',
                    work_end_time: data.work_end_time || '17:00',
                    working_days: data.working_days || { '1': true, '2': true, '3': true, '4': true, '5': true },
                    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                });
            }
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
            showError('Failed to load schedule settings');
        } finally {
            setLoading(false);
        }
    };

    const handleDayToggle = (dayId: string) => {
        if (!schedule) return;
        setSchedule({
            ...schedule,
            working_days: {
                ...schedule.working_days,
                [dayId]: !schedule.working_days[dayId]
            }
        });
    };

    const getTimezoneOptions = () => {
        // Basic list of common timezones, in real app use a library or extensive list
        return [
            'UTC', 'Africa/Lagos', 'Europe/London', 'Europe/Paris', 'America/New_York', 'Asia/Dubai', 'Asia/Singapore'
        ];
    };

    const saveSettings = async () => {
        if (!schedule) return;

        try {
            setSaving(true);
            const response = await apiClient.patch('/api/company-settings/work-schedule', {
                workStartTime: schedule.work_start_time,
                workEndTime: schedule.work_end_time,
                workingDays: schedule.working_days,
                timezone: schedule.timezone
            });

            if (response.data.success) {
                success('Work schedule updated successfully');
            }
        } catch (error) {
            console.error('Failed to save schedule:', error);
            showError('Failed to update work schedule');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!schedule) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Calendar className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Work Schedule</h3>
                        <p className="text-sm text-gray-500">Define working days and hours for accurate attendance tracking</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Working Days */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => {
                            const isSelected = !!schedule.working_days[day.id];
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => handleDayToggle(day.id)}
                                    disabled={saving}
                                    className={`
                            w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                            ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                        `}
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Employees expected to clock in on these days.</p>
                </div>

                {/* Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (Clock In)</label>
                        <div className="relative">
                            <input
                                type="time"
                                value={schedule.work_start_time}
                                onChange={(e) => setSchedule({ ...schedule, work_start_time: e.target.value })}
                                disabled={saving}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time (Clock Out)</label>
                        <div className="relative">
                            <input
                                type="time"
                                value={schedule.work_end_time}
                                onChange={(e) => setSchedule({ ...schedule, work_end_time: e.target.value })}
                                disabled={saving}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Timezone</label>
                    <select
                        value={schedule.timezone}
                        onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {getTimezoneOptions().map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                        {/* Fallback if current one isn't in top list */}
                        {!getTimezoneOptions().includes(schedule.timezone) && (
                            <option value={schedule.timezone}>{schedule.timezone}</option>
                        )}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">All attendance records will be recorded in this timezone.</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}
