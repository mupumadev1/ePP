// Create: frontend/src/components/public/LoginPromptModal.jsx

import React from 'react';
import { X, Lock, User, UserPlus } from 'lucide-react';

const LoginPromptModal = ({ tender, onClose, onLogin }) => {
  if (!tender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full mx-4 z-10">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center">
            <Lock className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Authentication Required
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="text-gray-600 mb-4">
              To submit a bid for <span className="font-semibold">"{tender.title}"</span>,
              you need to be registered and logged in as a supplier.
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Tender Reference:</p>
                <p>{tender.reference_number}</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="text-sm text-gray-600 text-center">
              Choose an option below:
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={onLogin}
                className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Login to Existing Account
              </button>

              <button
                onClick={() => {
                  // Navigate to registration
                  window.location.href = '/register?type=supplier';
                }}
                className="flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Register as New Supplier
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Registration Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Valid business registration</li>
                <li>Tax compliance certificate</li>
                <li>Company profile and experience</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <div className="text-xs text-gray-500 text-center">
            Need help? Contact procurement support at{' '}
            <a href="mailto:support@procurement.gov.zm" className="text-blue-600 hover:underline">
              support@procurement.gov.zm
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;