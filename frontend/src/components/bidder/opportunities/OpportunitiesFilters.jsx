import React from 'react';

const OpportunitiesFilters = ({ filters, onChange }) => {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Search title or reference"
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        <select
          value={filters.category || ''}
          onChange={(e) => update({ category: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded"
        >
          <option value="">All Categories</option>
          <option value="goods">Goods</option>
          <option value="works">Works</option>
          <option value="services">Services</option>
        </select>
        <select
          value={filters.status || ''}
          onChange={(e) => update({ status: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded"
        >
          <option value="">Any Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.ordering || ''}
          onChange={(e) => update({ ordering: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded"
        >
          <option value="-created">Newest</option>
          <option value="closing_date">Closing Soon</option>
        </select>
      </div>
    </div>
  );
};

export default OpportunitiesFilters;
