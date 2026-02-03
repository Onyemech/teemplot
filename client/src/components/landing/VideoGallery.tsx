import React, { useEffect, useState } from 'react';
import { Play, Search, MonitorPlay } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface Video {
  id: string;
  title: string;
  description: string;
  category: 'demo' | 'tutorial' | 'app_install';
  video_url: string;
  created_at: string;
}

export const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [filter, search]);

  const fetchVideos = async () => {
    try {
      const res = await apiClient.get('/api/super-admin/videos', {
        params: {
          category: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          isActive: true
        }
      });
      setVideos(res.data.data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Learn How to Use Teemplot</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Watch our tutorials and demos to get the most out of your platform.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {['all', 'demo', 'tutorial', 'app_install'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === cat
                  ? 'bg-[#0F5D5D] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'All Videos' : 
               cat === 'app_install' ? 'Installation' : 
               cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tutorials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D]"
          />
        </div>
      </div>

      {/* Active Video Player */}
      {activeVideo && (
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-black rounded-xl overflow-hidden shadow-2xl aspect-video relative group">
            <video
              src={activeVideo.video_url}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{activeVideo.title}</h3>
            <p className="text-gray-600 mt-2">{activeVideo.description}</p>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 h-80 animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MonitorPlay className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No videos found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video) => (
            <div 
              key={video.id}
              className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer group ${
                activeVideo?.id === video.id ? 'ring-2 ring-[#0F5D5D]' : ''
              }`}
              onClick={() => setActiveVideo(video)}
            >
              <div className="relative aspect-video bg-gray-100">
                <video 
                  src={video.video_url} 
                  className="w-full h-full object-cover" 
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-[#0F5D5D] ml-1" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Video
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    video.category === 'demo' ? 'bg-blue-100 text-blue-700' :
                    video.category === 'tutorial' ? 'bg-purple-100 text-purple-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {video.category === 'app_install' ? 'Installation' : 
                     video.category.charAt(0).toUpperCase() + video.category.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(video.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{video.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
