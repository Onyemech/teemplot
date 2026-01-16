import RemoteClockinManager from '@/components/dashboard/RemoteClockinManager';
import { Card } from '@/components/ui/Card';

export default function RemoteClockinPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-gray-900">Remote Clocking</h1>
                <p className="text-gray-500">Manage remote work permissions for your team members.</p>
            </div>

            <Card className="p-6">
                <RemoteClockinManager />
            </Card>
        </div>
    );
}
