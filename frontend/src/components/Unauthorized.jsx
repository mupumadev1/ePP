import React from 'react';

export default function Unauthorized({ isAuthenticated = false, userType = null }) {
  // Determine appropriate message and redirect based on user type
  const getContent = () => {
    if (!isAuthenticated) {
      return {
        title: 'Authentication Required',
        message: 'You need to sign in to access this page.',
        buttonText: 'Sign In',
        buttonLink: '/login'
      };
    }

    // User is authenticated but doesn't have the right permissions
    switch (userType) {
      case 'supplier':
        return {
          title: 'Access Denied',
          message: 'This page is only available to administrators and procurement staff. As a supplier, you can access your dashboard and bidding opportunities.',
          buttonText: 'Go to Bidder Dashboard',
          buttonLink: '/bidder/dashboard'
        };

      case 'admin':
      case 'evaluator':
      case 'procuring_entity':
        return {
          title: 'Access Denied',
          message: 'You do not have sufficient permissions to access this page. Please contact your administrator if you believe this is an error.',
          buttonText: 'Go to Dashboard',
          buttonLink: '/dashboard'
        };

      default:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to view this page. Your account may be inactive or suspended.',
          buttonText: 'Go to Home',
          buttonLink: '/'
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
        {/* Warning Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-2xl font-bold text-gray-900 mb-2">{content.title}</div>
        <p className="text-gray-600 mb-6">{content.message}</p>

        {/* Action Button */}
        <a
          href={content.buttonLink}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
        >
          {content.buttonText}
        </a>

        {/* Additional Help for Suppliers */}
        {userType === 'supplier' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Available to you:</p>
            <div className="space-y-2">
              <a
                href="/bidder/opportunities"
                className="block text-sm text-blue-600 hover:underline"
              >
                View Tender Opportunities
              </a>
              <a
                href="/bidder/bids"
                className="block text-sm text-blue-600 hover:underline"
              >
                Track Your Bids
              </a>
            </div>
          </div>
        )}

        {/* Contact Support */}
        {isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Need help? Contact support or your system administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}