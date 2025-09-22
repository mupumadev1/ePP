import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance.jsx';

const AdminProfileEditRequests = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [detail, setDetail] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/users/admin/profile-edits/pending/');
      setItems(res.data.results || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load edit requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    setDetail(null);
    setActionStatus(null);
    try {
      const res = await axios.get(`/users/admin/profile-edits/${id}/`);
      setDetail(res.data);
    } catch (e) {
      setActionStatus({ type: 'error', message: e?.response?.data?.error || e.message });
    }
  };

  const review = async (id, action) => {
    setActionStatus(null);
    try {
      const res = await axios.patch(`/users/admin/profile-edits/${id}/review/`, { action });
      setActionStatus({ type: 'success', message: res.data.message });
      await load();
      await openDetail(id);
    } catch (e) {
      setActionStatus({ type: 'error', message: e?.response?.data?.error || e.message });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Profile Edit Requests</h1>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Pending</h2>
            <div className="bg-white rounded shadow divide-y">
              {items.length === 0 && <div className="p-3 text-gray-500">No pending requests.</div>}
              {items.map((it) => (
                <div key={it.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(it.id)}>
                  <div className="text-sm text-gray-600">{it.requester_email}</div>
                  <div className="font-medium">{it.target} #{it.target_id || ''}</div>
                  <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Details</h2>
            {!detail ? (
              <div className="p-3 text-gray-500 bg-white rounded shadow">Select a request to view details.</div>
            ) : (
              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-600 mb-2">From: {detail.requester_email}</div>
                <div className="mb-2">Target: <span className="font-mono">{detail.target}</span> {detail.target_id ? `#${detail.target_id}` : ''}</div>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">{JSON.stringify(detail.proposed_changes, null, 2)}</pre>
                <div className="mt-4 space-x-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={() => review(detail.id, 'approve')}>Approve</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => review(detail.id, 'reject')}>Reject</button>
                </div>
                {actionStatus && (
                  <div className={`mt-3 p-2 rounded ${actionStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{actionStatus.message}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileEditRequests;
