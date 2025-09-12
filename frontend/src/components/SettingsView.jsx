import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Building2, Tag, AlertCircle, Check } from 'lucide-react';
import { fetchCategories as apiGetCategories, createCategory as apiCreateCategory, fetchProcuringEntities as apiGetEntities, createProcuringEntity as apiCreateEntity } from "../api/settings.jsx";

const SettingsView = () => {
  const [categories, setCategories] = useState([]);
  const [subcategoriesByParent, setSubcategoriesByParent] = useState({});
  const [entities, setEntities] = useState([]);
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '', parent_id: '' });
  const [entityForm, setEntityForm] = useState({
    name: '', code: '', entity_type: '', parent_entity_id: '',
    contact_person: '', email: '', phone: '', city: '', province: '', address_line1: '', address_line2: '', budget_threshold: ''
  });
  const [loading, setLoading] = useState({ cats: false, ents: false });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const entityTypes = useMemo(() => ([
    { value: 'ministry', label: 'Ministry' },
    { value: 'government_agency', label: 'Government Agency' },
    { value: 'local_authority', label: 'Local Authority' },
    { value: 'statutory_body', label: 'Statutory Body' },
  ]), []);

  const fetchCategories = async () => {
    setLoading(l => ({ ...l, cats: true }));
    try {
      const data = await apiGetCategories();
      setCategories(data);
      const map = {};
      data.forEach(c => {
        if (c.parent) {
          const pid = c.parent.id;
          map[pid] = map[pid] || [];
          map[pid].push(c);
        }
      });
      setSubcategoriesByParent(map);
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(l => ({ ...l, cats: false }));
    }
  };

  const fetchEntities = async () => {
    setLoading(l => ({ ...l, ents: true }));
    try {
      const data = await apiGetEntities();
      setEntities(data);
    } catch (e) {
      console.error('Failed to load entities', e);
    } finally {
      setLoading(l => ({ ...l, ents: false }));
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchEntities();
  }, []);

  const onCatChange = (e) => {
    const { name, value } = e.target;
    setCatForm(prev => ({ ...prev, [name]: value }));
  };

  const onEntityChange = (e) => {
    const { name, value } = e.target;
    setEntityForm(prev => ({ ...prev, [name]: value }));
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    try {
      const payload = {
        name: catForm.name,
        code: catForm.code || undefined,
        description: catForm.description || undefined,
        parent_id: catForm.parent_id ? Number(catForm.parent_id) : null,
      };
      await apiCreateCategory(payload);
      setSuccess('Category added successfully!');
      setCatForm({ name: '', code: '', description: '', parent_id: '' });
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Create category failed', e);
      const apiErrors = e?.response?.data;
      if (apiErrors) setErrors(apiErrors);
    }
  };

  const submitEntity = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    try {
      const payload = {
        name: entityForm.name,
        code: entityForm.code || undefined,
        entity_type: entityForm.entity_type || undefined,
        parent_entity_id: entityForm.parent_entity_id ? Number(entityForm.parent_entity_id) : null,
        contact_person: entityForm.contact_person || undefined,
        email: entityForm.email || undefined,
        phone: entityForm.phone || undefined,
        city: entityForm.city || undefined,
        province: entityForm.province || undefined,
        address_line1: entityForm.address_line1 || undefined,
        address_line2: entityForm.address_line2 || undefined,
        budget_threshold: entityForm.budget_threshold || undefined,
      };
      await apiCreateEntity(payload);
      setSuccess('Procuring entity added successfully!');
      setEntityForm({ name: '', code: '', entity_type: '', parent_entity_id: '', contact_person: '', email: '', phone: '', city: '', province: '', address_line1: '', address_line2: '', budget_threshold: '' });
      fetchEntities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Create entity failed', e);
      const apiErrors = e?.response?.data;
      if (apiErrors) setErrors(apiErrors);
    }
  };

  const topLevelCategories = categories.filter(c => !c.parent);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {(errors && Object.keys(errors).length > 0) && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Please fix the following errors:</p>
              <div className="mt-2 text-sm text-red-700">
                {Object.entries(errors).map(([field, messages]) => (
                  <div key={field} className="mb-1">
                    <strong className="capitalize">{field.replace('_', ' ')}:</strong> {Array.isArray(messages) ? messages.join(', ') : messages}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center">
            <Tag className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Categories & Subcategories</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">Organize tender categories with hierarchical structure</p>
        </div>

        <div className="p-6">
          {/* Add Category Form */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  name="name"
                  value={catForm.name}
                  onChange={onCatChange}
                  placeholder="Enter category name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                <input
                  name="code"
                  value={catForm.code}
                  onChange={onCatChange}
                  placeholder="Optional code"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category</label>
                <select
                  name="parent_id"
                  value={catForm.parent_id}
                  onChange={onCatChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">None (Top-level)</option>
                  {topLevelCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={catForm.description}
                  onChange={onCatChange}
                  rows={3}
                  placeholder="Brief description of this category"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={submitCategory}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </button>
            </div>
          </div>

          {/* Categories Display */}
          {loading.cats ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading categories...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topLevelCategories.map(cat => (
                <div key={cat.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                      {cat.code && <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{cat.code}</span>}
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-sm text-gray-600 mb-4">{cat.description}</p>
                  )}

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Subcategories</h5>
                    <div className="space-y-2">
                      {(subcategoriesByParent[cat.id] || []).map(sub => (
                        <div key={sub.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                          <span className="text-sm text-gray-900">{sub.name}</span>
                          {sub.code && <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{sub.code}</span>}
                        </div>
                      ))}
                      {!(subcategoriesByParent[cat.id] || []).length && (
                        <p className="text-sm text-gray-400 italic py-2">No subcategories yet</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Procuring Entities Section */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-900">Procuring Entities</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">Manage government departments and organizations</p>
        </div>

        <div className="p-6">
          {/* Add Entity Form */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity Name</label>
                <input
                  name="name"
                  value={entityForm.name}
                  onChange={onEntityChange}
                  placeholder="Enter entity name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                <input
                  name="code"
                  value={entityForm.code}
                  onChange={onEntityChange}
                  placeholder="Entity code"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
                <select
                  name="entity_type"
                  value={entityForm.entity_type}
                  onChange={onEntityChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select type</option>
                  {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Entity</label>
                <select
                  name="parent_entity_id"
                  value={entityForm.parent_entity_id}
                  onChange={onEntityChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">None</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                <input
                  name="contact_person"
                  value={entityForm.contact_person}
                  onChange={onEntityChange}
                  placeholder="Contact person name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={entityForm.email}
                  onChange={onEntityChange}
                  placeholder="contact@entity.gov.zm"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  name="phone"
                  value={entityForm.phone}
                  onChange={onEntityChange}
                  placeholder="+260 XXX XXXXXX"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  name="city"
                  value={entityForm.city}
                  onChange={onEntityChange}
                  placeholder="City"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <input
                  name="province"
                  value={entityForm.province}
                  onChange={onEntityChange}
                  placeholder="Province"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input
                  name="address_line1"
                  value={entityForm.address_line1}
                  onChange={onEntityChange}
                  placeholder="Primary address"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  name="budget_threshold"
                  value={entityForm.budget_threshold}
                  onChange={onEntityChange}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input
                  name="address_line2"
                  value={entityForm.address_line2}
                  onChange={onEntityChange}
                  placeholder="Additional address information (optional)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={submitEntity}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Entity
              </button>
            </div>
          </div>

          {/* Entities Display */}
          {loading.ents ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading entities...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {entities.map(entity => (
                <div key={entity.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{entity.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {entity.code && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {entity.code}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {entity.entity_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {entity.parent_entity && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Parent:</span> {entity.parent_entity.name}
                    </p>
                  )}

                  <div className="text-sm text-gray-600">
                    <p className="flex items-center">
                      <span className="font-medium mr-2">Location:</span>
                      {entity.city}{entity.province && `, ${entity.province}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsView;