'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/contexts/UserContext';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const { user, refetch } = useUser();
  const { success, error } = useToast();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      jobTitle: '',
      bio: '',
    },
  });

  // Load user data into form when user is available
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        jobTitle: (user as any).jobTitle || '', // Cast as any if type definition is missing jobTitle
        bio: (user as any).bio || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const response = await apiClient.put('/api/user/profile', data);
      
      if (response.data.success) {
        success('Profile updated successfully');
        await refetch();
        reset(data); // Reset dirty state with new values
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      error(err.message || 'Failed to update profile');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            {...register('firstName')}
            className={`
              w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors
              ${errors.firstName ? 'border-red-500' : 'border-gray-300'}
            `}
            placeholder="Jane"
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            {...register('lastName')}
            className={`
              w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors
              ${errors.lastName ? 'border-red-500' : 'border-gray-300'}
            `}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
          Job Title / Role
        </label>
        <input
          id="jobTitle"
          type="text"
          {...register('jobTitle')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          placeholder="Senior Software Engineer"
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Short Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          {...register('bio')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none"
          placeholder="Brief description about yourself..."
        />
        {errors.bio && (
          <p className="text-sm text-red-500">{errors.bio.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={`
            flex items-center justify-center px-6 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${isSubmitting || !isDirty 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
