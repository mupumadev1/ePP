import React from 'react';
import { Users, Building, FileText } from 'lucide-react';


const EvaluationView = ({ tenders, onSelectTender }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bid Evaluation</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Create Committee
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Tenders Under Evaluation</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {tenders.map((tender) => (
                <div key={tender.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{tender.reference_number}</h4>
                      <p className="text-sm text-gray-600 mt-1">{tender.title}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Building className="h-4 w-4 mr-1" />
                        {tender.procuring_entity}
                        <span className="mx-2">•</span>
                        <FileText className="h-4 w-4 mr-1" />
                        {tender.total_bids} bids
                      </div>
                    </div>
                    {onSelectTender ? (
                      <button
                        onClick={() => onSelectTender(tender)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Evaluate
                      </button>
                    ) : (
                      <a
                        href={`/tenders/${tender.id}/evaluate`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 inline-block"
                      >
                        Evaluate
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Evaluation Summary</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">8</div>
                <div className="text-sm text-gray-500">Pending Evaluations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">24</div>
                <div className="text-sm text-gray-500">Completed This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">3.2</div>
                <div className="text-sm text-gray-500">Avg. Days to Complete</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationView;
