import React from 'react';

const AIInsightsSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AI Insights & Recommendations</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trending Artworks</h3>
            <p className="text-gray-600 mb-4">View AI-generated insights on popular artworks</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              View Trends
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommended Collections</h3>
            <p className="text-gray-600 mb-4">Manage AI-suggested art collections</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Manage Collections
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Engagement Analytics</h3>
          <p className="text-gray-600">Analyze viewing patterns and user engagement</p>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsSection;
