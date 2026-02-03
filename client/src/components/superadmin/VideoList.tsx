import React, { useEffect, useState } from 'react';
import { Trash2, Eye, Play, ToggleLeft, ToggleRight, Search, Filter } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface Video {
  id: string;
  title: string;
  description: string;
  category: 'demo' | 'tutorial' | 'app_install';
  video_url: string;
  is_active: boolean;
  created_at: string;
  file_size: number;
}

export const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchVideos = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/videos', {
        params: {
          category: filter !== 'all' ? filter : undefined,
          search: search || undefined
        }
      });
      setVideos(res.data.data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [filter, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await apiClient.delete(`/api/super-admin/videos/${id}`);
      setVideos(videos.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/super-admin/videos/${id}/status`, {
        isActive: !currentStatus
      });
      setVideos(videos.map(v => 
        v.id === id ? { ...v, is_active: !currentStatus } : v
      ));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            <option value="demo">Demo Videos</option>
            <option value="tutorial">Tutorials</option>
            <option value="app_install">App Installation</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Play className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-medium">No videos found</h3>
            <p className="text-gray-500 text-sm mt-1">Upload a video to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Video</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Size</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {videos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{video.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{video.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      video.category === 'demo' ? 'bg-blue-50 text-blue-700' :
                      video.category === 'tutorial' ? 'bg-purple-50 text-purple-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {video.category === 'app_install' ? 'App Install' : 
                       video.category.charAt(0).toUpperCase() + video.category.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatSize(video.file_size)}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => handleToggleStatus(video.id, video.is_active)}
                      className={`text-2xl ${video.is_active ? 'text-green-500' : 'text-gray-300'}`}
                    >
                      {video.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={video.video_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
