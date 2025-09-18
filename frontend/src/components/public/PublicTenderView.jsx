// Create: frontend/src/components/public/PublicTendersView.jsx

import React, { useEffect, useState } from 'react';
import { Search, Filter, FileText, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance.jsx';
import PublicTenderModal from './PublicTenderViewModal.jsx';
import LoginPromptModal from '../LoginPromptModal.jsx';

const PublicTendersView = () => {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedTender, setSelectedTender] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const loadPublicTenders = async () => {
      try {
        setLoading(true);
        setError(null);
        // Only fetch published tenders for public view
        const res = await axiosInstance.get('/tenders/public/');
        const data = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
        setTenders(data);
      } catch (e) {
        setError('Failed to load tenders');
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };

    loadPublicTenders();
  }, []);

  const handleBidClick = (tender) => {
    setSelectedTender(tender);
    setShowLoginPrompt(true);
  };

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: {
        returnTo: window.location.pathname,
        message: 'Please login as a supplier to submit bids'
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'evaluation': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOpen = (tender) => {
    if (tender.status !== 'published') return false;
    const closingDate = new Date(tender.closing_date);
    return closingDate > new Date();
  };

  const getDaysRemaining = (closingDate) => {
    const now = new Date();
    const closing = new Date(closingDate);
    const diffTime = closing - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const filtered = tenders.filter(t =>
    (filterCategory === 'all' || t.category === filterCategory) &&
    (
      t.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.procuring_entity?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">Current Tenders</h1>
                <p className="text-sm text-gray-500">Browse available procurement opportunities</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Register as Supplier
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="works">Works</option>
            </select>
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-2">Total:</span>
              <span className="font-semibold">{filtered.length} tenders</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            <div className="text-gray-600">Loading tenders...</div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 text-center">{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tenders found</h3>
            <p className="text-gray-500">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((tender) => (
              <div key={tender.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tender.status)}`}>
                          {tender.status}
                        </span>
                        {isOpen(tender) && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Open
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {tender.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Ref: {tender.reference_number}
                      </p>
                    </div>
                  </div>

                  {/* Entity */}
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{tender.procuring_entity}</span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                    {tender.description}
                  </p>

                  {/* Value and Date */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Estimated Value:</span>
                      <div className="font-medium">
                        {tender.estimated_value
                          ? `ZMW ${Number(tender.estimated_value).toLocaleString()}`
                          : 'Not disclosed'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Closes:</span>
                      <div className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(tender.closing_date).toLocaleDateString()}
                      </div>
                      {isOpen(tender) && (
                        <div className="text-xs text-orange-600">
                          {getDaysRemaining(tender.closing_date)} days remaining
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <button
                      onClick={() => setSelectedTender(tender)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                    {isOpen(tender) ? (
                      <button
                        onClick={() => handleBidClick(tender)}
                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Submit Bid
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">Closed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTender && (
        <PublicTenderModal
          tender={selectedTender}
          onClose={() => setSelectedTender(null)}
          onBid={() => handleBidClick(selectedTender)}
        />
      )}

      {showLoginPrompt && (
        <LoginPromptModal
          tender={selectedTender}
          onClose={() => setShowLoginPrompt(false)}
          onLogin={handleLoginRedirect}
        />
      )}
    </div>
  );
};

export default PublicTendersView;