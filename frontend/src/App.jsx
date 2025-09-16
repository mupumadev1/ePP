import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import TenderAdminDashboard from './components/MainComponent.jsx';
import LoginView from './components/LoginView.jsx';
import Evaluation from './components/Evaluation.jsx';
import TenderDetail from './components/TenderDetail.jsx';
import TenderCriteriaSetup from './components/TenderCriteriaSetup.jsx';
import AppLayout from './components/base/AppLayout.jsx';
import { getCsrf, me as meApi, login as loginApi, requestPasswordReset as requestPasswordResetApi, logout as logoutApi } from './api/auth.jsx';
import axiosInstance from './api/axiosInstance.jsx';
import BidderDashboard from './components/bidder/dashboard/BidderDashboard.jsx';
import OpportunitiesList from './components/bidder/opportunities/OpportunitiesList.jsx';
import OpportunitiesDetail from './components/bidder/opportunities/OpportunitiesDetail.jsx';
import BidSubmission from './components/bidder/bids/BidSubmission.jsx';
import BidStatus from './components/bidder/bids/BidStatus.jsx';
import Unauthorized from './components/Unauthorized.jsx';

const TenderDetailWithLayout = ({ onLogout }) => (
  <AppLayout title="tenders" onLogout={onLogout}>
    <TenderDetail />
  </AppLayout>
);

const TenderEvaluationWithLayout = ({ onLogout }) => {
  const { tenderId } = useParams();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/tenders/${tenderId}/`);
        if (mounted) setTender(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message || 'Failed to load tender');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (tenderId) load();
    return () => { mounted = false; };
  }, [tenderId]);

  return (
    <AppLayout title="tenders" onLogout={onLogout}>
      {loading ? (
        <div className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <div className="text-gray-600">Loading tender…</div>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow">
            <Evaluation tender={tender} embedded />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Memoize CSRF prefetch function
  const prefetchCsrf = useCallback(async () => {
    try {
      const data = await getCsrf();
      return Boolean(data?.csrfToken);
    } catch (err) {
      console.error('Error fetching CSRF token:', err);
      throw err;
    }
  }, []);

  // Verify existing session
  const verifySession = useCallback(async () => {
    try {
      const data = await meApi();
      return data; // { authenticated, user: {...} }
    } catch (error) {
      if (error.response?.status === 401) {
        return { authenticated: false };
      }
      throw error; // Network error or other issue
    }
  }, []);

  // Handle logout event from interceptor
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('isAuthenticated');
    };

    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        setError(null);

        // Always fetch CSRF token first
        await prefetchCsrf();

        // Check if user was previously authenticated
        const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
        if (storedAuth) {
          const session = await verifySession();
          if (session?.authenticated) {
            setIsAuthenticated(true);
            // Determine role from available fields
            const isPrivileged = ['admin', 'evaluator'].includes(session?.user?.user_type) || Boolean(session?.user?.is_superuser);
            setIsAdmin(isPrivileged);

          } else {
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
            setIsAdmin(false);
          }
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please refresh the page.');
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [prefetchCsrf, verifySession]);

  const handleLogin = async ({ username, password }) => {
    try {
      setError(null);
      await prefetchCsrf();
      await loginApi({ username, password });
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      // Fetch user info to determine role
      try {
        const session = await meApi();
        const isPrivileged = ['admin', 'evaluator'].includes(session?.user?.user_type) || Boolean(session?.user?.is_superuser);
        setIsAdmin(isPrivileged);
      } catch {
        setIsAdmin(false);
      }
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      // error already user-friendly from loginApi
      throw error;
    }
  };

  const handleForgotPassword = async ({ email }) => {
    try {
      setError(null);
      const res = await requestPasswordResetApi({ email });
      return res;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error; // message already user-friendly
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const homePath = isAuthenticated ? (isAdmin ? '/dashboard' : '/bidder/dashboard') : '/login';

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <LoginView onLogin={handleLogin} onForgotPassword={handleForgotPassword} />
          )
        }
      />

      {/* Default route redirects based on auth */}
      <Route
        path="/"
        element={<Navigate to={homePath} replace />}
      />

      {/* Protected routes rendering the admin dashboard with different initial tabs */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="dashboard" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/tenders"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="tenders" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/evaluation"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="evaluation" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/contracts"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="contracts" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/reports"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="reports" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/settings"
        element={
          isAuthenticated && isAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="settings" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* Tender detail page: publicly viewable; login required is enforced only for bidding actions elsewhere */}
      <Route
        path="/tenders/:tenderId"
        element={<TenderDetailWithLayout onLogout={isAuthenticated ? handleLogout : undefined} />}
      />

      {/* Tender criteria setup route */}
      <Route
        path="/tenders/:tenderId/setup-criteria"
        element={
          isAuthenticated && isAdmin ? (
            <AppLayout title="tenders" onLogout={handleLogout}>
              <div className="p-6">
                <div className="bg-white rounded-lg shadow">
                  <TenderCriteriaSetup />
                </div>
              </div>
            </AppLayout>
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* Example standalone evaluation route (optional) */}
      <Route
        path="/tenders/:tenderId/evaluate"
        element={
          isAuthenticated && isAdmin ? (
            <TenderEvaluationWithLayout onLogout={handleLogout} />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* Bidder routes */}
      <Route
        path="/bidder"
        element={<Navigate to={homePath} replace />}
      />
      <Route
        path="/bidder/dashboard"
        element={isAuthenticated ? (<BidderDashboard onLogout={handleLogout} />) : (<Navigate to="/login" replace />)}
      />
      <Route
        path="/bidder/opportunities"
        element={isAuthenticated ? (<OpportunitiesList onLogout={handleLogout} />) : (<OpportunitiesList />)}
      />
      <Route
        path="/bidder/opportunities/:id"
        element={isAuthenticated ? (<OpportunitiesDetail onLogout={handleLogout} />) : (<OpportunitiesDetail />)}
      />
      <Route
        path="/bidder/opportunities/:tenderId/bid"
        element={isAuthenticated ? (<BidSubmission onLogout={handleLogout} />) : (<Navigate to="/login" replace />)}
      />
      <Route
        path="/bidder/bids"
        element={isAuthenticated ? (<BidStatus onLogout={handleLogout} />) : (<Navigate to="/login" replace />)}
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;