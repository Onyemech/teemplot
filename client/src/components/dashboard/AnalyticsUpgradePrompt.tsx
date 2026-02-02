export default function AnalyticsUpgradePrompt() {
  return (
    <div className="min-h-[70vh] bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Analytics is a Gold feature</h2>
          <p className="mt-2 text-gray-600">
            Unlock real-time attendance + task delivery insights, department filters, and a performance leaderboard.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-3">
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="md:col-span-2 h-64 rounded-xl bg-gray-100" />
            <div className="h-64 rounded-xl bg-gray-100" />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-md" />

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Upgrade to Gold</h3>
                <p className="mt-2 text-sm text-gray-600">
                  See who’s on time, who’s overdue, and how performance trends are changing month-to-month.
                </p>
                <a
                  href="/dashboard/settings/billing"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#0F5D5D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B4A4A] transition-colors"
                >
                  Upgrade & Unlock Analytics
                </a>
                <p className="mt-3 text-xs text-gray-500">
                  Already on Gold? Refresh after upgrade or contact support if access doesn’t update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
