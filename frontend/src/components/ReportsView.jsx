import React, { useEffect, useState } from 'react';
import { BarChart3, FileText, Users, DollarSign, Shield, Download, Calendar, Star } from 'lucide-react';
import { fetchDashboard, fetchProcurementAnalytics } from '../api/tender.js';
import { fetchSupplierPerformance } from '../api/bids.js';

const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Supplier performance state
  const [supPerf, setSupPerf] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supError, setSupError] = useState(null);

  // Procurement analytics state
  const [procAnalytics, setProcAnalytics] = useState(null);
  const [procLoading, setProcLoading] = useState(false);
  const [procError, setProcError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboard();
        setDashboard(data);
      } catch (e) {
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load supplier performance when that tab is selected
  useEffect(() => {
    if (selectedReport !== 'supplier') return;
    let cancelled = false;
    const loadSup = async () => {
      setSupLoading(true);
      setSupError(null);
      try {
        const data = await fetchSupplierPerformance();
        if (!cancelled) setSupPerf(data || []);
      } catch (e) {
        if (!cancelled) setSupError(e?.message || 'Failed to load supplier performance');
      } finally {
        if (!cancelled) setSupLoading(false);
      }
    };
    loadSup();
    return () => { cancelled = true; };
  }, [selectedReport]);

  // Load procurement analytics when that tab is selected
  useEffect(() => {
    if (selectedReport !== 'procurement') return;
    let cancelled = false;
    const loadProc = async () => {
      setProcLoading(true);
      setProcError(null);
      try {
        const data = await fetchProcurementAnalytics();
        if (!cancelled) setProcAnalytics(data);
      } catch (e) {
        if (!cancelled) setProcError(e?.message || 'Failed to load procurement analytics');
      } finally {
        if (!cancelled) setProcLoading(false);
      }
    };
    loadProc();
    return () => { cancelled = true; };
  }, [selectedReport]);

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'procurement', name: 'Procurement Analytics', icon: FileText },
    { id: 'supplier', name: 'Supplier Performance', icon: Users },
    { id: 'financial', name: 'Financial Reports', icon: DollarSign },
    { id: 'compliance', name: 'Compliance Reports', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex items-center space-x-3">
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Types</h3>
          <nav className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                  selectedReport === report.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <report.icon className="h-4 w-4 mr-3" />
                {report.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedReport === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Tenders</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboard?.stats?.find(s=>s.label==='Active Tenders')?.value ?? '—'}</p>
                      <p className="text-sm text-green-600">&nbsp;</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pending Evaluation</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboard?.stats?.find(s=>s.label==='Pending Evaluation')?.value ?? '—'}</p>
                      <p className="text-sm text-green-600">&nbsp;</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Contracts</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboard?.stats?.find(s=>s.label==='Active Contracts')?.value ?? '—'}</p>
                      <p className="text-sm text-blue-600">&nbsp;</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tender Status Distribution</h3>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Component Placeholder</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Procurement Volume</h3>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Component Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'procurement' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Procurement Analytics</h3>
              <div className="space-y-4">
                {(procLoading || procError) && (
                  <div className="text-sm">
                    {procLoading && <span className="text-gray-500">Loading analytics…</span>}
                    {procError && <span className="text-red-600">{procError}</span>}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded p-4">
                    <h4 className="font-medium text-gray-900">Average Bid Count per Tender</h4>
                    <p className="text-2xl font-bold text-blue-600">{procAnalytics?.average_bid_count_per_tender ?? '—'}</p>
                  </div>
                  <div className="border border-gray-200 rounded p-4">
                    <h4 className="font-medium text-gray-900">Average Evaluation Time</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {procAnalytics?.average_evaluation_time_days != null ? `${procAnalytics.average_evaluation_time_days} days` : '—'}
                    </p>
                  </div>
                </div>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Procurement Trend Analysis Chart</p>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'supplier' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Performance</h3>
              <div className="space-y-4">
                {(supLoading || supError) && (
                  <div className="text-sm">
                    {supLoading && <span className="text-gray-500">Loading suppliers…</span>}
                    {supError && <span className="text-red-600">{supError}</span>}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bids Won</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(supPerf || []).map((s, index) => (
                        <tr key={s.supplier_id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.supplier_name || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.bids_won ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.success_rate != null ? `${s.success_rate}%` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              {s.performance_score != null ? s.performance_score : '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!supLoading && !supError && supPerf && supPerf.length === 0) && (
                    <div className="text-sm text-gray-500 p-4">No supplier data available yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedReport !== 'overview' && selectedReport !== 'procurement' && selectedReport !== 'supplier' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Report content for {selectedReport} will be implemented here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
