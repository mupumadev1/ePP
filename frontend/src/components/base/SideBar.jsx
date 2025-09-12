import React from 'react';
import { useNavigate } from 'react-router-dom';

// navigationItems: [{ id, label, icon }]
// activeTab: string
// onSelect: (id) => void
const SideBar = ({ navigationItems = [], activeTab, onSelect }) => {
  const navigate = useNavigate();

  const routeFor = (id) => {
    switch (id) {
      case 'dashboard':
        return '/dashboard';
      case 'tenders':
        return '/tenders';
      case 'evaluation':
        return '/evaluation';
      case 'contracts':
        return '/contracts';
      case 'reports':
        return '/reports';
      case 'settings':
        return '/settings';
      default:
        return '/dashboard';
    }
  };

  const handleClick = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
    navigate(routeFor(id));
  };

  return (
    <aside className="w-64 bg-blue-700 text-white shadow-sm hidden md:block">
      <div className="p-6 border-b border-blue-600/50">
        <h1 className="text-xl font-bold text-white">Smart Tender</h1>
        <p className="text-xs text-blue-100 mt-1">e-Procurement Portal</p>
      </div>
      <nav className="p-4 space-y-1">
        {navigationItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-blue-600/40'
              }`}
            >
              {Icon && <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-200'}`} />}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideBar;
