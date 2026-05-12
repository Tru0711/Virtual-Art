import React from 'react';

const ARVRSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AR/VR Wall Management</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Artwork Selection</h3>
            <p className="text-gray-600 mb-4">Control which artworks appear in AR wall preview</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Select Artworks
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Scene Configuration</h3>
            <p className="text-gray-600 mb-4">Adjust scaling, lighting, and positioning</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Configure Scene
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">3D Sculpture Views</h3>
          <p className="text-gray-600">Enable 360° sculpture views and AR scene configurations</p>
        </div>
      </div>
    </div>
  );
};

export default ARVRSection;
