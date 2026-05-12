import React from 'react';

const MaintenanceSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">System Maintenance</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Backup & Security</h3>
            <p className="text-gray-600 mb-4">Generate backups and enable 2FA</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Manage Backups
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Cleanup</h3>
            <p className="text-gray-600 mb-4">Clear old or unused data and cache</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Clean Data
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Diagnostics</h3>
            <p className="text-gray-600 mb-4">Run diagnostic checks and update versions</p>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Run Diagnostics
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Monitoring</h3>
          <p className="text-gray-600">Monitor suspicious activity and admin login logs</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSection;
