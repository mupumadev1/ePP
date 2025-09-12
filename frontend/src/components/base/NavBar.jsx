import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';

const NavBar = ({ title = '', notifications = [], onLogout }) => {
  return (
    <header className="bg-blue-600 text-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold capitalize">{title}</h2>
        </div>

        <div className="flex items-center space-x-3">
          <button className="relative p-2 text-white/90 hover:text-white hover:bg-blue-500/30 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
            {notifications && notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          <div className="h-8 w-8 bg-blue-800 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-2 inline-flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
