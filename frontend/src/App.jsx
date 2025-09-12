import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import TenderAdminDashboard from './components/MainComponent.jsx';
import LoginView from './components/LoginView.jsx';
import Evaluation from './components/Evaluation.jsx';
import TenderDetail from './components/TenderDetail.jsx';
import AppLayout from './components/base/AppLayout.jsx';
import { getCsrf, me as meApi, login as loginApi, requestPasswordReset as requestPasswordResetApi, logout as logoutApi } from './api/auth.jsx';
import axiosInstance from './api/axiosInstance.jsx';

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
      return Boolean(data?.authenticated);
    } catch (error) {
      if (error.response?.status === 401) {
        return false; // Unauthenticated, not an error
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
          const isValid = await verifySession();
          if (isValid) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please refresh the page.');
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
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

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginView onLogin={handleLogin} onForgotPassword={handleForgotPassword} />
          )
        }
      />

      {/* Default route redirects based on auth */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* Protected routes rendering the admin dashboard with different initial tabs */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="dashboard" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/tenders"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="tenders" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/evaluation"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="evaluation" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/contracts"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="contracts" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/reports"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="reports" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/settings"
        element={
          isAuthenticated ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="settings" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Tender detail page */}
      <Route
        path="/tenders/:tenderId"
        element={
          isAuthenticated ? (
            <TenderDetailWithLayout onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Example standalone evaluation route (optional) */}
      <Route
        path="/tenders/:tenderId/evaluate"
        element={
          isAuthenticated ? (
            <TenderEvaluationWithLayout onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;