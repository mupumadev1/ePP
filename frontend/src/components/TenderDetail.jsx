import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.jsx';
import Evaluation from './Evaluation.jsx';
import CreateTenderForm from './CreateTenderForm.jsx';
import TenderCriteriaSetup from './TenderCriteriaSetup.jsx';

const TenderDetail = () => {
  const { tenderId } = useParams();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'evaluate' | 'criteria' | 'edit'

  useEffect(() => {
    const loadTender = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axiosInstance.get(`/tenders/${tenderId}/`);
        setTender(res.data);
        // Initialize mode from query param
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === '1') {
          setMode('edit');
        }
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load tender');
        setTender(null);
      } finally {
        setLoading(false);
      }
    };
    if (tenderId) loadTender();
  }, [tenderId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
        <div className="text-gray-600">Loading tender…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        <Link to="/tenders" className="text-blue-500 hover:underline">Back to Tenders</Link>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Tender not found.</div>
        <Link to="/tenders" className="text-blue-500 hover:underline">Back to Tenders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600">Reference: {tender.reference_number}</div>
              <h1 className="text-2xl font-bold text-gray-900">{tender.title}</h1>
              {tender.procuring_entity && (
                <div className="text-sm text-gray-500 mt-1">{tender.procuring_entity}</div>
              )}
              <div className="mt-2 text-sm text-gray-500">
                Status: <span className="font-medium text-gray-800">{tender.status}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-sm text-gray-600">Change Status:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={tender.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    if (!newStatus || newStatus === tender.status) return;
                    try {
                      await axiosInstance.patch(`/tenders/${tenderId}/update/`, { status: newStatus });
                      // Re-fetch detail to update allowed_transitions and other fields
                      const detail = await axiosInstance.get(`/tenders/${tenderId}/`);
                      setTender(detail.data);
                    } catch (err) {
                      alert(err?.response?.data?.error || err?.response?.data?.status?.[0] || 'Failed to update status');
                    }
                  }}
                  disabled={!tender.allowed_transitions || tender.allowed_transitions.length === 0}
                >
                  <option value={tender.status}>{tender.status}</option>
                  {(tender.allowed_transitions || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('view')}
                className={`px-3 py-2 rounded ${mode === 'view' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >Overview</button>
              <button
                onClick={() => setMode('evaluate')}
                className={`px-3 py-2 rounded ${mode === 'evaluate' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
              >Evaluate</button>
              <button
                onClick={() => setMode('criteria')}
                className={`px-3 py-2 rounded ${mode === 'criteria' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
              >Criteria</button>
              <button
                onClick={() => setMode('edit')}
                className={`px-3 py-2 rounded ${mode === 'edit' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
              >Edit</button>
            </div>
          </div>
        </div>

        {mode === 'view' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Estimated Value</div>
                <div className="font-medium">ZMW {Number(tender.estimated_value || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Closing Date</div>
                <div className="font-medium">{tender.closing_date}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Description</div>
              <div className="text-gray-800 whitespace-pre-line">{tender.description || '—'}</div>
            </div>
          </div>
        )}

        {mode === 'evaluate' && (
          <div className="bg-white rounded-lg shadow">
            <Evaluation tender={tender} embedded onClose={() => setMode('view')} />
          </div>
        )}

        {mode === 'criteria' && (
          <div className="bg-white rounded-lg shadow">
            <TenderCriteriaSetup />
          </div>
        )}

        {mode === 'edit' && (
          <div className="bg-white rounded-lg shadow p-6">
            <CreateTenderForm
              tender={tender}
              onCancel={() => setMode('view')}
              onSuccess={(updated) => {
                // After successful edit, refresh tender data and return to view
                if (updated) {
                  setTender(updated);
                }
                setMode('view');
              }}
            />
          </div>
        )}

        <div>
          <Link to="/tenders" className="text-blue-600 hover:underline">Back to Tenders</Link>
        </div>
      </div>


  );
};

export default TenderDetail;
