import React, { useEffect, useState } from 'react';
import { FileText, Clock, Award, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.jsx';

const DashboardView = () => {
  const [stats, setStats] = useState([]);
  const [recentTenders, setRecentTenders] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

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
        setError(null);

        // First check user access permissions
        const accessRes = await axiosInstance.get('/users/me/');
        if (!accessRes.data.authenticated) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const user = accessRes.data.user;
        setUserRole(user);

        // Check if user can access admin dashboard
        if (!user.role_info?.can_access_admin_dashboard) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Fetch dashboard data
        const res = await axiosInstance.get('/tenders/dashboard/');
        const data = res.data || {};

        setStats(Array.isArray(data.stats) ? data.stats : []);
        setRecentTenders(Array.isArray(data.recent_tenders) ? data.recent_tenders : []);
        setPendingActions(Array.isArray(data.pending_actions) ? data.pending_actions : []);
        setAccessDenied(false);
      } catch (err) {
        console.error('Dashboard fetch error:', err);

        if (err.response?.status === 401) {
          setAccessDenied(true);
          setError('Authentication required. Please log in.');
        } else if (err.response?.status === 403) {
          setAccessDenied(true);
          setError('Access denied. You do not have permission to view this dashboard.');
        } else {
          setError(err?.response?.data?.error || err.message || 'Failed to load dashboard');
        }
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

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">Access Denied</div>
          <p className="text-gray-600 mb-6">
            {userRole?.role_info?.is_supplier
              ? 'This dashboard is only available to administrators and procurement staff. You can access your supplier dashboard instead.'
              : 'You do not have permission to view this dashboard. Please contact your administrator.'
            }
          </p>
          {userRole?.role_info?.is_supplier ? (
            <a
              href="/bidder/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Supplier Dashboard
            </a>
          ) : (
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
        {!accessDenied && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome message based on user role */}
      {userRole && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Welcome, {userRole.username}
              </p>
              <p className="text-sm text-blue-600">
                Role: {userRole.user_type?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase())}
                {userRole.role_info?.is_admin_user && ' (Administrator)'}
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Role-specific quick actions */}
      {userRole?.role_info?.can_access_admin_dashboard && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/tenders"
                className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">Manage Tenders</span>
              </Link>
              <Link
                to="/evaluation"
                className="flex items-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-700">Evaluations</span>
              </Link>
              <Link
                to="/contracts"
                className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Award className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-700">Contracts</span>
              </Link>
              <Link
                to="/reports"
                className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-700">Reports</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;