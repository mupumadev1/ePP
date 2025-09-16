import React from 'react';

export default function ContractPerformance({ contract }) {
  if (!contract) return null;
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="text-gray-900 font-medium">{contract.contract_number} — {contract.title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
        <div>
          <div className="text-gray-500">Value</div>
          <div>{contract.currency} {Number(contract.value).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Period</div>
          <div>{contract.start_date} → {contract.end_date}</div>
        </div>
        <div>
          <div className="text-gray-500">Status</div>
          <div>{contract.status}</div>
        </div>
      </div>
    </div>
  );
}

