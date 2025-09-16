import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Save, Trash2, AlertCircle, Edit2 } from 'lucide-react';
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

// Modal for editing criterion details
function CriterionEditModal({ criterion, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: criterion?.name || '',
    description: criterion?.description || '',
    criterion_type: criterion?.criterion_type || 'score',
    weight: criterion?.weight || 0,
    max_points: criterion?.max_points || 100,
    mandatory: criterion?.mandatory || false,
    order: criterion?.order || 1,
  });

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {criterion ? 'Edit Criterion' : 'New Criterion'}
        </h3>

        <div className="space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Criterion name"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows="3"
              placeholder="Criterion description"
            />
          </Field>

          <Field label="Type">
            <select
              value={form.criterion_type}
              onChange={e => setForm({ ...form, criterion_type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="score">Score</option>
              <option value="boolean">Boolean (Pass/Fail)</option>
              <option value="upload">Upload Required</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Weight (%)">
              <input
                type="number"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min="0"
                max="100"
              />
            </Field>

            <Field label="Max Points">
              <input
                type="number"
                value={form.max_points}
                onChange={e => setForm({ ...form, max_points: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min="1"
              />
            </Field>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.mandatory}
                onChange={e => setForm({ ...form, mandatory: e.target.checked })}
              />
              Mandatory
            </label>

            <Field label="Order">
              <input
                type="number"
                value={form.order}
                onChange={e => setForm({ ...form, order: e.target.value })}
                className="w-20 border rounded px-2 py-1 text-sm"
                min="1"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={!form.name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const TenderCriteriaSetup = () => {
  const { tenderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [cfg, setCfg] = useState(defaultConfig);
  const [criteria, setCriteria] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);

  const weightTotal = useMemo(() => {
    const t = parseFloat(cfg.technical_weight || 0);
    const f = parseFloat(cfg.financial_weight || 0);
    return (isNaN(t) ? 0 : t) + (isNaN(f) ? 0 : f);
  }, [cfg.technical_weight, cfg.financial_weight]);

  const grouped = useMemo(() => {
    return {
      compliance: criteria.filter(c => c.section === 'compliance').sort((a, b) => a.order - b.order),
      technical: criteria.filter(c => c.section === 'technical').sort((a, b) => a.order - b.order),
      financial: criteria.filter(c => c.section === 'financial').sort((a, b) => a.order - b.order),
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
      console.error('Load error:', e);
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

  // Clear success message after a few seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const saveConfig = async () => {
    setSavingCfg(true);
    setError(null);
    try {
      // Validation: weights sum 100
      const total = weightTotal;
      if (Math.abs(total - 100) > 0.01) { // Allow small floating point differences
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
      setSuccessMessage('Configuration saved successfully!');
    } catch (e) {
      console.error('Config save error:', e);
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
      // Generate a unique default name to avoid backend unique_together (tender, section, name) conflicts
      const existing = (grouped[sectionKey] || []).map(c => (c.name || '').toLowerCase());
      const sectionLabel = sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
      const baseName = sectionKey === 'compliance' ? 'Compliance check' : `${sectionLabel} criterion`;
      let name = baseName;
      if (existing.includes(name.toLowerCase())) {
        let i = 2;
        while (existing.includes(`${baseName} ${i}`.toLowerCase())) i += 1;
        name = `${baseName} ${i}`;
      }

      const payload = {
        section: sectionKey,
        criterion_type: sectionKey === 'compliance' ? 'boolean' : 'score',
        name,
        description: '',
        weight: sectionKey === 'technical' ? 10 : 0,
        max_points: 100,
        mandatory: sectionKey === 'compliance',
        order: (grouped[sectionKey]?.length || 0) + 1,
      };

      const res = await axiosInstance.post(`/bids/tenders/${tenderId}/evaluation/criteria`, payload);
      setCriteria(prev => [...prev, res.data]);
      setSuccessMessage(`${sectionLabel} criterion added successfully!`);
    } catch (e) {
      console.error('Add criterion error:', e);
      const srv = e?.response?.data;
      const msg = srv?.detail || srv?.error || (typeof srv === 'object' ? Object.values(srv)[0]?.[0] : null) || 'Failed to add criterion';
      setError(String(msg));
    } finally {
      setAdding(false);
    }
  };

  const updateCriterion = async (criterionId, updates) => {
    setError(null);
    try {
      const res = await axiosInstance.patch(`/bids/tenders/${tenderId}/evaluation/criteria/${criterionId}`, updates);
      setCriteria(prev => prev.map(c => c.id === criterionId ? { ...c, ...res.data } : c));
      setSuccessMessage('Criterion updated successfully!');
      setEditingCriterion(null);
    } catch (e) {
      console.error('Update criterion error:', e);
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to update criterion';
      setError(msg);
    }
  };

  const removeCriterion = async (c) => {
    if (!confirm(`Are you sure you want to delete "${c.name}"?`)) return;

    setError(null);
    try {
      await axiosInstance.delete(`/bids/tenders/${tenderId}/evaluation/criteria/${c.id}`);
      setCriteria(prev => prev.filter(x => x.id !== c.id));
      setSuccessMessage('Criterion deleted successfully!');
    } catch (e) {
      console.error('Delete criterion error:', e);
      const srv = e?.response?.data;
      const msg = srv?.detail || srv?.error || (typeof srv === 'object' ? Object.values(srv)[0]?.[0] : null) || 'Failed to delete criterion';
      setError(String(msg));
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
          <button
            onClick={saveConfig}
            disabled={savingCfg}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            {savingCfg ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <Notice type="error">{error}</Notice>}
        {successMessage && <Notice type="success">{successMessage}</Notice>}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            Loading…
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Evaluation Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Technical Weight (%)" help="Must sum with financial to 100%">
                  <input
                    type="number"
                    value={cfg.technical_weight}
                    onChange={e => setCfg({ ...cfg, technical_weight: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </Field>
                <Field label="Financial Weight (%)" help="Must sum with technical to 100%">
                  <input
                    type="number"
                    value={cfg.financial_weight}
                    onChange={e => setCfg({ ...cfg, financial_weight: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </Field>
                <Field label="Technical Pass Mark (%)">
                  <input
                    type="number"
                    value={cfg.technical_pass_mark}
                    onChange={e => setCfg({ ...cfg, technical_pass_mark: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </Field>
                <Field label="Financial Method">
                  <select
                    value={cfg.financial_method}
                    onChange={e => setCfg({ ...cfg, financial_method: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="lowest_price">Lowest Price</option>
                    <option value="criteria">Criteria Based</option>
                  </select>
                </Field>
                <Field label="Cap Financial Score At (%)">
                  <input
                    type="number"
                    value={cfg.cap_financial_score_at}
                    onChange={e => setCfg({ ...cfg, cap_financial_score_at: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    max="100"
                  />
                </Field>
                <div className="flex gap-6 items-center">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!cfg.compliance_required}
                      onChange={e => setCfg({ ...cfg, compliance_required: e.target.checked })}
                    />
                    Compliance required
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!cfg.enforce_mandatory}
                      onChange={e => setCfg({ ...cfg, enforce_mandatory: e.target.checked })}
                    />
                    Enforce mandatory uploads
                  </label>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Weights total: <span className={Math.abs(weightTotal - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                  {weightTotal.toFixed(1)}%
                </span>
              </div>
            </div>

            {sections.map(sec => (
              <div key={sec.key} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{sec.label} Criteria</h3>
                  <button
                    onClick={() => addCriterion(sec.key)}
                    disabled={adding}
                    className="inline-flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded disabled:opacity-50 hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" /> Add Criterion
                  </button>
                </div>

                {grouped[sec.key]?.length ? (
                  <ul className="divide-y">
                    {grouped[sec.key].map(c => (
                      <li key={c.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{c.name}</div>
                          {c.description && (
                            <div className="text-sm text-gray-600 mt-1">{c.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Type: {c.criterion_type} • Weight: {c.weight}% • Max: {c.max_points} •
                            Order: {c.order} • Mandatory: {c.mandatory ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingCriterion(c)}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => removeCriterion(c)}
                            className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-sm"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No {sec.label.toLowerCase()} criteria yet.</div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <button
                onClick={saveConfig}
                disabled={savingCfg}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {savingCfg ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit criterion modal */}
      {editingCriterion && (
        <CriterionEditModal
          criterion={editingCriterion}
          onSave={(updates) => updateCriterion(editingCriterion.id, updates)}
          onCancel={() => setEditingCriterion(null)}
        />
      )}
    </div>
  );
};

export default TenderCriteriaSetup;