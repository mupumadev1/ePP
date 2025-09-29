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
import PublicTendersView from './components/public/PublicTenderView.jsx';
import AdminSupplierVerifications from './components/admin/AdminSupplierVerifications.jsx';
import RegistrationPage from './components/RegistrationPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AdminProfileEditRequests from './components/admin/AdminProfileEditRequests.jsx';

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
  const [userRole, setUserRole] = useState({
    userType: null,
    canAccessAdmin: false,
    canAccessBidder: false,
    dashboardRoute: '/login',
    isSupplier: false,
    isAdmin: false,
    isEvaluator: false,
    isProcuringEntity: false
  });

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

  // Update user role state from session data
  const updateUserRole = useCallback((sessionData) => {
    if (sessionData?.authenticated && sessionData?.user) {
      const user = sessionData.user;
      const roleInfo = user.role_info || {};

      setUserRole({
        userType: user.user_type,
        canAccessAdmin: roleInfo.can_access_admin_dashboard || false,
        canAccessBidder: roleInfo.can_access_bidder_dashboard || false,
        dashboardRoute: roleInfo.dashboard_route || '/login',
        isSupplier: roleInfo.is_supplier || false,
        isAdmin: roleInfo.is_admin_user || false,
        isEvaluator: roleInfo.is_evaluator_user || false,
        isProcuringEntity: roleInfo.is_procuring_entity_user || false
      });
    } else {
      setUserRole({
        userType: null,
        canAccessAdmin: false,
        canAccessBidder: false,
        dashboardRoute: '/login',
        isSupplier: false,
        isAdmin: false,
        isEvaluator: false,
        isProcuringEntity: false
      });
    }
  }, []);

  // Handle logout event from interceptor
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      updateUserRole({ authenticated: false });
      localStorage.removeItem('isAuthenticated');
    };

    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [updateUserRole]);

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
            updateUserRole(session);
          } else {
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
            updateUserRole({ authenticated: false });
          }
        } else {
          setIsAuthenticated(false);
          updateUserRole({ authenticated: false });
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please refresh the page.');
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        updateUserRole({ authenticated: false });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [prefetchCsrf, verifySession, updateUserRole]);

  const handleLogin = async ({ username, password }) => {
    try {
      setError(null);
      await prefetchCsrf();
      const loginResponse = await loginApi({ username, password });
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);

      // Fetch updated user info to get role details
      try {
        const session = await meApi();
        updateUserRole(session);
      } catch {
        // Fallback to login response data if me() fails
        if (loginResponse?.role_info) {
          updateUserRole({ authenticated: true, user: loginResponse });
        } else {
          updateUserRole({ authenticated: false });
        }
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
      updateUserRole({ authenticated: false });
      // Redirect to login page after logout
      window.location.replace('/login');
    }
  }, [updateUserRole]);

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

  const homePath = isAuthenticated ? userRole.dashboardRoute : '/login';

  return (
    <Routes>
        <Route path="/" element={<PublicTendersView />} />
        <Route
          path="/tenders"
          element={
            isAuthenticated && userRole.canAccessAdmin ? (
              <TenderAdminDashboard onLogout={handleLogout} initialTab="tenders" />
            ) : (
              <PublicTendersView />
            )
          }
        />
        <Route path="/public-tenders" element={<PublicTendersView />} />
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

      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <RegistrationPage />
          )
        }
      />

      {/* Default route redirects based on auth and role */}


      {/* Admin-only routes */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="dashboard" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/tenders"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="tenders" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/evaluation"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="evaluation" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/contracts"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="contracts" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/reports"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="reports" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />
      <Route
        path="/settings"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="settings" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

         <Route
        path="/budget"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderAdminDashboard onLogout={handleLogout} initialTab="budget" />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
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

      {/* Admin-only supplier verification route */}
      <Route
        path="/admin/suppliers/verifications"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <AppLayout title="admin" onLogout={handleLogout}>
              <AdminSupplierVerifications />
            </AppLayout>
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* Admin-only tender management routes */}
      <Route
        path="/tenders/:tenderId/setup-criteria"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <AppLayout title="tenders" onLogout={handleLogout}>
              <div className="p-6">
                <div className="bg-white rounded-lg shadow">
                  <TenderCriteriaSetup />
                </div>
              </div>
            </AppLayout>
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      <Route
        path="/tenders/:tenderId/evaluate"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <TenderEvaluationWithLayout onLogout={handleLogout} />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* Bidder routes - accessible to suppliers and public (for viewing) */}
      <Route
        path="/bidder"
        element={<Navigate to={homePath} replace />}
      />

      {/* Supplier-only bidder dashboard */}
      <Route
        path="/bidder/dashboard"
        element={
          isAuthenticated && userRole.canAccessBidder ? (
            <BidderDashboard onLogout={handleLogout} />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public opportunities viewing */}
      <Route
        path="/bidder/opportunities"
        element={<OpportunitiesList onLogout={isAuthenticated ? handleLogout : undefined} />}
      />
      <Route
        path="/bidder/opportunities/:id"
        element={<OpportunitiesDetail onLogout={isAuthenticated ? handleLogout : undefined} />}
      />

      {/* Supplier-only bidding routes */}
      <Route
        path="/bidder/opportunities/:tenderId/bid"
        element={
          isAuthenticated && userRole.canAccessBidder ? (
            <BidSubmission onLogout={handleLogout} />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/bidder/bids"
        element={
          isAuthenticated && userRole.canAccessBidder ? (
            <BidStatus onLogout={handleLogout} />
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Admin: profile edit review */}
      <Route
        path="/admin/profile-edits"
        element={
          isAuthenticated && userRole.canAccessAdmin ? (
            <AppLayout title="admin" onLogout={handleLogout}>
              <AdminProfileEditRequests />
            </AppLayout>
          ) : isAuthenticated ? (
            <Unauthorized isAuthenticated={true} userType={userRole.userType} />
          ) : (
            <Unauthorized isAuthenticated={false} />
          )
        }
      />

      {/* User: profile view/edit */}
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <ProfilePage onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
};

export default App;