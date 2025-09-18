// Create: frontend/src/components/public/PublicTenderModal.jsx

import React from 'react';
import { X, Calendar, MapPin, DollarSign, Clock, FileText, Shield } from 'lucide-react';

const PublicTenderModal = ({ tender, onClose, onBid }) => {
  if (!tender) return null;

  const isOpen = tender.status === 'published' && new Date(tender.closing_date) > new Date();

  const getDaysRemaining = (closingDate) => {
    const now = new Date();
    const closing = new Date(closingDate);
    const diffTime = closing - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{tender.title}</h2>
            <p className="text-sm text-gray-600">Ref: {tender.reference_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600">Status</div>
              <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                tender.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {tender.status}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Days Remaining</div>
              <div className="text-lg font-bold text-orange-600">
                {isOpen ? getDaysRemaining(tender.closing_date) : 0}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Bid Validity</div>
              <div className="text-lg font-semibold">
                {tender.bid_validity_period || 90} days
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Procuring Entity
              </h3>
              <p className="text-gray-700">{tender.procuring_entity}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Details
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Estimated Value:</span>
                  <div className="font-medium">
                    {tender.estimated_value
                      ? `${tender.currency || 'ZMW'} ${Number(tender.estimated_value).toLocaleString()}`
                      : 'Not disclosed'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Procurement Method:</span>
                  <div className="font-medium capitalize">
                    {(tender.procurement_method || '').replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Important Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-sm text-blue-600 font-medium">Publication Date</div>
                <div className="text-gray-900">
                  {new Date(tender.publication_date).toLocaleDateString()}
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded">
                <div className="text-sm text-orange-600 font-medium">Closing Date</div>
                <div className="text-gray-900">
                  {new Date(tender.closing_date).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(tender.closing_date).toLocaleTimeString()}
                </div>
              </div>
              {tender.opening_date && (
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-sm text-green-600 font-medium">Opening Date</div>
                  <div className="text-gray-900">
                    {new Date(tender.opening_date).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Description
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{tender.description}</p>
            </div>
          </div>

          {/* Requirements */}
          {tender.minimum_requirements && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Minimum Requirements</h3>
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-gray-700 whitespace-pre-line">{tender.minimum_requirements}</p>
              </div>
            </div>
          )}

          {/* Technical Specifications */}
          {tender.technical_specifications && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Specifications</h3>
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-gray-700 whitespace-pre-line">{tender.technical_specifications}</p>
              </div>
            </div>
          )}

          {/* Evaluation Criteria */}
          {tender.evaluation_criteria && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Evaluation Criteria</h3>
              <div className="p-4 bg-purple-50 border-l-4 border-purple-400">
                <p className="text-gray-700 whitespace-pre-line">{tender.evaluation_criteria}</p>
              </div>
            </div>
          )}

          {/* Security Requirements */}
          {tender.tender_security_required && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Tender Security
              </h3>
              <div className="p-4 bg-red-50 border-l-4 border-red-400">
                <div className="space-y-2">
                  <p><span className="font-medium">Amount:</span> {tender.currency || 'ZMW'} {Number(tender.tender_security_amount || 0).toLocaleString()}</p>
                  <p><span className="font-medium">Type:</span> {(tender.tender_security_type || '').replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          {tender.terms_conditions && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms and Conditions</h3>
              <div className="p-4 bg-gray-50 border-l-4 border-gray-400">
                <p className="text-gray-700 whitespace-pre-line">{tender.terms_conditions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {isOpen ? (
            <button
              onClick={onBid}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Clock className="h-4 w-4 mr-2" />
              Submit Bid
            </button>
          ) : (
            <span className="px-6 py-2 bg-gray-100 text-gray-500 rounded-lg">
              Tender Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicTenderModal;