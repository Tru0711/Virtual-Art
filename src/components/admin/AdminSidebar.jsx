import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Image, ShoppingCart, BarChart3, Settings, MessageSquare, TrendingUp, ChevronRight, Shield } from 'lucide-react';

const AdminSidebar = ({ profile }) => {
  const location = useLocation();

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'artworks', label: 'Artwork Management', icon: Image },
    { id: 'transactions', label: 'Transactions', icon: ShoppingCart },
    { id: 'reviews', label: 'Review Moderation', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Admin Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
          <p className="text-sm text-gray-600">Welcome, {profile?.full_name?.split(' ')[0]}</p>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 mb-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === `/admin/${item.id}`;
            return (
              <Link
                key={item.id}
                to={`/admin/${item.id}`}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AdminSidebar;
