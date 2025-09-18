import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance.jsx';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminSupplierVerifications = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/users/suppliers/pending/');
      const results = Array.isArray(res?.data?.results) ? res.data.results : [];
      setItems(results);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load pending suppliers');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (userId, type) => {
    try {
      await axiosInstance.patch(`/users/suppliers/${userId}/verify/`, { action: type });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || `Failed to ${type} supplier`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Supplier Verifications</h1>
        <button onClick={load} className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
      )}

      {loading ? (
        <div className="p-6 bg-white rounded shadow">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-6 bg-white rounded shadow">No pending supplier registrations.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Reg No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{it.user_full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.user_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.business_reg_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.business_category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{typeof it.years_of_experience === 'number' ? it.years_of_experience : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => action(it.user, 'verify')} className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" /> Verify
                    </button>
                    <button onClick={() => action(it.user, 'reject')} className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <Link to="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default AdminSupplierVerifications;
