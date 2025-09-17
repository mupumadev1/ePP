import React, { useState } from 'react';
import RegistrationForm from './RegistrationForm.jsx';

function LoginForm({ onLogin, onForgotPassword }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ type: null, message: '' });
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const username = credentials.username?.trim();
    const password = credentials.password;
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      if (typeof onLogin === 'function') {
        await onLogin({ username, password });
      } else {
        throw new Error('Login handler not available');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = (e) => {
    e.preventDefault();
    setShowForgot(true);
    setForgotStatus({ type: null, message: '' });
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus({ type: null, message: '' });
    if (!resetEmail) {
      setForgotStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }
    try {
      setForgotLoading(true);
      if (typeof onForgotPassword === 'function') {
        await onForgotPassword({ email: resetEmail });
      }
      setForgotStatus({ type: 'success', message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setForgotStatus({ type: 'success', message: 'If an account with that email exists, a reset link has been sent.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
    setError(null);
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
    setError(null);
  };

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Hero image section */}
      <div
        className="hidden lg:flex flex-1 bg-cover bg-center relative"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1350&q=80')"
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-blue-900 bg-opacity-70"></div>
        <div className="relative p-20 flex flex-col justify-center text-white max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome to Smart Tender e-Procurement Portal</h1>
          <p className="text-lg">
            Streamlining your procurement processes electronically.
          </p>
        </div>
      </div>

      {/* Form section */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {showRegistration ? (
            <RegistrationForm
              onBackToLogin={handleBackToLogin}
              onRegistrationSuccess={handleRegistrationSuccess}
            />
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                Sign in to your account
              </h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="flex flex-col space-y-3 text-sm text-center">
                  <a
                    href="#"
                    onClick={openForgotPassword}
                    className="text-blue-600 hover:underline"
                  >
                    Forgot your password?
                  </a>

                  <div className="text-gray-600">
                    Don't have an account?{' '}
                    <button
                      onClick={handleShowRegistration}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Register as Supplier
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-2">Reset your password</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the email associated with your account and we will send you a link to reset your password.</p>

            {forgotStatus.type && (
              <div className={`${forgotStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border px-3 py-2 rounded mb-3 text-sm`}>
                {forgotStatus.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => { setShowForgot(false); setForgotStatus({ type: null, message: '' }); }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitForgotPassword}
                  disabled={forgotLoading}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginForm;