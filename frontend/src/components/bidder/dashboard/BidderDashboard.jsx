import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../base/AppLayout.jsx';
import { fetchMyBids } from '../../../api/bids.js';

const StatCard = ({ title, value, to }) => (
  <Link to={to} className="bg-white rounded-lg shadow hover:shadow-md p-5 block">
    <div className="text-gray-500 text-sm">{title}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
  </Link>
);

const RecentBid = ({ bid }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-b-0">
    <div>
      <div className="font-medium text-gray-900">{bid.tender_title || bid.tender?.title || 'Tender'}</div>
      <div className="text-xs text-gray-500">Ref: {bid.tender_reference || bid.tender?.referenceNumber}</div>
    </div>
    <div className="text-sm">
      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{bid.status}</span>
    </div>
  </div>
);

const BidderDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState({ total: 0, drafts: 0, submitted: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchMyBids({ page_size: 5 });
        if (!mounted) return;
        const bids = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const total = bids.length;
        const drafts = bids.filter(b => (b.status || '').toLowerCase() === 'draft').length;
        const submitted = bids.filter(b => (b.status || '').toLowerCase() === 'submitted').length;
        setStats({ total, drafts, submitted });
        setRecent(bids.slice(0, 5));
      } catch (e) {
        console.error('Failed to load my bids', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout title="Bidder" onLogout={onLogout}>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="My Bids" value={stats.total} to="/bidder/bids" />
          <StatCard title="Drafts" value={stats.drafts} to="/bidder/bids" />
          <StatCard title="Submitted" value={stats.submitted} to="/bidder/bids" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent Bids</h2>
              <Link to="/bidder/bids" className="text-blue-600 text-sm">View all</Link>
            </div>
            {loading ? (
              <div className="text-gray-500">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="text-gray-500">No recent bids.</div>
            ) : (
              <div>
                {recent.map((b) => <RecentBid key={b.id} bid={b} />)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold mb-3">Quick Links</h2>
            <ul className="space-y-2 text-blue-600">
              <li><Link to="/bidder/opportunities">Browse Opportunities</Link></li>
              <li><Link to="/bidder/bids">My Bids</Link></li>
              <li><Link to="/contracts">Contracts</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BidderDashboard;
