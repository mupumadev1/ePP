import React, { useEffect, useMemo, useState } from 'react';
import { Download, Users, FileText, Calculator, Plus, Save } from 'lucide-react';
import axiosInstance from '../api/axiosInstance.jsx';
import { getEvaluationCommittee, saveEvaluationCommittee } from '../api/tender.js';

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`px-2 py-1 rounded-full text-xs ${
          active ? 'bg-blue-500' : 'bg-gray-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function ComplianceTab({ bids, evaluation, updateBidEval }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900">Compliance Evaluation</h4>
        <p className="text-sm text-blue-700 mt-1">
          Verify each bid meets mandatory requirements. Non-compliant bids are automatically disqualified.
        </p>
      </div>

      {bids.map((b) => {
        const c = evaluation[b.id]?.compliance || {};
        return (
          <div key={b.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-medium text-gray-900">{b.bidder_name}</div>
                <div className="text-sm text-gray-500">Submitted: ZMW {b.submitted_amount?.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`compliance-${b.id}`}
                    checked={c.pass === true}
                    onChange={() => updateBidEval(b.id, (be) => {
                      be.compliance = { pass: true, reasons: [] };
                    })}
                    className="cursor-pointer"
                  />
                  <span className="text-green-700 font-medium">Compliant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`compliance-${b.id}`}
                    checked={c.pass === false}
                    onChange={() => updateBidEval(b.id, (be) => {
                      be.compliance = { pass: false, reasons: ['Non-compliant'] };
                    })}
                    className="cursor-pointer"
                  />
                  <span className="text-red-700 font-medium">Non-Compliant</span>
                </label>
              </div>
            </div>


            {c.pass === false && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reasons for Non-Compliance:
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Specify detailed reasons for non-compliance..."
                  value={(evaluation[b.id]?.compliance?.reasons || []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    updateBidEval(b.id, (be) => {
                      be.compliance = { pass: false, reasons: lines };
                    });
                  }}
                  rows={3}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TechnicalTab({ bids, criteria, evaluation, updateBidEval }) {
  if (!criteria?.length) return <div className="text-gray-500">No technical criteria configured.</div>;

  // Filter compliant bids only
  const compliantBids = bids.filter(b => evaluation[b.id]?.compliance?.pass === true);

  if (compliantBids.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Complete compliance evaluation first. Only compliant bids can be technically evaluated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900">Technical Evaluation</h4>
        <p className="text-sm text-green-700 mt-1">
          Score each criterion for compliant bids only. Weights are applied automatically.
        </p>
      </div>

      {criteria.map((crit) => (
        <div key={crit.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">{crit.name}</h4>
            <div className="text-sm text-gray-500">
              Max: {crit.max} | Weight: {crit.weight}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compliantBids.map((b) => {
              const tech = evaluation[b.id]?.technical || {};
              const record = tech[crit.id] || {};
              return (
                <div key={b.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium text-gray-900 mb-2">{b.bidder_name}</div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Score</label>
                      <input
                        type="number"
                        min={0}
                        max={crit.max}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={record.score ?? ''}
                        placeholder={`0-${crit.max}`}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Math.min(Math.max(0, Number(e.target.value)), crit.max);
                          updateBidEval(b.id, (be) => {
                            const techNext = { ...be.technical || {} };
                            techNext[crit.id] = { ...techNext[crit.id] || {}, score: v };
                            be.technical = techNext;
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Comments</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Evaluation comments..."
                        value={record.comments ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateBidEval(b.id, (be) => {
                            const techNext = { ...be.technical || {} };
                            techNext[crit.id] = { ...techNext[crit.id] || {}, comments: v };
                            be.technical = techNext;
                          });
                        }}
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

function FinancialTab({ bids, evaluation, updateBidEval, currency }) {
  const compliantBids = bids.filter(b => evaluation[b.id]?.compliance?.pass === true);

  if (compliantBids.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Complete compliance evaluation first. Only compliant bids can be financially evaluated.</p>
      </div>
    );
  }

  // Calculate lowest price for scoring
  const prices = compliantBids.map(b => evaluation[b.id]?.financial?.price || b.submitted_amount).filter(Boolean);
  const lowestPrice = prices.length ? Math.min(...prices) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900">Financial Evaluation</h4>
        <p className="text-sm text-purple-700 mt-1">
          Verify bid amounts and calculate financial scores. Lowest responsive bid gets highest score.
        </p>
      </div>


      {compliantBids.map((b) => {
        const fin = evaluation[b.id]?.financial || {};
        const price = fin.price ?? b.submitted_amount;
        const financialScore = price && lowestPrice ? Math.round((lowestPrice / price) * 100) : 0;

        return (
          <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{b.bidder_name}</div>
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">{currency}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-48 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter verified amount"
                        value={fin.price ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          updateBidEval(b.id, (be) => {
                            be.financial = { ...be.financial || {}, price: v };
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Financial Score</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                      {financialScore}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommitteeTab({ members = [], onAdd, onSave, onRemove, setChairpersonId, chairpersonId }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Evaluation Committee</h3>
        <div className="flex gap-2">
          <button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </button>
          <button onClick={onSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Committee
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {members.length === 0 && (
          <div className="text-sm text-gray-500">No committee members yet.</div>
        )}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chairperson User ID</label>
          <input className="border rounded p-2 w-64" value={chairpersonId || ''} onChange={(e)=>setChairpersonId(e.target.value)} placeholder="User ID" />
        </div>
        {members.map((member, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{member.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{member.role}</p>
                <p className="text-sm text-gray-600 mt-1">Expertise: {member.expertise}</p>
              </div>
              <button onClick={()=>onRemove(index)} className="text-red-600 text-sm">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTab({ bids, criteria, evaluation, onSubmit, submitting }) {
  const rows = computeEvaluationRows(bids, criteria, evaluation);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">Evaluation Summary</h4>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Final scores combining technical (60%) and financial (40%) evaluations.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Bidder</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Technical Score</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Financial Score</th>
                <th className="px-4 py-3 text-center font-medium text-gray-900">Combined Score</th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">Bid Amount (ZMW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.rank === 1 ? 'bg-green-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      r.rank === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.bidder}</td>
                  <td className="px-4 py-3 text-center">{r.techScore}/100</td>
                  <td className="px-4 py-3 text-center">{r.financialScore}/100</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${r.rank === 1 ? 'text-green-600' : 'text-gray-900'}`}>
                      {r.combinedScore}/100
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{r.price?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900">Recommendation</h4>
          <p className="text-sm text-green-700 mt-1">
            Based on the evaluation, <strong>{rows[0]?.bidder}</strong> is recommended for award with a combined score of {rows[0]?.combinedScore}/100.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </button>
        <button
          disabled={submitting || rows.length === 0}
          onClick={onSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          {submitting ? 'Submitting…' : 'Submit Recommendation'}
        </button>
      </div>
    </div>
  );
}

