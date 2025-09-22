import React, { useEffect, useState } from 'react';
import axios from '../api/axiosInstance.jsx';
import AppLayout from './base/AppLayout.jsx';

const Field = ({ label, value, onChange, name, readOnly=false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      className={`w-full border rounded px-3 py-2 ${readOnly ? 'bg-gray-100' : ''}`}
      value={value || ''}
      onChange={(e) => onChange && onChange(name, e.target.value)}
      name={name}
      readOnly={readOnly}
    />
  </div>
);

const ProfilePage = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState({ user: {}, supplier_profile: {}, entity_user: {} });
  const [submitStatus, setSubmitStatus] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/users/profile/');
      setData(res.data);
      setEdit({ user: {}, supplier_profile: {}, entity_user: {} });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateEdit = (section, field, value) => {
    setEdit((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [field]: value } }));
  };

  const submitEdit = async (target, targetId=null) => {
    setSubmitStatus(null);
    try {
      const payload = {
        target,
        proposed_changes: edit[target] || {},
      };
      if (targetId) payload.target_id = targetId;
      await axios.post('/users/profile/edit-request/', payload);
      setSubmitStatus({ type: 'success', message: 'Changes submitted for admin review.' });
      await load();
    } catch (e) {
      setSubmitStatus({ type: 'error', message: e?.response?.data?.error || e.message || 'Failed to submit changes' });
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const user = data?.user || {};
  const supplier = data?.supplier_profile;
  const roles = data?.roles || [];

  return (
    <AppLayout title="profile" onLogout={onLogout} forceBidder={(user?.user_type === 'supplier')}>
      <div className="p-6 space-y-8">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Email" value={user.email} name="email" readOnly />
            <Field label="Username" value={user.username} name="username" readOnly />
            <Field label="First Name" value={edit.user.first_name ?? user.first_name} name="first_name" onChange={(n,v)=>updateEdit('user',n,v)} />
            <Field label="Last Name" value={edit.user.last_name ?? user.last_name} name="last_name" onChange={(n,v)=>updateEdit('user',n,v)} />
            <Field label="Phone" value={edit.user.phone ?? user.phoneNumber} name="phone" onChange={(n,v)=>updateEdit('user',n,v)} />
          </div>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => submitEdit('user')}>Save Changes</button>
        </div>

        {supplier !== undefined && (
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Supplier Profile</h2>
            {supplier ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Company Name" value={edit.supplier_profile.company_name ?? supplier.company_name} name="company_name" onChange={(n,v)=>updateEdit('supplier_profile',n,v)} />
                <Field label="Business Category" value={edit.supplier_profile.business_category ?? supplier.business_category} name="business_category" onChange={(n,v)=>updateEdit('supplier_profile',n,v)} />
                <Field label="Years of Experience" value={edit.supplier_profile.years_of_experience ?? (supplier.years_of_experience ?? '')} name="years_of_experience" onChange={(n,v)=>updateEdit('supplier_profile',n,v)} />
                <Field label="Business Reg Number" value={edit.supplier_profile.business_reg_number ?? (supplier.business_reg_number ?? '')} name="business_reg_number" onChange={(n,v)=>updateEdit('supplier_profile',n,v)} />
              </div>
            ) : (
              <div className="text-gray-600">No supplier profile found.</div>
            )}
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => submitEdit('supplier_profile')}>Submit Supplier Changes</button>
          </div>
        )}

        {roles && roles.length > 0 && (
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Entity Roles</h2>
            {roles.map((r) => (
              <div key={r.id} className="border rounded p-4 mb-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Entity" value={r.entity_name} name="entity" readOnly />
                  <Field label="Role" value={edit.entity_user.role ?? r.role} name="role" onChange={(n,v)=>updateEdit('entity_user',n,v)} />
                  <Field label="Status" value={edit.entity_user.status ?? r.status} name="status" onChange={(n,v)=>updateEdit('entity_user',n,v)} />
                </div>
                <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={() => submitEdit('entity_user', r.id)}>Submit Role Changes</button>
              </div>
            ))}
          </div>
        )}

        {submitStatus && (
          <div className={`p-3 rounded ${submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {submitStatus.message}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
