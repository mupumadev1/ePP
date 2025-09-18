import React from 'react';
import RegistrationForm from './RegistrationForm.jsx';

const RegistrationPage = () => {
  const handleBackToLogin = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleRegistrationSuccess = () => {
    // After successful email verification, navigate to login
    handleBackToLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Hero image section (same as LoginView) */}
      <div
        className="hidden lg:flex flex-1 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1350&q=80')",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-blue-900 bg-opacity-70"></div>
        <div className="relative p-20 flex flex-col justify-center text-white max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome to Smart Tender e-Procurement Portal</h1>
          <p className="text-lg">Streamlining your procurement processes electronically.</p>
        </div>
      </div>

      {/* Form section */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <RegistrationForm
              onBackToLogin={handleBackToLogin}
              onRegistrationSuccess={handleRegistrationSuccess}
            />
          </div>

          {/* Bottom links to Login */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button onClick={handleBackToLogin} className="text-blue-600 hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
