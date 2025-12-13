import React from 'react';
import { TrendingUp, Clock, Target, Award, Calendar, BarChart3 } from 'lucide-react';

const PerformancePage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">Track team and individual performance metrics</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Performance Analytics</h2>
        <p className="text-gray-600 mb-6">
          Advanced performance tracking and analytics are coming soon! This feature will include:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Time Tracking</h3>
            <p className="text-sm text-gray-600">Monitor work hours and productivity</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4">
            <Target className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Goal Setting</h3>
            <p className="text-sm text-gray-600">Set and track performance goals</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4">
            <Award className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Recognition</h3>
            <p className="text-sm text-gray-600">Employee recognition system</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4">
            <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Analytics</h3>
            <p className="text-sm text-gray-600">Detailed performance reports</p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl p-4 mb-6">
          <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            <strong>Coming in Q1 2024:</strong> Full performance management suite with KPIs, 
            360-degree feedback, and advanced analytics.
          </p>
        </div>

        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium">
          Get Notified When Available
        </button>
      </div>
    </div>
  );
};

export default PerformancePage;