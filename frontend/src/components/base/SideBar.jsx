import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

// navigationItems: [{ id, label, icon }]
// activeTab: string
// onSelect: (id) => void
// routeFor: optional function (id) => path
const SideBar = ({ navigationItems = [], activeTab, onSelect, routeFor: routeForProp }) => {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const navigate = useNavigate();

  const defaultRouteFor = (id) => {
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

  const routeFor = typeof routeForProp === 'function' ? routeForProp : defaultRouteFor;

  const handleClick = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
    navigate(routeFor(id));
  };

  return (
    <aside className={`group relative hidden md:block bg-blue-500 text-white transition-[width,background-color] duration-300 ease-in-out ${pinnedOpen ? 'w-72' : 'w-16 hover:w-72'}`}>
      {/* Header */}
      <div className="px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold text-white whitespace-nowrap transition-opacity duration-200 ${pinnedOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Smart Tender</h1>
          <p className={`text-sm text-blue-100 mt-1 whitespace-nowrap transition-opacity duration-200 ${pinnedOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Procurement Portal</p>
        </div>
        {/* Hamburger Icon */}
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={() => setPinnedOpen((v) => !v)}
          className="p-2 rounded hover:bg-blue-400/40 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <Menu className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-1">
        {navigationItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-500 text-white' 
                  : 'text-blue-100 hover:bg-blue-400 hover:text-white'
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? 'text-white' : 'text-blue-200'
                  }`}
                />
              )}
              <span className={`transition-opacity duration-200 whitespace-nowrap pointer-events-none ${pinnedOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default SideBar;