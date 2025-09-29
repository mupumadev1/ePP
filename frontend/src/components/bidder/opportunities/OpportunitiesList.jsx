import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../base/AppLayout.jsx';
import { fetchOpportunities } from '../../../api/bids.js';
import OpportunitiesFilters from './OpportunitiesFilters.jsx';

const OpportunityCard = ({ opp }) => (
  <div className="bg-white rounded-lg shadow p-5 flex flex-col">
    <div className="flex-1">
      <div className="text-xs text-gray-500">Ref: {opp.reference_number || opp.referenceNumber}</div>
      <h3 className="text-lg font-semibold text-gray-900">{opp.title}</h3>
      {(opp.category_name || opp.categoryName || opp.category || opp.subcategory_name || opp.subcategoryName || opp.subcategory) && (
        <div className="mt-1 flex flex-wrap gap-2">
          {opp.category_name || opp.categoryName || opp.category ? (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {opp.category_name || opp.categoryName || opp.category}
            </span>
          ) : null}
          {opp.subcategory_name || opp.subcategoryName || opp.subcategory ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              {opp.subcategory_name || opp.subcategoryName || opp.subcategory}
            </span>
          ) : null}
        </div>
      )}
      <p className="text-sm text-gray-700 mt-2 line-clamp-3">{opp.description}</p>
    </div>
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <div>Closes: {opp.closing_date ? new Date(opp.closing_date).toLocaleString() : opp.closingDate ? new Date(opp.closingDate).toLocaleString() : 'N/A'}</div>
      <Link to={`/bidder/opportunities/${opp.id}`} className="text-blue-600">View</Link>
    </div>
  </div>
);

const OpportunitiesList = ({ onLogout }) => {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetchOpportunities(filters);
        const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
        if (mounted) setData(list);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message || 'Failed to load opportunities');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    setLoading(true);
    load();
    return () => { mounted = false; };
  }, [JSON.stringify(filters)]);

  return (
    <AppLayout title="Opportunities" onLogout={onLogout}>
      <div className="p-6">
        <OpportunitiesFilters filters={filters} onChange={setFilters} />
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">No opportunities found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((o) => <OpportunityCard key={o.id} opp={o} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OpportunitiesList;
