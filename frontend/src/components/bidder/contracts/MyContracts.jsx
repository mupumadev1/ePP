import React, { useEffect, useState } from 'react';
import { fetchMyContracts } from '../../../api/bids.js';

export default function MyContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyContracts();
        setContracts(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {contracts.map((c) => (
        <div key={c.id} className="bg-white border border-gray-200 rounded p-4">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-900 font-medium">{c.contract_number} — {c.title}</div>
              <div className="text-sm text-gray-600">Tender: {c.tender_reference}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">{c.currency} {Number(c.value).toLocaleString()}</div>
              <div className="text-xs text-gray-500">{c.status}</div>
            </div>
          </div>
        </div>
      ))}
      {contracts.length === 0 && (
        <div className="text-sm text-gray-500">No contracts yet.</div>
      )}
    </div>
  );
}

