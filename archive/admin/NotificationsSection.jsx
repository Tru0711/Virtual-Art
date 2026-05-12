import React from 'react';

const NotificationsSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications & Announcements</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Notifications</h3>
            <p className="text-gray-600 mb-4">Send notifications to users or artists</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Send Notification
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Announcements</h3>
            <p className="text-gray-600 mb-4">Publish system-wide announcements</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Create Announcement
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Scheduled Alerts</h3>
          <p className="text-gray-600">Schedule exhibition or sale alerts and manage notification history</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSection;
