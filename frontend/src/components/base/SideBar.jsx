import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

// navigationItems: [{ id, label, icon }]
// activeTab: string
// onSelect: (id) => void
// routeFor: optional function (id) => path
const SideBar = ({ navigationItems = [], activeTab, onSelect, routeFor: routeForProp }) => {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
        case 'budget':
        return '/budget';
      case 'profile':
        return '/profile';
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

  // Determine if sidebar should be expanded
  const isExpanded = pinnedOpen || isHovered;

  return (
    <aside
      className={`group relative hidden md:block bg-blue-500 text-white transition-[width] duration-300 ease-in-out ${isExpanded ? 'w-72' : 'w-16'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="px-4 py-6 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className={`text-xl font-semibold text-white whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            Smart Tender
          </h1>
          <p className={`text-sm text-blue-100 mt-1 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            Procurement Portal
          </p>
        </div>

        {/* Hamburger Icon - Always visible when collapsed */}
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={() => setPinnedOpen((v) => !v)}
          className={`p-2 rounded hover:bg-blue-400/40 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-200 ${
            isExpanded ? 'ml-2' : 'ml-0'
          }`}
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
                  ? 'bg-white/20 text-white shadow-sm' 
                  : 'text-blue-100 hover:bg-blue-400/50 hover:text-white'
              }`}
              title={!isExpanded ? label : ''}
            >
              {Icon && (
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-blue-200'
                  }`}
                />
              )}
              <span className={`transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Optional: Add a subtle indicator when sidebar can expand on hover */}
      {!pinnedOpen && !isHovered && (
        <div className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 opacity-30">
          <div className="w-1 h-8 bg-blue-300 rounded-r"></div>
        </div>
      )}
    </aside>
  );
};

export default SideBar;