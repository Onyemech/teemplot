import MultiClockinManager from '@/components/dashboard/MultiClockinManager'

export default function MultipleClockInPage() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Multiple Clock-In Management</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Configure multiple clock-in locations for your company
                </p>
            </div>

            <MultiClockinManager />
        </div>
    )
}
