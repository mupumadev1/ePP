import React, { useEffect, useState } from 'react';
import AppLayout from '../../base/AppLayout.jsx';
import { fetchMyBids, changeBidStatus, unsubmitBid } from '../../../api/bids.js';

const StatusBadge = ({ status }) => {
  const color = (status || '').toLowerCase() === 'submitted' ? 'green' : 'gray';
  return <span className={`px-2 py-1 rounded bg-${color}-100 text-${color}-700 text-xs`}>{status || 'N/A'}</span>;
};

const BidStatus = ({ onLogout }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchMyBids();
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        if (mounted) setBids(list);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message || 'Failed to load bids');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout title="My Bids" onLogout={onLogout}>
      <div className="p-6">
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        ) : bids.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">You have not created any bids yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="p-3">Tender</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="p-3">{b.tender_title || b.tender?.title}</td>
                    <td className="p-3">{b.tender_reference || b.tender?.referenceNumber}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                    <td className="p-3">{b.total_bid_amount || b.totalBidAmount || '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {(b.status !== 'submitted') && (
                          <button onClick={async ()=>{ await changeBidStatus(b.id, 'submitted'); window.location.reload(); }} className="text-blue-600 text-sm">Submit</button>
                        )}
                        {(b.status === 'submitted') && (
                          <button onClick={async ()=>{ await unsubmitBid(b.id); window.location.reload(); }} className="text-yellow-700 text-sm">Unsubmit</button>
                        )}
                        {(b.status !== 'withdrawn') && (
                          <button onClick={async ()=>{ await changeBidStatus(b.id, 'withdrawn'); window.location.reload(); }} className="text-red-600 text-sm">Withdraw</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BidStatus;
