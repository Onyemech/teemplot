import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader } from 'lucide-react';

export default function BusinessInfoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    industry: '',
    numberOfEmployees: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postalCode: '',
    latitude: '',
    longitude: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Hospitality',
    'Construction',
    'Transportation',
    'Agriculture',
    'Real Estate',
    'Media & Entertainment',
    'Professional Services',
    'Other'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        setFetchingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get location. Please enter manually or try again.');
        setFetchingLocation(false);
      }
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName || formData.companyName.length < 2) {
      newErrors.companyName = 'Company name must be at least 2 characters';
    }

    if (!formData.taxId) {
      newErrors.taxId = 'Tax ID / RC Number is required';
    }

    if (!formData.industry) {
      newErrors.industry = 'Please select an industry';
    }

    if (!formData.numberOfEmployees) {
      newErrors.numberOfEmployees = 'Number of employees is required';
    } else if (parseInt(formData.numberOfEmployees) < 1) {
      newErrors.numberOfEmployees = 'Must be at least 1 employee';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid URL (e.g., https://example.com)';
    }

    if (!formData.address) {
      newErrors.address = 'Business address is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.state) {
      newErrors.state = 'State/Province is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    if (!formData.postalCode) {
      newErrors.postalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Save business info to session
      sessionStorage.setItem('businessInfo', JSON.stringify(formData));
      
      // Navigate to next stage
      navigate('/onboarding/logo-upload');
    } catch (error) {
      console.error('Error saving business info:', error);
      alert('Failed to save business information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const isOwner = sessionStorage.getItem('isOwner') === 'true';
    if (isOwner) {
      navigate('/onboarding/company-setup');
    } else {
      navigate('/onboarding/owner-details');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step 4 of 9</span>
            <span className="text-sm text-gray-500">44% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#0F5D5D] h-2 rounded-full transition-all duration-300" style={{ width: '44%' }}></div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Business Information
          </h1>
          <p className="text-gray-600">
            Tell us about your company
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Company Details Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
              
              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your company name"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                  )}
                </div>

                {/* Tax ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID / RC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.taxId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter company registration number"
                  />
                  {errors.taxId && (
                    <p className="text-red-500 text-sm mt-1">{errors.taxId}</p>
                  )}
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.industry ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  {errors.industry && (
                    <p className="text-red-500 text-sm mt-1">{errors.industry}</p>
                  )}
                </div>

                {/* Number of Employees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Employees <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numberOfEmployees"
                    value={formData.numberOfEmployees}
                    onChange={handleChange}
                    min="1"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.numberOfEmployees ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter number of employees"
                  />
                  {errors.numberOfEmployees && (
                    <p className="text-red-500 text-sm mt-1">{errors.numberOfEmployees}</p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Website <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.website ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://www.example.com"
                  />
                  {errors.website && (
                    <p className="text-red-500 text-sm mt-1">{errors.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Address Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Address</h2>
              
              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter full business address"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                  )}
                </div>

                {/* City and State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                    )}
                  </div>
                </div>

                {/* Country and Postal Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                        errors.country ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.country && (
                      <p className="text-red-500 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                        errors.postalCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Postal code"
                    />
                    {errors.postalCode && (
                      <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                </div>

                {/* Geolocation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Location (GPS)
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={fetchingLocation}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {fetchingLocation ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Getting location...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        <span>Get Current Location</span>
                      </>
                    )}
                  </button>
                  {formData.latitude && formData.longitude && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Location captured: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Used for attendance geofencing and location-based features
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#0F5D5D] text-white py-3 rounded-lg hover:bg-[#0d4d4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Saving...' : 'Continue to Logo Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}
