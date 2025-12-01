import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';

export default function LogoUploadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPG, JPEG, or SVG file');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setError('');
    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: fileInputRef.current } as any);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/documents');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!logoFile) {
      // Skip if no logo
      navigate('/onboarding/documents');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // TODO: Upload to Cloudinary
      // For now, save to session storage as base64
      sessionStorage.setItem('companyLogo', logoPreview || '');
      
      // Navigate to next stage
      navigate('/onboarding/documents');
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/business-info');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step 5 of 9</span>
            <span className="text-sm text-gray-500">55% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#0F5D5D] h-2 rounded-full transition-all duration-300" style={{ width: '55%' }}></div>
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
            Company Logo
          </h1>
          <p className="text-gray-600">
            Upload your company logo (optional)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Upload Area */}
          {!logoPreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#0F5D5D] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    Drop your logo here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, JPEG, or SVG (max 2MB)
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Recommended: Square image, minimum 200x200px
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Logo Preview</h3>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {logoFile?.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {logoFile && (logoFile.size / 1024).toFixed(2)} KB
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-sm text-[#0F5D5D] hover:text-[#0d4d4d] font-medium"
                    >
                      Replace logo
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-blue-700">Uploading logo...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Logo Guidelines
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a square image for best results</li>
              <li>• Minimum size: 200x200 pixels</li>
              <li>• Maximum file size: 2MB</li>
              <li>• Supported formats: PNG, JPG, JPEG, SVG</li>
              <li>• Your logo will appear in the dashboard and reports</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 space-x-4">
            <button
              type="button"
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Skip for now
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0F5D5D] text-white py-3 rounded-lg hover:bg-[#0d4d4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Uploading...' : logoFile ? 'Upload & Continue' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
