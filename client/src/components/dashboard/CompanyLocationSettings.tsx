import { useState, useEffect } from 'react';
import { MapPin, Clock, Save, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

interface LocationSettings {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  last_updated_at: string;
  can_update: boolean;
  next_update_available_at: string | null;
}

export default function CompanyLocationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
    city: ''
  });

  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchLocationSettings();
  }, []);

  const fetchLocationSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/company-settings/location');
      if (response.data.success) {
        setSettings({
          ...response.data.data,
          latitude: parseFloat(response.data.data.latitude || '0'),
          longitude: parseFloat(response.data.data.longitude || '0')
        });
        setFormData({
          address: response.data.data.address || '',
          latitude: parseFloat(response.data.data.latitude || '0'),
          longitude: parseFloat(response.data.data.longitude || '0'),
          radius: response.data.data.geofence_radius_meters || 100,
          city: ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch location settings:', error);
      showError('Failed to load location settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings?.can_update) {
      showError('Location updates are currently restricted');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.patch('/api/company-settings/location', {
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        geofenceRadius: formData.radius
      });

      if (response.data.success) {
        success('Company location updated successfully');
        const updatedData = response.data.data;
        setSettings({
          ...updatedData,
          latitude: parseFloat(updatedData.latitude || '0'),
          longitude: parseFloat(updatedData.longitude || '0')
        });
        setEditMode(false);
      }
    } catch (error: any) {
      console.error('Failed to update location:', error);
      showError(error.response?.data?.message || 'Failed to update location');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const daysUntilUpdate = settings?.next_update_available_at
    ? Math.ceil((new Date(settings.next_update_available_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Head Office Location</h3>
              <p className="text-sm text-gray-500">Primary location for attendance geofencing</p>
            </div>
          </div>
          {!editMode && settings?.can_update && (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Edit Location
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Restriction Notice */}
        {!settings?.can_update && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Update Restricted</h4>
              <p className="text-sm text-amber-700 mt-1">
                For security reasons, the company location can only be updated once every 7 days.
                Next update available in {daysUntilUpdate} days.
              </p>
            </div>
          </div>
        )}

        {/* Location Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Office Address
            </label>
            {editMode ? (
              <AddressAutocomplete
                value={formData.address}
                cityValue={formData.city}
                onCityChange={(city) => setFormData(prev => ({ ...prev, city }))}
                onChange={(address, data) => {
                  if (data) {
                    setFormData(prev => ({
                      ...prev,
                      address,
                      latitude: data.latitude,
                      longitude: data.longitude
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, address }));
                  }
                }}
                placeholder="Search for your office address..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                {settings?.address || 'No address configured'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <div className="p-3 bg-gray-50 rounded-lg text-gray-500 font-mono text-sm border border-gray-200">
                {editMode ? Number(formData.latitude).toFixed(6) : Number(settings?.latitude || 0).toFixed(6)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <div className="p-3 bg-gray-50 rounded-lg text-gray-500 font-mono text-sm border border-gray-200">
                {editMode ? Number(formData.longitude).toFixed(6) : Number(settings?.longitude || 0).toFixed(6)}
              </div>
            </div>
          </div>

          {editMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geofence Radius (meters)
              </label>
              <input
                type="number"
                min="50"
                max="500"
                value={formData.radius}
                onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 100m - 300m</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {editMode && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setEditMode(false);
                // Reset form
                if (settings) {
                  setFormData({
                    address: settings.address,
                    latitude: settings.latitude,
                    longitude: settings.longitude,
                    radius: settings.geofence_radius_meters,
                    city: ''
                  });
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.latitude || !formData.longitude}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Location
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
