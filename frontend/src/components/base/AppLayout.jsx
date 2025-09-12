import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from './SideBar.jsx';
import NavBar from './NavBar.jsx';
import { BarChart3, FileText, Clipboard, FileCheck, TrendingUp, Settings } from 'lucide-react';

const AppLayout = ({ title = 'dashboard', onLogout, children }) => {
  const [activeTab, setActiveTab] = useState(title || 'dashboard');
  const navigate = useNavigate();
  useEffect(() => setActiveTab(title || 'dashboard'), [title]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tenders', label: 'Tenders', icon: FileText },
    { id: 'evaluation', label: 'Evaluation', icon: Clipboard },
    { id: 'contracts', label: 'Contracts', icon: FileCheck },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const notifications = [
    { id: 1, title: 'New bid submitted', message: 'ZPPA/2024/001 received a new bid', time: '2 hours ago', priority: 'high' }
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    const routes = {
      dashboard: '/dashboard',
      tenders: '/tenders',
      evaluation: '/evaluation',
      contracts: '/contracts',
      reports: '/reports',
      settings: '/settings',
    };
    navigate(routes[id] || '/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideBar navigationItems={navigationItems} activeTab={activeTab} onSelect={handleSelect} />
      <div className="flex-1 flex flex-col">
        <NavBar title={activeTab} notifications={notifications} onLogout={onLogout} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
