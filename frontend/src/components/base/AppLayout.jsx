import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SideBar from './SideBar.jsx';
import NavBar from './NavBar.jsx';
import { BarChart3, FileText, Clipboard, FileCheck, TrendingUp, Settings } from 'lucide-react';

const AppLayout = ({ title = 'dashboard', onLogout, children }) => {
  const [activeTab, setActiveTab] = useState(title || 'dashboard');
  const location = useLocation();

  const isBidder = location?.pathname?.startsWith('/bidder');

  useEffect(() => {
    if (isBidder) {
      // Derive active tab from the current bidder route
      const p = location.pathname || '';
      if (p.startsWith('/bidder/opportunities')) {
        setActiveTab('opportunities');
      } else if (p.startsWith('/bidder/bids')) {
        setActiveTab('my-bids');
      } else {
        setActiveTab('bidder-dashboard');
      }
    } else {
      setActiveTab(title || 'dashboard');
    }
  }, [title, isBidder, location.pathname]);

  const navigationItems = isBidder
    ? [
        { id: 'bidder-dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'opportunities', label: 'Opportunities', icon: FileText },
        { id: 'my-bids', label: 'My Bids', icon: Clipboard },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'tenders', label: 'Tenders', icon: FileText },
        { id: 'evaluation', label: 'Evaluation', icon: Clipboard },
        { id: 'contracts', label: 'Contracts', icon: FileCheck },
        { id: 'reports', label: 'Reports', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];

  const notifications = [
    { id: 1, title: 'New bid submitted', message: 'ZPPA/2024/001 received a new bid', time: '2 hours ago', priority: 'high' }
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    // Defer navigation to SideBar using routeFor
  };

  const bidderRouteFor = (id) => {
    switch (id) {
      case 'bidder-dashboard':
        return '/bidder/dashboard';
      case 'opportunities':
        return '/bidder/opportunities';
      case 'my-bids':
        return '/bidder/bids';
      default:
        return '/bidder/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideBar
        navigationItems={navigationItems}
        activeTab={activeTab}
        onSelect={handleSelect}
        routeFor={isBidder ? bidderRouteFor : undefined}
      />
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
