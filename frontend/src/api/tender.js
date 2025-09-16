import axiosInstance from './axiosInstance.jsx';

export const fetchTenders = async (parentId = undefined) => {
  const params = {};
  if (parentId !== undefined) params.parent_id = parentId;
  const res = await axiosInstance.get('/tenders/', { params });
  return res.data;
};

export const createTenders = async (payload) => {
  const res = await axiosInstance.post('/tenders/', payload);
  return res.data;
};

export const updateTender = async (tenderId, payload) => {
  // payload can include any updatable fields, e.g., { status: 'published' }
  const res = await axiosInstance.patch(`/tenders/${tenderId}/update/`, payload);
  return res.data;
};

// Evaluation APIs
export const fetchTenderBids = async (tenderId) => {
  const res = await axiosInstance.get(`/tenders/${tenderId}/bids/`);
  return res.data;
};

export const submitEvaluationRecommendation = async (tenderId, payload) => {
  const res = await axiosInstance.post(`/tenders/${tenderId}/evaluation/recommendation/`, payload);
  return res.data;
};

export const getEvaluationCommittee = async (tenderId) => {
  const res = await axiosInstance.get(`/tenders/${tenderId}/evaluation/committee/`);
  return res.data;
};

export const saveEvaluationCommittee = async (tenderId, payload) => {
  const res = await axiosInstance.post(`/tenders/${tenderId}/evaluation/committee/`, payload);
  return res.data;
};

export const getEvaluationSummary = async (tenderId) => {
  const res = await axiosInstance.get(`/tenders/${tenderId}/evaluation/summary/`);
  return res.data;
};

export const fetchDashboard = async () => {
  const res = await axiosInstance.get('/tenders/dashboard/');
  return res.data;
};

export const fetchProcurementAnalytics = async () => {
  const res = await axiosInstance.get('/tenders/procurement/analytics/');
  return res.data;
};

export const getEvaluationOverview = async () => {
  const res = await axiosInstance.get('/tenders/evaluation/overview/');
  return res.data;
};