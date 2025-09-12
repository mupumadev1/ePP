import React, { useEffect, useState } from 'react';
import { BarChart3, FileText, Clipboard, FileCheck, TrendingUp, Settings } from 'lucide-react';
import DashboardView from './DashboardView.jsx';
import TendersView from './TendersView.jsx';
import EvaluationView from './EvaluationView.jsx';
import EvaluationModal from './Evaluation.jsx';
import ContractsView from './ContractsView.jsx';
import ReportsView from './ReportsView.jsx';
import SettingsView from './SettingsView.jsx';
import { fetchTenders as apiFetchTenders } from '../api/tender.js';
import SideBar from './base/SideBar.jsx';
import NavBar from './base/NavBar.jsx';

const TenderAdminDashboard = ({ onLogout, initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [selectedTender, setSelectedTender] = useState(null);

  useEffect(() => {
    // Update active tab if route-provided initialTab changes
    setActiveTab(initialTab || 'dashboard');
  }, [initialTab]);

  const [tenders, setTenders] = useState([]);
  const [tendersError, setTendersError] = useState(null);

  useEffect(() => {
    const loadTenders = async () => {
      setTendersError(null);
      try {
        const data = await apiFetchTenders();
        const normalized = Array.isArray(data)
          ? data.map(t => ({
              ...t,
              // Ensure estimated_value is a number for formatting in UI
              estimated_value: t.estimated_value !== null && t.estimated_value !== undefined ? Number(t.estimated_value) : 0,
            }))
          : [];
        setTenders(normalized);
      } catch (e) {
        console.error('Failed to load tenders', e);
        setTendersError('Failed to load tenders');
        setTenders([]);
      }
    };
    loadTenders();
  }, []);

  const [notifications] = useState([
    { id: 1, title: 'New bid submitted', message: 'ZPPA/2024/001 received a new bid', time: '2 hours ago', priority: 'high' }
  ]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tenders', label: 'Tenders', icon: FileText },
    { id: 'evaluation', label: 'Evaluation', icon: Clipboard },
    { id: 'contracts', label: 'Contracts', icon: FileCheck },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SideBar
        navigationItems={navigationItems}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <NavBar title={activeTab} notifications={notifications} onLogout={onLogout} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'tenders' && <TendersView tenders={tenders} error={tendersError} />}
          {activeTab === 'evaluation' && (
            <EvaluationView
              tenders={tenders.filter(t => t.status === 'evaluation')}
              onSelectTender={setSelectedTender}
            />
          )}
          {activeTab === 'contracts' && <ContractsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {selectedTender && (
        <EvaluationModal tender={selectedTender} embedded onClose={() => setSelectedTender(null)} />
      )}
    </div>
  );
};

export default TenderAdminDashboard;