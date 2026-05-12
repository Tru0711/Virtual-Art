import React from 'react';

const ExhibitionsSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Exhibition Management</h1>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Create and manage art exhibitions</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Exhibition
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">Exhibition list and management tools will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default ExhibitionsSection;
