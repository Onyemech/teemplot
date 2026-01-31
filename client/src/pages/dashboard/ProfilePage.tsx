import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ProfileImageUploader from '@/components/profile/ProfileImageUploader';
import ProfileForm from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl animate-in fade-in duration-500">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </button>

      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Edit Profile</h1>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          Update your photo and personal details.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-10 flex flex-col gap-10">
          
          {/* Profile Image Section - Centered */}
          <div className="flex flex-col items-center gap-4 w-full">
             <ProfileImageUploader />
             <div className="text-center">
               <p className="text-sm font-medium text-gray-900">Profile Photo</p>
               <p className="text-xs text-gray-500 mt-1">
                 JPG or PNG. Max 5MB.
               </p>
             </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Profile Information Section */}
          <div className="w-full">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update your personal details here.
              </p>
            </div>
            <ProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
}
