import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Save, Trash2, AlertCircle } from 'lucide-react';
import axiosInstance from '../api/axiosInstance.jsx';

const sections = [
  { key: 'compliance', label: 'Compliance' },
  { key: 'technical', label: 'Technical' },
  { key: 'financial', label: 'Financial' },
];

const defaultConfig = {
  technical_weight: 70,
  financial_weight: 30,
  technical_pass_mark: 70,
  compliance_required: true,
  enforce_mandatory: true,
  financial_method: 'lowest_price',
  cap_financial_score_at: 100,
};

function Field({ label, children, help }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {help && <div className="text-xs text-gray-500 mt-1">{help}</div>}
    </div>
  );
}

function Notice({ type = 'info', children }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warn: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className={`flex items-start gap-2 border rounded p-3 ${styles[type]}`}>
      <AlertCircle className="w-4 h-4 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

const TenderCriteriaSetup = () => {
  const { tenderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [error, setError] = useState(null);

  const [cfg, setCfg] = useState(defaultConfig);
  const [criteria, setCriteria] = useState([]);
  const [adding, setAdding] = useState(false);

  const weightTotal = useMemo(() => {
    const t = parseFloat(cfg.technical_weight || 0);
    const f = parseFloat(cfg.financial_weight || 0);
    return (isNaN(t) ? 0 : t) + (isNaN(f) ? 0 : f);
  }, [cfg.technical_weight, cfg.financial_weight]);

  const grouped = useMemo(() => {
    return {
      compliance: criteria.filter(c => c.section === 'compliance'),
      technical: criteria.filter(c => c.section === 'technical'),
      financial: criteria.filter(c => c.section === 'financial'),
    };
  }, [criteria]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, critRes] = await Promise.all([
        axiosInstance.get(`/bids/tenders/${tenderId}/evaluation/config`),
        axiosInstance.get(`/bids/tenders/${tenderId}/evaluation/criteria`),
      ]);
      setCfg({ ...defaultConfig, ...(cfgRes?.data || {}) });
      setCriteria(critRes?.data || []);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load evaluation setup';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenderId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const saveConfig = async () => {
    setSavingCfg(true);
    setError(null);
    try {
      // Validation: weights sum 100
      const total = weightTotal;
      if (Math.round(total * 100) / 100 !== 100) {
        throw new Error('Technical weight + Financial weight must equal 100%.');
      }
      const payload = {
        technical_weight: Number(cfg.technical_weight),
        financial_weight: Number(cfg.financial_weight),
        technical_pass_mark: Number(cfg.technical_pass_mark ?? 0),
        compliance_required: Boolean(cfg.compliance_required),
        enforce_mandatory: Boolean(cfg.enforce_mandatory),
        financial_method: cfg.financial_method,
        cap_financial_score_at: Number(cfg.cap_financial_score_at ?? 100),
      };
      const res = await axiosInstance.patch(`/bids/tenders/${tenderId}/evaluation/config`, payload);
      setCfg(prev => ({ ...prev, ...(res?.data || {}) }));
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || e.message || 'Failed to save config';
      setError(msg);
    } finally {
      setSavingCfg(false);
    }
  };

  const addCriterion = async (sectionKey) => {
    setAdding(true);
    setError(null);
    try {
      const payload = {
        section: sectionKey,
        criterion_type: sectionKey === 'compliance' ? 'boolean' : 'score',
        name: sectionKey === 'compliance' ? 'Compliance check' : 'New criterion',
        description: '',
        weight: sectionKey === 'technical' ? 10 : 0,
        max_points: sectionKey === 'technical' ? 100 : 100,
        mandatory: sectionKey === 'compliance',
        order: (grouped[sectionKey]?.length || 0) + 1,
      };
      const res = await axiosInstance.post(`/bids/tenders/${tenderId}/evaluation/criteria`, payload);
      setCriteria(prev => [...prev, res.data]);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to add criterion';
      setError(msg);
    } finally {
      setAdding(false);
    }
  };

  const removeCriterion = async (c) => {
    setError(null);
    try {
      await axiosInstance.delete(`/bids/tenders/${tenderId}/evaluation/criteria/${c.id}`);
      setCriteria(prev => prev.filter(x => x.id !== c.id));
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to delete criterion';
      setError(msg);
    }
  };

  return (
    <div className="p-6">
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tender Evaluation Setup</h2>
          <div className="text-sm text-gray-500">Configure evaluation weights and criteria for this tender</div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/tenders/${tenderId}`} className="text-blue-600 hover:underline text-sm">Back to Tender</Link>
          <button onClick={saveConfig} disabled={savingCfg} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingCfg ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <Notice type="error">{error}</Notice>}
        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <>
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Evaluation Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Technical Weight (%)" help="Must sum with financial to 100%">
                  <input type="number" value={cfg.technical_weight}
                         onChange={e => setCfg({ ...cfg, technical_weight: e.target.value })}
                         className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Financial Weight (%)" help="Must sum with technical to 100%">
                  <input type="number" value={cfg.financial_weight}
                         onChange={e => setCfg({ ...cfg, financial_weight: e.target.value })}
                         className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Technical Pass Mark (%)">
                  <input type="number" value={cfg.technical_pass_mark}
                         onChange={e => setCfg({ ...cfg, technical_pass_mark: e.target.value })}
                         className="w-full border rounded px-3 py-2" />
                </Field>
                <Field label="Financial Method">
                  <select value={cfg.financial_method}
                          onChange={e => setCfg({ ...cfg, financial_method: e.target.value })}
                          className="w-full border rounded px-3 py-2">
                    <option value="lowest_price">Lowest Price</option>
                    <option value="criteria">Criteria Based</option>
                  </select>
                </Field>
                <Field label="Cap Financial Score At (%)">
                  <input type="number" value={cfg.cap_financial_score_at}
                         onChange={e => setCfg({ ...cfg, cap_financial_score_at: e.target.value })}
                         className="w-full border rounded px-3 py-2" />
                </Field>
                <div className="flex gap-6 items-center">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!cfg.compliance_required}
                           onChange={e => setCfg({ ...cfg, compliance_required: e.target.checked })} />
                    Compliance required
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!cfg.enforce_mandatory}
                           onChange={e => setCfg({ ...cfg, enforce_mandatory: e.target.checked })} />
                    Enforce mandatory uploads
                  </label>
                </div>
              </div>
              <div className="text-sm text-gray-600">Weights total: <span className={weightTotal === 100 ? 'text-green-600' : 'text-red-600'}>{weightTotal}%</span></div>
            </div>

            {sections.map(sec => (
              <div key={sec.key} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{sec.label} Criteria</h3>
                  <button
                    onClick={() => addCriterion(sec.key)}
                    disabled={adding}
                    className="inline-flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Add Criterion
                  </button>
                </div>

                {grouped[sec.key]?.length ? (
                  <ul className="divide-y">
                    {grouped[sec.key].map(c => (
                      <li key={c.id} className="py-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">Type: {c.criterion_type} • Weight: {c.weight}% • Max: {c.max_points} • Mandatory: {c.mandatory ? 'Yes' : 'No'}</div>
                        </div>
                        <button onClick={() => removeCriterion(c)} className="text-red-600 hover:text-red-800 inline-flex items-center gap-1">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No {sec.label.toLowerCase()} criteria yet.</div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <button onClick={saveConfig} disabled={savingCfg} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingCfg ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TenderCriteriaSetup;