// Shared helper: compute evaluation rows (tech/financial/combined) and sort by combined
function computeEvaluationRows(bids, criteria, evaluation) {
  const compliantBids = bids.filter(b => evaluation[b.id]?.compliance?.pass === true);
  const rows = compliantBids.map((b) => {
    const techData = evaluation[b.id]?.technical || {};
    let weightedTechScore = 0;
    let maxPossibleTech = 0;
    (criteria?.technical || []).forEach(crit => {
      const score = techData[crit.id]?.score || 0;
      const weight = crit.weight || 0;
      const max = crit.max || 100;
      weightedTechScore += (score / max) * weight;
      maxPossibleTech += weight;
    });
    const techScore = maxPossibleTech > 0 ? Math.round(weightedTechScore) : 0;
    const price = evaluation[b.id]?.financial?.price ?? b.submitted_amount;
    const prices = compliantBids.map(bid => evaluation[bid.id]?.financial?.price ?? bid.submitted_amount).filter(Boolean);
    const lowestPrice = prices.length ? Math.min(...prices) : 0;
    const financialScore = price && lowestPrice ? Math.round((lowestPrice / price) * 100) : 0;
    const combinedScore = Math.round((techScore * 0.6) + (financialScore * 0.4));
    return { bidder: b.bidder_name, techScore, financialScore, combinedScore, price, id: b.id };
  });
  rows.sort((a, b) => b.combinedScore - a.combinedScore);
  rows.forEach((r, i) => r.rank = i + 1);
  return rows;
}

