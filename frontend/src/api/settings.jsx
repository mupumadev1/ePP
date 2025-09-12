import axiosInstance from './axiosInstance.jsx';

// Categories API
export const fetchCategories = async (parentId = undefined) => {
  const params = {};
  if (parentId !== undefined) params.parent_id = parentId;
  const res = await axiosInstance.get('/tenders/categories/', { params });
  return res.data;
};

export const createCategory = async (payload) => {
  // payload: { name, code?, description?, parent_id? }
  const res = await axiosInstance.post('/tenders/categories/', payload);
  return res.data;
};

// Procuring Entities API
export const fetchProcuringEntities = async (parentId = undefined) => {
  const params = {};
  if (parentId !== undefined) params.parent_id = parentId;
  const res = await axiosInstance.get('/users/procuring-entities/', { params });
  return res.data;
};

export const createProcuringEntity = async (payload) => {
  // payload fields should match backend serializer expectations
  const res = await axiosInstance.post('/users/procuring-entities/', payload);
  return res.data;
};
