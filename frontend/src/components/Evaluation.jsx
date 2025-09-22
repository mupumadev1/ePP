import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Download, Users, FileText, Calculator, Plus, Save, AlertCircle,
  CheckCircle, Clock, User, Star, Upload, Eye, ExternalLink
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance.jsx';

// API functions wired to backend
const api = {
  // Get evaluation config
  getEvaluationConfig: async (tenderId) => {
    const res = await axiosInstance.get(`/bids/tenders/${tenderId}/evaluation/config`);
    return res.data;
  },

  // Get criteria for tender
  getCriteria: async (tenderId) => {
    const res = await axiosInstance.get(`/bids/tenders/${tenderId}/evaluation/criteria`);
    console.log(res.data)
    return res.data;
  },

  // Get or create evaluation for current user
  getOrCreateEvaluation: async (bidId) => {
    const res = await axiosInstance.post(`/bids/evaluations/`, { bid_id: bidId });
    return res.data;
  },

  // Save criterion scores
  saveCriterionScores: async (evaluationId, scores) => {
    const res = await axiosInstance.post(`/bids/evaluations/${evaluationId}/scores`, { items: scores });
    return res.data;
  },

  // Recompute evaluation totals
  recomputeEvaluation: async (evaluationId) => {
    const res = await axiosInstance.post(`/bids/evaluations/${evaluationId}/recompute`);
    return res.data;
  },

  // Get committee info
  getCommittee: async (tenderId) => {
    const res = await axiosInstance.get(`/tenders/${tenderId}/evaluation/committee/`);
    return res.data;
  },

  // Submit final recommendation
  submitRecommendation: async (tenderId, data) => {
    const res = await axiosInstance.post(`/tenders/${tenderId}/evaluation/recommendation/`, data);
    return res.data;
  }
};