function UploadedDocumentsTab({ bids }) {
  const [docsMap, setDocsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseURL = (axiosInstance && axiosInstance.defaults && axiosInstance.defaults.baseURL) || '';
  const toAbsolute = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    // Ensure baseURL ends without trailing slash
    const b = baseURL ? baseURL.replace(/\/$/, '') : '';
    return `${b}${path}`;
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const entries = await Promise.all(
          (bids || []).map(async (b) => {
            try {
              const res = await axiosInstance.get(`/bids/bid/${b.id}/documents/list/`);
              return [b.id, res.data || []];
            } catch (e) {
              return [b.id, { error: e?.response?.data?.error || e.message }];
            }
          })
        );
        if (!ignore) {
          const map = {};
          entries.forEach(([bidId, docs]) => { map[bidId] = docs; });
          setDocsMap(map);
        }
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load documents');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    if (bids && bids.length) load(); else setDocsMap({});
    return () => { ignore = true; };
  }, [JSON.stringify((bids||[]).map(b=>b.id))]);

  if (loading) return <div className="text-sm text-gray-500">Loading documents…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {(!bids || bids.length === 0) && (
        <div className="text-sm text-gray-500">No bids to display.</div>
      )}
      {(bids||[]).map((b) => {
        const docs = docsMap[b.id];
        const hasErr = docs && !Array.isArray(docs) && docs.error;
        return (
          <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">{b.bidder_name}</div>
                <div className="text-sm text-gray-500">Bid Amount: ZMW {b.submitted_amount?.toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3">
              {hasErr && (
                <div className="text-sm text-red-600">{docs.error}</div>
              )}
              {Array.isArray(docs) && docs.length === 0 && (
                <div className="text-sm text-gray-500">No documents uploaded.</div>
              )}
              {Array.isArray(docs) && docs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Size</th>
                        <th className="px-3 py-2 text-left">Uploaded</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {docs.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{d.document_name}</td>
                          <td className="px-3 py-2">{d.document_type}</td>
                          <td className="px-3 py-2">{d.file_size ? `${Math.round(d.file_size/1024)} KB` : '-'}</td>
                          <td className="px-3 py-2">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <a
                                href={toAbsolute(d.view_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                title="View inline"
                              >
                                View
                              </a>
                              <a
                                href={toAbsolute(d.download_url)}
                                className="px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                                title="Download"
                              >
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
          </div>
        );
      })}
    </div>
  );
}

export default function EnhancedTenderEvaluation({ tender, onClose, embedded = false }) {
  const [activeTab, setActiveTab] = useState('compliance');
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState({});
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [committee, setCommittee] = useState([]);
  const [chairpersonId, setChairpersonId] = useState('');

  const criteria = useMemo(() => {
    // Try to parse evaluation_criteria if it's JSON with a 'technical' array
    if (tender?.evaluation_criteria) {
      try {
        const parsed = typeof tender.evaluation_criteria === 'string'
          ? JSON.parse(tender.evaluation_criteria)
          : tender.evaluation_criteria;
        if (parsed && Array.isArray(parsed.technical)) {
          return { technical: parsed.technical };
        }
      } catch { /* ignore malformed criteria */ }
    }
    return { technical: [] };
  }, [tender]);

  useEffect(() => {
    if (!tender?.id) return;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await axiosInstance.get(`/tenders/${tender.id}/bids/`);
        const data = Array.isArray(res.data) ? res.data : [];
        setBids(data);
        // Load committee
        try {
          const c = await getEvaluationCommittee(tender.id);
          setCommittee(c?.members || []);
          if (c?.committee?.chairperson_id) setChairpersonId(String(c.committee.chairperson_id));
        } catch { /* empty */ }
      } catch (e) {
        setLoadError(e?.response?.data?.error || e.message || 'Failed to load bids');
        setBids([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tender?.id]);

  const updateBidEval = (bidId, updater) => {
    setEvaluation((prev) => {
      const next = { ...prev, [bidId]: { ...prev[bidId] || {} } };
      updater(next[bidId]);
      return next;
    });
  };

  const handleSubmitRecommendation = async () => {
    if (!tender?.id) return;
    setSaving(true);
    try {
      // Build summary rows similar to SummaryTab
      const rows = computeEvaluationRows(bids, criteria, evaluation);

      await axiosInstance.post(`/tenders/${tender.id}/evaluation/recommendation/`, {
        evaluation,
        summary: rows,
      });
      alert('Evaluation recommendation submitted successfully!');
    } catch (e) {
      alert(`Failed to submit recommendation: ${e?.response?.data?.error || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const compliantCount = bids.filter(b => evaluation[b.id]?.compliance?.pass === true).length;
  const nonCompliantCount = bids.filter(b => evaluation[b.id]?.compliance?.pass === false).length;
  const complianceStatus = `${compliantCount + nonCompliantCount}/${bids.length}`;

  const currency = tender?.currency || (bids[0]?.currency) || 'ZMW';

  const addCommitteeMember = () => {
    const name = prompt('Enter member display name');
    const user_id = prompt('Enter member user ID');
    const role = prompt('Enter role (chairperson|secretary|member|observer)', 'member') || 'member';
    const expertise = prompt('Enter expertise');
    if (!user_id) return;
    setCommittee((prev)=>[...prev, { name, user_id, role, expertise }]);
  };

  const removeCommitteeMember = (index) => {
    setCommittee((prev)=> prev.filter((_, i)=> i!==index));
  };

  const saveCommittee = async () => {
    if (!tender?.id) return;
    try {
      await saveEvaluationCommittee(tender.id, {
        chairperson_id: chairpersonId,
        members: committee.map(m=>({ user_id: m.user_id, role: m.role, expertise: m.expertise })),
      });
      alert('Committee saved');
    } catch (e) {
      alert(`Failed to save committee: ${e?.response?.data?.error || e.message}`);
    }
  };

  return (
    <>
      {/* When embedded, we avoid page-level wrappers; otherwise, use them */}
      {embedded ? (
        <>
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Reference: {tender?.reference_number}</div>
                <h1 className="text-2xl font-bold text-gray-900">{tender?.title}</h1>
                {tender?.closing_date && (
                  <div className="text-sm text-gray-500 mt-1">
                    Closing: {new Date(tender.closing_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium text-gray-900">
                    {saving ? 'Saving…' : 'Auto-saved'}
                  </div>
                </div>
                <a href={tender?.id ? `/tenders/${tender.id}?edit=1` : '#'} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-2">
                  Edit Tender
                </a>
                {onClose && (
                  <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                    Back to Tenders
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadError && (
            <div className="p-3 bg-red-50 text-red-700 rounded">{loadError}</div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <TabButton
              active={activeTab === 'compliance'}
              onClick={() => setActiveTab('compliance')}
              count={complianceStatus}
            >
              Compliance Check
            </TabButton>
            <TabButton
              active={activeTab === 'technical'}
              onClick={() => setActiveTab('technical')}
            >
              Technical Evaluation
            </TabButton>
            <TabButton
              active={activeTab === 'financial'}
              onClick={() => setActiveTab('financial')}
            >
              Financial Evaluation
            </TabButton>
               <TabButton
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            >
              Uploaded Documents
            </TabButton>
            <TabButton
              active={activeTab === 'committee'}
              onClick={() => setActiveTab('committee')}
              count={committee.length}
            >
              Committee
            </TabButton>
            <TabButton
              active={activeTab === 'summary'}
              onClick={() => setActiveTab('summary')}
            >
              Summary & Recommendation
            </TabButton>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : (
              <>
                {activeTab === 'compliance' && (
                  <ComplianceTab bids={bids} evaluation={evaluation} updateBidEval={updateBidEval} />
                )}
                {activeTab === 'technical' && (
                  <TechnicalTab
                    bids={bids}
                    criteria={criteria.technical}
                    evaluation={evaluation}
                    updateBidEval={updateBidEval}
                  />
                )}
                {activeTab === 'financial' && (
                  <FinancialTab
                    bids={bids}
                    evaluation={evaluation}
                    updateBidEval={updateBidEval}
                    currency={currency}
                  />
                )}
                  {activeTab === 'documents' && (
                  <UploadedDocumentsTab bids={bids} evaluation={evaluation} updateBidEval={updateBidEval} />
                )}
                {activeTab === 'committee' && (
                  <CommitteeTab members={committee} onAdd={addCommitteeMember} onSave={saveCommittee} onRemove={removeCommitteeMember} setChairpersonId={setChairpersonId} chairpersonId={chairpersonId} />
                )}
                {activeTab === 'summary' && (
                  <SummaryTab
                    bids={bids}
                    criteria={criteria}
                    evaluation={evaluation}
                    onSubmit={handleSubmitRecommendation}
                    submitting={saving}
                  />
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Reference: {tender?.reference_number}</div>
                  <h1 className="text-2xl font-bold text-gray-900">{tender?.title}</h1>
                  {tender?.closing_date && (
                    <div className="text-sm text-gray-500 mt-1">
                      Closing: {new Date(tender.closing_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Status</div>
                    <div className="font-medium text-gray-900">
                      {saving ? 'Saving…' : 'Auto-saved'}
                    </div>
                  </div>
                  {onClose && (
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                      Back to Tenders
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadError && (
              <div className="p-3 bg-red-50 text-red-700 rounded">{loadError}</div>
            )}

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <TabButton
                active={activeTab === 'compliance'}
                onClick={() => setActiveTab('compliance')}
                count={complianceStatus}
              >
                Compliance Check
              </TabButton>
              <TabButton
                active={activeTab === 'technical'}
                onClick={() => setActiveTab('technical')}
              >
                Technical Evaluation
              </TabButton>
              <TabButton
                active={activeTab === 'financial'}
                onClick={() => setActiveTab('financial')}
              >
                Financial Evaluation
              </TabButton>
              <TabButton
                active={activeTab === 'committee'}
                onClick={() => setActiveTab('committee')}
                count={committee.length}
              >
                Committee
              </TabButton>
                 <TabButton
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            >
              Uploaded Documents
            </TabButton>
              <TabButton
                active={activeTab === 'summary'}
                onClick={() => setActiveTab('summary')}
              >
                Summary & Recommendation
              </TabButton>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (
                <>
                  {activeTab === 'compliance' && (
                    <ComplianceTab bids={bids} evaluation={evaluation} updateBidEval={updateBidEval} />
                  )}
                  {activeTab === 'technical' && (
                    <TechnicalTab
                      bids={bids}
                      criteria={criteria.technical}
                      evaluation={evaluation}
                      updateBidEval={updateBidEval}
                    />
                  )}
                  {activeTab === 'financial' && (
                    <FinancialTab
                      bids={bids}
                      evaluation={evaluation}
                      updateBidEval={updateBidEval}
                      currency={currency}
                    />
                  )}
                  {activeTab === 'committee' && (
                    <CommitteeTab members={committee} onAdd={addCommitteeMember} onSave={saveCommittee} onRemove={removeCommitteeMember} setChairpersonId={setChairpersonId} chairpersonId={chairpersonId} />
                  )}
                    {activeTab === 'documents' && (
                  <UploadedDocumentsTab bids={bids} evaluation={evaluation} updateBidEval={updateBidEval} />
                )}
                  {activeTab === 'summary' && (
                    <SummaryTab
                      bids={bids}
                      criteria={criteria}
                      evaluation={evaluation}
                      onSubmit={handleSubmitRecommendation}
                      submitting={saving}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}