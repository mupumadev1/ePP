import React from 'react';
import { Bell, User, LogOut, Plus } from 'lucide-react';

const NavBar = ({ title = '', notifications = [], onLogout }) => {
  const formatTitle = (title) => {
    return title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-medium text-gray-900">
            {formatTitle(title)}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
         <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg">
            <Bell className="h-6 w-6" />
            {notifications && notifications.length > 0 && (
              <span className="absolute top-1 right-1 h-3 w-3 bg-purple-500 rounded-full"></span>
            )}
          </button>

          {/* User Avatar */}
          <div className="h-10 w-10 bg-purple-500 rounded-full flex items-center justify-center">
              <a href={'profile'} title="Profile" className="flex items-center justify-center h-full w-full">
            <User className="h-5 w-5 text-white" />
              </a>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center text-gray-600 hover:text-gray-800"
              title="Logout"
            >
              <LogOut className="h-4 w-4 mr-2 rotate-45" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;