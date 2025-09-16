import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../base/AppLayout.jsx';
import axiosInstance from '../../../api/axiosInstance.jsx';

const OpportunitiesDetail = ({ onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/tenders/${id}/`);
        if (mounted) setTender(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message || 'Failed to load tender');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  return (
    <AppLayout title="Opportunity" onLogout={onLogout}>
      <div className="p-6">
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        ) : !tender ? (
          <div className="text-gray-600">Not found</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{tender.title}</h1>
                <div className="text-sm text-gray-500">Ref: {tender.referenceNumber}</div>
              </div>
              <button
                onClick={() => navigate(`/bidder/opportunities/${id}/bid`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Bid
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="font-medium mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{tender.description}</p>
              </div>
              <div>
                <h2 className="font-medium mb-2">Details</h2>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>Category: {tender.category || 'N/A'}</li>
                  <li>Closing Date: {tender.closingDate ? new Date(tender.closingDate).toLocaleString() : 'N/A'}</li>
                  <li>Currency: {tender.currency || 'ZMW'}</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <Link to="/bidder/opportunities" className="text-blue-600">Back to opportunities</Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OpportunitiesDetail;
