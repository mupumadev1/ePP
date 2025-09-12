import axiosInstance from './axiosInstance.jsx';

export const fetchTenders = async (parentId = undefined) => {
  const params = {};
  if (parentId !== undefined) params.parent_id = parentId;
  const res = await axiosInstance.get('/tenders/', { params });
  return res.data;
};

export const createTenders = async (payload) => {
  // payload: { name, code?, description?, parent_id? }
  const res = await axiosInstance.post('/tenders/', payload);
  return res.data;
};
