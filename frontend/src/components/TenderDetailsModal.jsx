import { X } from "lucide-react";

const TenderDetailsModal = ({ tender, onClose }) => {
  if (!tender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Tender Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Reference</h4>
            <p className="text-gray-900">{tender.reference_number || tender.referenceNumber}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700">Title</h4>
            <p className="text-gray-900">{tender.title}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Category</h4>
              <p className="text-gray-900">{tender.category_name || tender.categoryName || tender.category || '—'}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Subcategory</h4>
              <p className="text-gray-900">{tender.subcategory_name || tender.subcategoryName || tender.subcategory || '—'}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700">Procuring Entity</h4>
            <p className="text-gray-900">{tender.procuring_entity}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700">Estimated Value</h4>
            <p className="text-gray-900">
              ZMW {Number(tender.estimated_value || tender.estimatedValue || 0).toLocaleString()}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700">Closing Date</h4>
            <p className="text-gray-900">{tender.closing_date || tender.closingDate}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700">Status</h4>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {tender.status}
            </span>
          </div>

          {tender.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700">Description</h4>
              <p className="text-gray-700 text-sm">{tender.description}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenderDetailsModal;
