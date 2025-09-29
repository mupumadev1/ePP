import axiosInstance from './axiosInstance.jsx';

// Opportunities available to bidders
export const fetchOpportunities = async (params = {}) => {
  const res = await axiosInstance.get('/bids/opportunities/', { params });
  return res.data;
};

// Bids for the authenticated bidder
export const fetchMyBids = async (params = {}) => {
  const res = await axiosInstance.get('/bids/my-bids/', { params });
  return res.data;
};

// Create or save a bid draft for a tender
export const createOrSaveBid = async (tenderId, payload) => {
  // payload includes bid fields; server should infer draft vs submit using status
  const res = await axiosInstance.post(`/bids/create-bid/${tenderId}/`, payload);
  return res.data;
};

export const getBid = async (bidId) => {
  const res = await axiosInstance.get(`/bids/bid/${bidId}/`);
  return res.data;
};

export const submitBid = async (bidId, payload = {}) => {
  const res = await axiosInstance.post(`/bids/bid/${bidId}/submit/`, payload);
  return res.data;
};

export const uploadBidDocuments = async (bidId, items = []) => {
  // items: array of { file: File, type?: string }
  const formData = new FormData();
  items.forEach((it) => formData.append('documents', it.file));
  // If all items share same type, include it once (backend applies to all files in request)
  const uniqueTypes = Array.from(new Set(items.map((it) => it.type).filter(Boolean)));
  if (uniqueTypes.length === 1) {
    formData.append('document_type', uniqueTypes[0]);
  }
  const res = await axiosInstance.post(`/bids/bid/${bidId}/documents/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

// Contracts APIs
export const fetchMyContracts = async () => {
  const res = await axiosInstance.get('/bids/contracts/mine/');
  return res.data;
};

// Edit an existing bid (partial update)
export const updateBid = async (bidId, payload) => {
  const res = await axiosInstance.patch(`/bids/bid/${bidId}/`, payload);
  return res.data;
};

// Unsubmit an already submitted bid (back to draft)
export const unsubmitBid = async (bidId) => {
  const res = await axiosInstance.post(`/bids/bid/${bidId}/unsubmit/`);
  return res.data;
};

// Change bid status generically: { status: 'draft'|'submitted'|'withdrawn' }
export const changeBidStatus = async (bidId, status) => {
  const res = await axiosInstance.post(`/bids/bid/${bidId}/status/`, { status });
  return res.data;
};

export const fetchEntityContracts = async () => {
  const res = await axiosInstance.get('/bids/contracts/entity/');
  return res.data;
};

export const createContract = async (payload) => {
  const res = await axiosInstance.post('/bids/contracts/create/', payload);
  return res.data;
};

export const updateContract = async (contractId, payload) => {
  const res = await axiosInstance.patch(`/bids/contracts/${contractId}/update/`, payload);
  return res.data;
};

// Supplier performance
export const fetchSupplierPerformance = async () => {
  const res = await axiosInstance.get('/bids/suppliers/performance/');
  return res.data;
};

// Required upload documents for a given tender
export const fetchTenderRequiredUploads = async (tenderId) => {
  const res = await axiosInstance.get(`/bids/tenders/${tenderId}/required-uploads/`);
  return res.data;
};