// Enhanced Tab Button with status indicators
function TabButton({ active, onClick, children, status, count }) {
  const getStatusColor = () => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return active ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 border transition-colors ${getStatusColor()}`}
    >
      {status === 'complete' && <CheckCircle className="h-4 w-4" />}
      {status === 'partial' && <Clock className="h-4 w-4" />}
      {status === 'error' && <AlertCircle className="h-4 w-4" />}
      {children}
      {count !== undefined && (
        <span className={`px-2 py-1 rounded-full text-xs ${
          active && !status ? 'bg-blue-400' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Compliance Evaluation Tab
function ComplianceTab({
  bids,
  criteria,
  evaluations,
  onScoreUpdate,
  config,
  savingStates
}) {
  const complianceCriteria = criteria.filter(c => c.section === 'compliance');

  if (complianceCriteria.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900">No Compliance Criteria</h4>
        <p className="text-sm text-yellow-700 mt-1">
          No compliance criteria have been configured for this tender.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900">Compliance Evaluation</h4>
        <p className="text-sm text-blue-700 mt-1">
          Evaluate mandatory requirements. Non-compliant bids will be automatically disqualified.
        </p>
        {config?.compliance_required && (
          <div className="mt-2 text-xs text-blue-600">
            Compliance gate enabled: Failed mandatory items will disqualify bid
          </div>
        )}
      </div>

      {bids.map((bid) => {
        const evaluation = evaluations[bid.id];
        const isLoading = savingStates[bid.id];

        return (
          <div key={bid.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {bid.bidder_name}
                  {isLoading && <Clock className="h-4 w-4 animate-spin text-blue-500" />}
                </div>
                <div className="text-sm text-gray-500">
                  Bid Amount: {bid.currency} {bid.submitted_amount?.toLocaleString()}
                </div>
                {evaluation?.technical_compliance !== undefined && (
                  <div className={`text-sm mt-1 flex items-center gap-1 ${
                    evaluation.technical_compliance ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {evaluation.technical_compliance ?
                      <CheckCircle className="h-4 w-4" /> :
                      <AlertCircle className="h-4 w-4" />
                    }
                    Overall: {evaluation.technical_compliance ? 'Compliant' : 'Non-Compliant'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {complianceCriteria.map((criterion) => {
                const score = evaluation?.criterion_scores?.[criterion.id];
                const passed = score?.score > 0;

                return (
                  <div key={criterion.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium text-gray-900">{criterion.name}</h5>
                        {criterion.description && (
                          <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                        )}
                        {criterion.mandatory && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 mt-1">
                            Mandatory
                          </span>
                        )}
                      </div>
                    </div>

                    {criterion.criterion_type === 'boolean' ? (
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`compliance-${bid.id}-${criterion.id}`}
                            checked={passed}
                            onChange={() => onScoreUpdate(bid.id, criterion.id, {
                              score: criterion.max_points,
                              comments: score?.comments || ''
                            })}
                            className="cursor-pointer"
                          />
                          <span className="text-green-700 font-medium">Pass</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`compliance-${bid.id}-${criterion.id}`}
                            checked={!passed}
                            onChange={() => onScoreUpdate(bid.id, criterion.id, {
                              score: 0,
                              comments: score?.comments || ''
                            })}
                            className="cursor-pointer"
                          />
                          <span className="text-red-700 font-medium">Fail</span>
                        </label>
                      </div>
                    ) : criterion.criterion_type === 'score' ? (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Score (0 - {criterion.max_points})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={criterion.max_points}
                          step="0.01"
                          value={score?.score || ''}
                          onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                            score: parseFloat(e.target.value) || 0,
                            comments: score?.comments || ''
                          })}
                          className="w-32 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        Upload requirement - automatically scored based on document submission
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        value={score?.comments || ''}
                        onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                          score: score?.score || 0,
                          comments: e.target.value
                        })}
                        placeholder="Add evaluation comments..."
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Technical Evaluation Tab
function TechnicalTab({
  bids,
  criteria,
  evaluations,
  onScoreUpdate,
  config,
  savingStates
}) {
  const technicalCriteria = criteria.filter(c => c.section === 'technical');

  if (technicalCriteria.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No technical criteria configured for this tender.
      </div>
    );
  }

  // Filter to only compliant bids if compliance is required
  const eligibleBids = config?.compliance_required
    ? bids.filter(bid => evaluations[bid.id]?.technical_compliance === true)
    : bids;

  if (config?.compliance_required && eligibleBids.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Complete compliance evaluation first. Only compliant bids can be technically evaluated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900">Technical Evaluation</h4>
        <p className="text-sm text-green-700 mt-1">
          Score each criterion. Weights: {technicalCriteria.map(c => `${c.name}: ${c.weight}%`).join(', ')}
        </p>
        {config?.technical_pass_mark && (
          <div className="mt-1 text-sm text-green-700">
            Technical pass mark: {config.technical_pass_mark}%
          </div>
        )}
      </div>

      {technicalCriteria.map((criterion) => (
        <div key={criterion.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-gray-900">{criterion.name}</h4>
              {criterion.description && (
                <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
              )}
            </div>
            <div className="text-sm text-gray-500 text-right">
              <div>Max: {criterion.max_points}</div>
              <div>Weight: {criterion.weight}%</div>
              {criterion.mandatory && (
                <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                  Mandatory
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleBids.map((bid) => {
              const evaluation = evaluations[bid.id];
              const score = evaluation?.criterion_scores?.[criterion.id];
              const isLoading = savingStates[bid.id];

              return (
                <div key={bid.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    {bid.bidder_name}
                    {isLoading && <Clock className="h-4 w-4 animate-spin text-blue-500" />}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Score (0-{criterion.max_points})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={criterion.max_points}
                        step="0.01"
                        value={score?.score || ''}
                        onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                          score: parseFloat(e.target.value) || 0,
                          comments: score?.comments || ''
                        })}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder={`0-${criterion.max_points}`}
                      />
                    </div>

                    {score?.score > 0 && (
                      <div className="text-xs text-gray-600">
                        Weighted: {((score.score / criterion.max_points) * criterion.weight).toFixed(1)}%
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        value={score?.comments || ''}
                        onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                          score: score?.score || 0,
                          comments: e.target.value
                        })}
                        placeholder="Evaluation comments..."
                        className="w-full border border-gray-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Financial Evaluation Tab
function FinancialTab({
  bids,
  criteria,
  evaluations,
  onScoreUpdate,
  config,
  savingStates
}) {
  const financialCriteria = criteria.filter(c => c.section === 'financial');

  // Filter eligible bids
  const eligibleBids = config?.compliance_required
    ? bids.filter(bid => evaluations[bid.id]?.technical_compliance === true)
    : bids;

  if (config?.compliance_required && eligibleBids.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Complete compliance evaluation first. Only compliant bids can be financially evaluated.
        </p>
      </div>
    );
  }

  const financialMethod = config?.financial_method || 'lowest_price';
  const prices = eligibleBids.map(b => b.submitted_amount).filter(Boolean);
  const lowestPrice = prices.length ? Math.min(...prices) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900">Financial Evaluation</h4>
        <p className="text-sm text-purple-700 mt-1">
          Method: {financialMethod === 'lowest_price' ? 'Lowest Price Wins' : 'Criteria-Based Scoring'}
        </p>
        {lowestPrice > 0 && (
          <p className="text-sm text-purple-700 mt-1">
            Lowest responsive price: {bids[0]?.currency} {lowestPrice.toLocaleString()}
          </p>
        )}
      </div>

      {financialMethod === 'lowest_price' ? (
        <div className="space-y-4">
          {eligibleBids.map((bid) => {
            const evaluation = evaluations[bid.id];
            const price = bid.submitted_amount;
            const financialScore = price && lowestPrice ? Math.round((lowestPrice / price) * 100) : 0;
            const isLoading = savingStates[bid.id];

            return (
              <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">{bid.bidder_name}</div>
                    {isLoading && <Clock className="h-4 w-4 animate-spin text-blue-500" />}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {bid.currency} {price?.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Financial Score: {financialScore}/100
                    </div>
                  </div>
                </div>
                {price === lowestPrice && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    <Star className="h-3 w-3 mr-1" />
                    Lowest Price
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Criteria-based financial evaluation
        <div className="space-y-6">
          {financialCriteria.map((criterion) => (
            <div key={criterion.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{criterion.name}</h4>
                  {criterion.description && (
                    <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Max: {criterion.max_points} | Weight: {criterion.weight}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligibleBids.map((bid) => {
                  const evaluation = evaluations[bid.id];
                  const score = evaluation?.criterion_scores?.[criterion.id];
                  const isLoading = savingStates[bid.id];

                  return (
                    <div key={bid.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                        {bid.bidder_name}
                        {isLoading && <Clock className="h-4 w-4 animate-spin text-blue-500" />}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Score (0-{criterion.max_points})
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={criterion.max_points}
                            step="0.01"
                            value={score?.score || ''}
                            onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                              score: parseFloat(e.target.value) || 0,
                              comments: score?.comments || ''
                            })}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Comments
                          </label>
                          <textarea
                            value={score?.comments || ''}
                            onChange={(e) => onScoreUpdate(bid.id, criterion.id, {
                              score: score?.score || 0,
                              comments: e.target.value
                            })}
                            placeholder="Comments..."
                            className="w-full border border-gray-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Enhanced Summary Tab
function SummaryTab({
  bids,
  evaluations,
  config,
  onSubmitRecommendation,
  submitting
}) {
  const summaryRows = useMemo(() => {
    return bids
      .map(bid => {
        const evaluation = evaluations[bid.id];
        if (!evaluation) return null;

        return {
          id: bid.id,
          bidder: bid.bidder_name,
          price: bid.submitted_amount,
          currency: bid.currency,
          technicalScore: evaluation.technical_score || 0,
          financialScore: evaluation.financial_score || 0,
          overallScore: evaluation.overall_score || 0,
          compliant: evaluation.technical_compliance,
          recommendation: evaluation.recommendation
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [bids, evaluations]);

  const compliantBids = summaryRows.filter(row => row.compliant);
  const winner = compliantBids[0];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-500" />
          <h4 className="font-medium text-blue-900">Evaluation Summary</h4>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Combined scoring: Technical ({config?.technical_weight || 70}%) +
          Financial ({config?.financial_weight || 30}%)
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Bidder</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Compliance</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Technical</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Financial</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Overall</th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">Bid Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summaryRows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${
                    row.rank === 1 && row.compliant ? 'bg-green-50' : 
                    !row.compliant ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      row.rank === 1 && row.compliant ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.bidder}</td>
                  <td className="px-4 py-3 text-center">
                    {row.compliant === true ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : row.compliant === false ? (
                      <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{row.technicalScore.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">{row.financialScore.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${
                      row.rank === 1 && row.compliant ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {row.overallScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.currency} {row.price?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                      !row.compliant ? 'bg-red-100 text-red-700' :
                      row.rank === 1 ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {!row.compliant ? 'Disqualified' :
                       row.rank === 1 ? 'Recommended' : 'Evaluated'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {winner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Recommendation
          </h4>
          <p className="text-sm text-green-700 mt-1">
            <strong>{winner.bidder}</strong> is recommended for award with an overall score of{' '}
            {winner.overallScore.toFixed(1)}/100 and bid amount of{' '}
            {winner.currency} {winner.price?.toLocaleString()}.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </button>
        <button
          disabled={submitting || summaryRows.length === 0}
          onClick={onSubmitRecommendation}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Submit Recommendation'}
        </button>
      </div>
    </div>
  );
}

// Committee Management Tab
function CommitteeTab({ committee, onUpdateCommittee, currentUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    chairperson_id: '',
    members: []
  });

  useEffect(() => {
    if (committee) {
      setEditForm({
        name: committee.name || '',
        chairperson_id: committee.chairperson_id || '',
        members: committee.members || []
      });
    }
  }, [committee]);

  const handleAddMember = () => {
    const newMember = {
      id: Date.now(), // temporary ID
      user_id: '',
      name: '',
      role: 'member',
      expertise: ''
    };
    setEditForm(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }));
  };

  const handleRemoveMember = (index) => {
    setEditForm(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const handleMemberChange = (index, field, value) => {
    setEditForm(prev => ({
      ...prev,
      members: prev.members.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const handleSave = async () => {
    try {
      await onUpdateCommittee(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save committee:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Evaluation Committee</h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Edit Committee
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Committee
              </button>
            </>
          )}
        </div>
      </div>

      {!committee && !isEditing ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No evaluation committee configured.</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Create Committee
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Committee Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Evaluation Committee"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chairperson User ID
                    </label>
                    <input
                      type="text"
                      value={editForm.chairperson_id}
                      onChange={(e) => setEditForm(prev => ({ ...prev, chairperson_id: e.target.value }))}
                      placeholder="Enter user ID"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Committee Members</h4>
                  <button
                    onClick={handleAddMember}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </button>
                </div>

                <div className="space-y-3">
                  {editForm.members.map((member, index) => (
                    <div key={member.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border border-gray-100 rounded">
                      <input
                        type="text"
                        placeholder="User ID"
                        value={member.user_id}
                        onChange={(e) => handleMemberChange(index, 'user_id', e.target.value)}
                        className="border border-gray-300 rounded p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        className="border border-gray-300 rounded p-2 text-sm"
                      />
                      <select
                        value={member.role}
                        onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                        className="border border-gray-300 rounded p-2 text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="chairperson">Chairperson</option>
                        <option value="secretary">Secretary</option>
                        <option value="observer">Observer</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Expertise"
                          value={member.expertise}
                          onChange={(e) => handleMemberChange(index, 'expertise', e.target.value)}
                          className="flex-1 border border-gray-300 rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => handleRemoveMember(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{committee.name}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Chairperson ID: {committee.chairperson_id}</div>
                  <div>Status: {committee.status}</div>
                  <div>Appointment Date: {committee.appointment_date}</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Members ({committee.members?.length || 0})</h4>
                <div className="space-y-2">
                  {committee.members?.map((member, index) => (
                    <div key={member.id || index} className="flex justify-between items-center p-2 border border-gray-100 rounded">
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-600">
                          {member.role} • {member.expertise}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {member.user_id}
                      </div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500 italic">No members added yet.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Documents Tab (unchanged but integrated)
function DocumentsTab({ bids }) {
  const [docsMap, setDocsMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!bids?.length) return;

      setLoading(true);
      try {
        const docsData = {};
        for (const bid of bids) {
          try {
            const response = await axiosInstance.get(`/bids/bid/${bid.id}/documents/list/`);
            docsData[bid.id] = response.data;
          } catch (error) {
            docsData[bid.id] = { error: error.message };
          }
        }
        setDocsMap(docsData);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [bids]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Clock className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bids?.map((bid) => {
        const docs = docsMap[bid.id];
        const hasError = docs?.error;
        const docsList = Array.isArray(docs) ? docs : [];

        return (
          <div key={bid.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-gray-900">{bid.bidder_name}</div>
                <div className="text-sm text-gray-500">
                  Bid: {bid.currency} {bid.submitted_amount?.toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {docsList.length} document{docsList.length !== 1 ? 's' : ''}
              </div>
            </div>

            {hasError ? (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error loading documents: {docs.error}
              </div>
            ) : docsList.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No documents uploaded</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Document</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Uploaded</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docsList.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{doc.document_name}</td>
                        <td className="px-3 py-2">{doc.document_type}</td>
                        <td className="px-3 py-2">
                          {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <a
                              href={doc.view_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </a>
                            <a
                              href={doc.download_url}
                              className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }) || <div className="text-gray-500">No bids to display</div>}
    </div>
  );
}

// Main Enhanced Evaluation Component
export default function EnhancedTenderEvaluation({ tender, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('compliance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStates, setSavingStates] = useState({});

  // Core data
  const [bids, setBids] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [config, setConfig] = useState(null);
  const [committee, setCommittee] = useState(null);
  const [evaluations, setEvaluations] = useState({});

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!tender?.id) return;

      setLoading(true);
      try {
        // Load all required data in parallel
        const [
          bidsResponse,
          criteriaResponse,
          configResponse,
          committeeResponse
        ] = await Promise.all([
          axiosInstance.get(`/tenders/${tender.id}/bids/`),
          api.getCriteria(tender.id),
          api.getEvaluationConfig(tender.id),
          api.getCommittee(tender.id)
        ]);

        const bidsData = bidsResponse.data;
        setBids(bidsData);
        setCriteria(criteriaResponse);
        setConfig(configResponse);
        setCommittee(committeeResponse);

        // Load evaluations for each bid
        const evaluationsData = {};
        for (const bid of bidsData) {
          try {
            const evaluation = await api.getOrCreateEvaluation(bid.id, committeeResponse?.committee?.id);
            evaluationsData[bid.id] = evaluation;
          } catch (error) {
            console.error(`Failed to load evaluation for bid ${bid.id}:`, error);
          }
        }
        setEvaluations(evaluationsData);

      } catch (error) {
        console.error('Failed to load evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tender?.id]);

  // Auto-save score updates with debouncing
  const handleScoreUpdate = useCallback(async (bidId, criterionId, scoreData) => {
    // Update local state immediately for responsiveness
    setEvaluations(prev => ({
      ...prev,
      [bidId]: {
        ...prev[bidId],
        criterion_scores: {
          ...prev[bidId]?.criterion_scores,
          [criterionId]: scoreData
        }
      }
    }));

    // Set saving state
    setSavingStates(prev => ({ ...prev, [bidId]: true }));

    try {
      const evaluation = evaluations[bidId];
      if (evaluation?.id) {
        // Save to backend
        await api.saveCriterionScores(evaluation.id, [
          { criterion: criterionId, ...scoreData }
        ]);

        // Recompute totals
        const updatedEvaluation = await api.recomputeEvaluation(evaluation.id);

        // Update evaluation with new totals
        setEvaluations(prev => ({
          ...prev,
          [bidId]: {
            ...prev[bidId],
            ...updatedEvaluation
          }
        }));
      }
    } catch (error) {
      console.error('Failed to save score:', error);
      // Could add toast notification here
    } finally {
      setSavingStates(prev => ({ ...prev, [bidId]: false }));
    }
  }, [evaluations]);

  const handleUpdateCommittee = useCallback(async (committeeData) => {
    try {
      const response = await axiosInstance.post(`/tenders/${tender.id}/evaluation/committee/`, committeeData);
      const updatedCommittee = response.data;
      setCommittee(updatedCommittee);
    } catch (error) {
      console.error('Failed to update committee:', error);
      throw error;
    }
  }, [tender?.id]);

  const handleSubmitRecommendation = useCallback(async () => {
    setSaving(true);
    try {
      await api.submitRecommendation(tender.id, {
        evaluations,
        committee: committee?.committee,
        config
      });

      // Could show success notification
      console.log('Recommendation submitted successfully');
    } catch (error) {
      console.error('Failed to submit recommendation:', error);
    } finally {
      setSaving(false);
    }
  }, [tender?.id, evaluations, committee, config]);

  // Calculate tab statuses
  const getTabStatus = useCallback((tabName) => {
    const sectionCriteria = criteria.filter(c => c.section === tabName);
    if (sectionCriteria.length === 0) return undefined;

    let completed = 0;
    let total = 0;

    bids.forEach(bid => {
      const evaluation = evaluations[bid.id];
      sectionCriteria.forEach(criterion => {
        total++;
        const score = evaluation?.criterion_scores?.[criterion.id];
        if (score !== undefined && score.score !== null) {
          completed++;
        }
      });
    });

    if (completed === total) return 'complete';
    if (completed > 0) return 'partial';
    return undefined;
  }, [bids, criteria, evaluations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">
                Reference: {tender?.reference_number}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{tender?.title}</h1>
              {tender?.closing_date && (
                <div className="text-sm text-gray-500 mt-1">
                  Closing: {new Date(tender.closing_date).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Evaluator</div>
                <div className="font-medium text-gray-900">
                  {currentUser?.name || 'Current User'}
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Back to Tenders
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <TabButton
            active={activeTab === 'compliance'}
            onClick={() => setActiveTab('compliance')}
            status={getTabStatus('compliance')}
            count={criteria.filter(c => c.section === 'compliance').length}
          >
            Compliance
          </TabButton>
          <TabButton
            active={activeTab === 'technical'}
            onClick={() => setActiveTab('technical')}
            status={getTabStatus('technical')}
            count={criteria.filter(c => c.section === 'technical').length}
          >
            Technical
          </TabButton>
          <TabButton
            active={activeTab === 'financial'}
            onClick={() => setActiveTab('financial')}
            status={getTabStatus('financial')}
            count={criteria.filter(c => c.section === 'financial').length}
          >
            Financial
          </TabButton>
          <TabButton
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            count={bids.length}
          >
            Documents
          </TabButton>
          <TabButton
            active={activeTab === 'committee'}
            onClick={() => setActiveTab('committee')}
            count={committee?.members?.length}
          >
            Committee
          </TabButton>
          <TabButton
            active={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </TabButton>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'compliance' && (
            <ComplianceTab
              bids={bids}
              criteria={criteria}
              evaluations={evaluations}
              onScoreUpdate={handleScoreUpdate}
              config={config}
              savingStates={savingStates}
            />
          )}
          {activeTab === 'technical' && (
            <TechnicalTab
              bids={bids}
              criteria={criteria}
              evaluations={evaluations}
              onScoreUpdate={handleScoreUpdate}
              config={config}
              savingStates={savingStates}
            />
          )}
          {activeTab === 'financial' && (
            <FinancialTab
              bids={bids}
              criteria={criteria}
              evaluations={evaluations}
              onScoreUpdate={handleScoreUpdate}
              config={config}
              savingStates={savingStates}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab bids={bids} />
          )}
          {activeTab === 'committee' && (
            <CommitteeTab
              committee={committee}
              onUpdateCommittee={handleUpdateCommittee}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryTab
              bids={bids}
              evaluations={evaluations}
              config={config}
              onSubmitRecommendation={handleSubmitRecommendation}
              submitting={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}