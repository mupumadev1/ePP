import React, { useState } from 'react';
import { Search, Filter, FileText, Eye, Edit, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateTenderForm from './CreateTenderForm.jsx';
import TenderDetailsModal from "./TenderDetailsModal.jsx";
import EvaluationView from "./EvaluationView.jsx";


const TendersView = ({ tenders, error = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
    const [selectedTender, setSelectedTender] = useState(null);
    const [action, setAction] = useState(null); // "view" | "edit" | "evaluate"


    const handleAction = (tender, type) => {
      setSelectedTender(tender);
      setAction(type);
    };
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'evaluation': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'awarded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filtered = tenders.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (
      t.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tender Management</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Create Tender
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="evaluation">Under Evaluation</option>
            <option value="closed">Closed</option>
            <option value="awarded">Awarded</option>
          </select>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tender Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bids</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((tender) => (
              <tr key={tender.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/tenders/${tender.id}`} className="block group">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-blue-700 group-hover:underline">{tender.reference_number}</div>
                    </div>
                    <div className="text-sm text-gray-600 group-hover:text-gray-800">{tender.title}</div>
                    <div className="text-xs text-gray-400">{tender.procuring_entity}</div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tender.status)}`}>
                    {tender.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tender.total_bids}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">ZMW {tender.estimated_value?.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tender.closing_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button className="text-blue-600 hover:text-blue-900" onClick={() => handleAction(tender, "view")} ><Eye className="h-4 w-4" /></button>
                    <button className="text-green-600 hover:text-green-900" onClick={() => handleAction(tender, "edit")}><Edit className="h-4 w-4" /></button>
                    <button className="text-purple-600 hover:text-purple-900" onClick={() => handleAction(tender ,"evaluate")}><FileCheck className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateTenderForm
          onCancel={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
        {action === "view" && selectedTender && (
      <TenderDetailsModal
        tender={selectedTender}
        onClose={() => setAction(null)}
      />
    )}

    {action === "edit" && selectedTender && (
      <CreateTenderForm
        tender={selectedTender}
        onCancel={() => setAction(null)}
        onSuccess={() => setAction(null)}
      />
    )}

    {action === "evaluate" && selectedTender && (
      <EvaluationView
       tenders={tenders.filter(t => t.status === 'evaluation')}
              onSelectTender={setSelectedTender}
      />
    )}

    </div>
  );
};

export default TendersView;
