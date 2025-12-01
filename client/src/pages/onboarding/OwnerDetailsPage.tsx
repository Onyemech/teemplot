import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Mail, Send } from 'lucide-react';

export default function OwnerDetailsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Get registrant info from session
  const registrantInfo = JSON.parse(sessionStorage.getItem('registrantInfo') || '{}');
  const isOwner = sessionStorage.getItem('isOwner') === 'true';
  
  // Redirect if user is the owner
  useEffect(() => {
    if (isOwner) {
      navigate('/onboarding/business-info');
    }
  }, [isOwner, navigate]);

  const [formData, setFormData] = useState({
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerDateOfBirth: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.ownerFirstName || formData.ownerFirstName.length < 2) {
      newErrors.ownerFirstName = 'First name must be at least 2 characters';
    }

    if (!formData.ownerLastName || formData.ownerLastName.length < 2) {
      newErrors.ownerLastName = 'Last name must be at least 2 characters';
    }

    if (!formData.ownerEmail) {
      newErrors.ownerEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Invalid email format';
    } else if (formData.ownerEmail === registrantInfo.email) {
      newErrors.ownerEmail = 'Owner email must be different from your email';
    }

    if (!formData.ownerPhone) {
      newErrors.ownerPhone = 'Phone number is required';
    } else if (formData.ownerPhone.length < 10) {
      newErrors.ownerPhone = 'Phone number must be at least 10 digits';
    }

    if (!formData.ownerDateOfBirth) {
      newErrors.ownerDateOfBirth = 'Date of birth is required';
    } else {
      const age = new Date().getFullYear() - new Date(formData.ownerDateOfBirth).getFullYear();
      if (age < 18) {
        newErrors.ownerDateOfBirth = 'Owner must be at least 18 years old';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Save owner details to session
      sessionStorage.setItem('ownerDetails', JSON.stringify(formData));
      
      // Navigate to next stage
      navigate('/onboarding/business-info');
    } catch (error) {
      console.error('Error saving owner details:', error);
      alert('Failed to save owner details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/company-setup');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step 3 of 9</span>
            <span className="text-sm text-gray-500">33% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#0F5D5D] h-2 rounded-full transition-all duration-300" style={{ width: '33%' }}></div>
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
            Company Owner Details
          </h1>
          <p className="text-gray-600">
            Please provide the company owner's information
          </p>
        </div>

        {/* Registrant Info Box */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Your Information (Administrator)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {registrantInfo.firstName} {registrantInfo.lastName}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <span className="ml-2 text-gray-900 font-medium">
                {registrantInfo.email}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Company Owner Information
          </h2>

          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ownerFirstName"
                value={formData.ownerFirstName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                  errors.ownerFirstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter owner's first name"
              />
              {errors.ownerFirstName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerFirstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ownerLastName"
                value={formData.ownerLastName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                  errors.ownerLastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter owner's last name"
              />
              {errors.ownerLastName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerLastName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="ownerEmail"
                value={formData.ownerEmail}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                  errors.ownerEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="owner@company.com"
              />
              {errors.ownerEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerEmail}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Must be different from your email address
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="ownerPhone"
                value={formData.ownerPhone}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                  errors.ownerPhone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+234 800 000 0000"
              />
              {errors.ownerPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerPhone}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="ownerDateOfBirth"
                value={formData.ownerDateOfBirth}
                onChange={handleChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent ${
                  errors.ownerDateOfBirth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.ownerDateOfBirth && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerDateOfBirth}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start">
                    <Mail className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>The owner will receive an email invitation to join</span>
                  </li>
                  <li className="flex items-start">
                    <Send className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>They'll need to verify their email and set a password</span>
                  </li>
                  <li className="flex items-start">
                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>You'll be set up as an administrator with management permissions</span>
                  </li>
                  <li className="flex items-start">
                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>The owner will have ultimate control over the company account</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#0F5D5D] text-white py-3 rounded-lg hover:bg-[#0d4d4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Saving...' : 'Continue to Business Information'}
          </button>
        </form>
      </div>
    </div>
  );
}
