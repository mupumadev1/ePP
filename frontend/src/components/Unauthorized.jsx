import React from 'react';

export default function Unauthorized({ isAuthenticated = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-2xl font-bold text-gray-900 mb-2">Access denied</div>
        <p className="text-gray-600 mb-6">
          You do not have permission to view this page.
        </p>
        {isAuthenticated ? (
          <a
            href="/bidder/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Bidder Dashboard
          </a>
        ) : (
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}


