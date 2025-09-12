import React, { useEffect, useState } from 'react';
import { FileText, Clock, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.jsx';

const DashboardView = () => {
  const [stats, setStats] = useState([]);
  const [recentTenders, setRecentTenders] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ICON_MAP = {
    'Active Tenders': { icon: FileText, bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
    'Pending Evaluation': { icon: Clock, bgClass: 'bg-yellow-100', textClass: 'text-yellow-600' },
    'Active Contracts': { icon: Award, bgClass: 'bg-green-100', textClass: 'text-green-600' },
    'Total Suppliers': { icon: Users, bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/tenders/dashboard/');
        const data = res.data || {};

        setStats(Array.isArray(data.stats) ? data.stats : []);
        setRecentTenders(Array.isArray(data.recent_tenders) ? data.recent_tenders : []);
        setPendingActions(Array.isArray(data.pending_actions) ? data.pending_actions : []);
        setError(null);
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const enrichedStats = (stats || []).map((s) => {
    const meta = ICON_MAP[s.label] || { icon: FileText, bgClass: 'bg-gray-100', textClass: 'text-gray-600' };
    return { ...s, ...meta };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-gray-100 h-12 w-12" />
                <div className="ml-4 w-full">
                  <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                  <div className="h-6 bg-gray-100 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {enrichedStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                <stat.icon className={`h-6 w-6 ${stat.textClass}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Recent Tenders</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {(recentTenders || []).slice(0, 3).map((t, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    {t.id ? (
                      <Link to={`/tenders/${t.id}`} className="block">
                        <p className="font-medium text-blue-700 hover:underline">{t.reference_number}</p>
                        <p className="text-sm text-gray-600 hover:text-gray-800">{t.title}</p>
                      </Link>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{t.reference_number}</p>
                        <p className="text-sm text-gray-500">{t.title}</p>
                      </>
                    )}
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {t.status || 'Active'}
                  </span>
                </div>
              ))}
              {(!recentTenders || recentTenders.length === 0) && (
                <p className="text-sm text-gray-500">No recent tenders</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Pending Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {(pendingActions || []).slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.action}</p>
                    <p className="text-sm text-gray-500">{item.tender}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.urgency === 'high'
                        ? 'bg-red-100 text-red-800'
                        : item.urgency === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.urgency || 'low'}
                  </span>
                </div>
              ))}
              {(!pendingActions || pendingActions.length === 0) && (
                <p className="text-sm text-gray-500">No pending actions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
