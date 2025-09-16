import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../base/AppLayout.jsx';
import axiosInstance from '../../../api/axiosInstance.jsx';
import BidSubmissionForm from '../../BidForm.jsx';
import { createOrSaveBid, submitBid, uploadBidDocuments } from '../../../api/bids.js';

const BidSubmission = ({ onLogout }) => {
  const { tenderId } = useParams();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/tenders/${tenderId}/`);
        if (mounted) setTender(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message || 'Failed to load tender');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (tenderId) load();
    return () => { mounted = false; };
  }, [tenderId]);

  const handleSave = async (data) => {
    try {
      const saved = await createOrSaveBid(tenderId, data);
      return { success: true, data: saved };
    } catch (e) {
      throw new Error(e?.response?.data?.error || e.message || 'Failed to save bid');
    }
  };

  const handleSubmit = async (data) => {
    try {
      // First create/save to get bid id
      const saved = await createOrSaveBid(tenderId, data);
      const bidId = saved?.id || saved?.bid?.id;
      if (data.documents?.length && bidId) {
        await uploadBidDocuments(bidId, data.documents.map(d => d.file).filter(Boolean));
      }
      if (bidId) {
        await submitBid(bidId);
      }
      return { success: true };
    } catch (e) {
      throw new Error(e?.response?.data?.error || e.message || 'Failed to submit bid');
    }
  };

  return (
    <AppLayout title="Submit Bid" onLogout={onLogout}>
      <div className="p-6">
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        ) : !tender ? (
          <div className="text-gray-600">Not found</div>
        ) : (
          <BidSubmissionForm tender={tender} onSave={handleSave} onSubmit={handleSubmit} />
        )}
      </div>
    </AppLayout>
  );
};

export default BidSubmission;
