import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, DollarSign, FileText, AlertCircle, CheckCircle,Plus, Trash2  } from 'lucide-react';
import { fetchCategories as apiGetCategories, fetchProcuringEntities as apiGetEntities } from "../api/settings.jsx";
import axiosInstance from "../api/axiosInstance.jsx";

  const CreateTenderForm = ({ onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    category: '',
    subcategory: '',
    procuring_entity: '',
    procurement_method: '',
    estimated_value: '',
    currency: 'ZMW',

    // Important Dates
    closing_date: '',
    opening_date: '',
    bid_validity_period: 90,

    // Requirements and Specifications
    minimum_requirements: '',
    technical_specifications: '',
    evaluation_criteria: '',
    terms_conditions: '',

    // Security and Deposits
    tender_security_required: false,
    tender_security_amount: '',
    tender_security_type: '',

    // Document Requirements
    mandatory_documents: '',
    optional_documents: '',

    // Settings
    allow_variant_bids: false,
    allow_electronic_submission: true,
    auto_extend_on_amendment: true
  });

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState({ categories: true, entities: true });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [procuringEntities, setProcuringEntities] = useState([]);
  const [documentRequirements, setDocumentRequirements] = useState([
      {
        id: 1,
        name: '',
        file_type: '',
        is_mandatory: false,
        max_file_size: 10
      }
    ]);
  // Fetch categories from API
  const fetchCategories = async () => {
    setDataLoading(prev => ({ ...prev, categories: true }));
    try {
      const data = await apiGetCategories();
      setCategories(data);

      // Filter subcategories based on selected category
      if (formData.category) {
        const filteredSubs = data.filter(cat =>
          cat.parent && cat.parent.id === parseInt(formData.category)
        );
        setSubcategories(filteredSubs);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setErrors(prev => ({ ...prev, categories: 'Failed to load categories' }));
    } finally {
      setDataLoading(prev => ({ ...prev, categories: false }));
    }
  };
  const addDocumentRequirement = () => {
  const newRequirement = {
    id: Date.now(),
    name: '',
    file_type: '',
    is_mandatory: false,
    max_file_size: 10
  };
  setDocumentRequirements(prev => [...prev, newRequirement]);
};

const removeDocumentRequirement = (id) => {
  setDocumentRequirements(prev => prev.filter(req => req.id !== id));
};

const updateDocumentRequirement = (id, field, value) => {
  setDocumentRequirements(prev => prev.map(req =>
    req.id === id ? { ...req, [field]: value } : req
  ));
};
const uploadDocumentTypes = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'DOC' },
  { value: 'docx', label: 'DOCX' },
  { value: 'xls', label: 'XLS' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'any', label: 'Any File Type' }
];
  // Fetch procuring entities from API
  const fetchProcuringEntities = async () => {
    setDataLoading(prev => ({ ...prev, entities: true }));
    try {
      const data = await apiGetEntities();
      setProcuringEntities(data);
    } catch (error) {
      console.error('Failed to fetch procuring entities:', error);
      setErrors(prev => ({ ...prev, entities: 'Failed to load procuring entities' }));
    } finally {
      setDataLoading(prev => ({ ...prev, entities: false }));
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchProcuringEntities();
  }, []);

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category && categories.length > 0) {
      const filteredSubs = categories.filter(cat =>
        cat.parent && cat.parent.id === parseInt(formData.category)
      );
      setSubcategories(filteredSubs);

      // Reset subcategory if current selection is not valid for new category
      if (formData.subcategory) {
        const isValidSubcategory = filteredSubs.some(sub => sub.id === parseInt(formData.subcategory));
        if (!isValidSubcategory) {
          setFormData(prev => ({ ...prev, subcategory: '' }));
        }
      }
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  }, [formData.category, categories]);

  const procurementMethods = [
    { value: 'open_domestic', label: 'Open Domestic' },
    { value: 'open_international', label: 'Open International' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'single_source', label: 'Single Source' },
    { value: 'request_quotations', label: 'Request for Quotations' }
  ];

  const securityTypes = [
    { value: 'bank_guarantee', label: 'Bank Guarantee' },
    { value: 'insurance_guarantee', label: 'Insurance Guarantee' },
    { value: 'cash', label: 'Cash' }
  ];

  const documentTypes = [
    { value: 'bidding_document', label: 'Bidding Document' },
    { value: 'technical_specification', label: 'Technical Specification' },
    { value: 'terms_conditions', label: 'Terms & Conditions' },
    { value: 'amendment', label: 'Amendment' },
    { value: 'clarification', label: 'Clarification' },
    { value: 'other', label: 'Other' }
  ];

  // Get top-level categories (those without a parent)
  const topLevelCategories = categories.filter(cat => !cat.parent);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocuments = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      type: 'bidding_document',
      is_mandatory: false
    }));
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const removeDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const updateDocumentType = (docId, type) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, type } : doc
    ));
  };



  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  setLoading(true);
    function getCSRFToken() {
      const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    }

  try {
    // Create FormData for file upload
    const submitData = new FormData();

    // Structure the main tender data according to your Django model
    const tenderData = {
      // Basic Information
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: parseInt(formData.category), // This matches your ForeignKey to Category
      subcategory: formData.subcategory ? parseInt(formData.subcategory) : null,
      procuring_entity: parseInt(formData.procuring_entity), // ForeignKey to ProcuringEntity
      procurement_method: formData.procurement_method,

      // Financial Information
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      currency: formData.currency,
      bid_validity_period: parseInt(formData.bid_validity_period),

      // Important Dates (Django expects ISO format)
      closing_date: formData.closing_date ? new Date(formData.closing_date).toISOString() : null,
      opening_date: formData.opening_date ? new Date(formData.opening_date).toISOString() : null,

      // Requirements and Specifications
      minimum_requirements: formData.minimum_requirements.trim() || '',
      technical_specifications: formData.technical_specifications.trim() || '',
      evaluation_criteria: formData.evaluation_criteria.trim() || '',
      terms_conditions: formData.terms_conditions.trim() || '',

      // Security and Deposits
      tender_security_required: formData.tender_security_required,
      tender_security_amount: formData.tender_security_required && formData.tender_security_amount ?
        parseFloat(formData.tender_security_amount) : null,
      tender_security_type: formData.tender_security_required ? formData.tender_security_type : null,

      // Settings
      allow_variant_bids: formData.allow_variant_bids,
      allow_electronic_submission: formData.allow_electronic_submission,
      auto_extend_on_amendment: formData.auto_extend_on_amendment,

      // Status - will be set to 'draft' by default in your model
      status: 'draft'
    };

    // Add the main tender data as JSON
    submitData.append('tender_data', JSON.stringify(tenderData));

    // Add document upload requirements (for TenderUploadDocuments model)
    const uploadDocumentRequirements = documentRequirements
      .filter(req => req.name.trim()) // Only include requirements with names
      .map(req => ({
        name: req.name.trim(),
        file_type: req.file_type,
        max_file_size: req.max_file_size * 1024 * 1024, // Convert MB to bytes
        mandatory: req.is_mandatory
      }));

    submitData.append('upload_document_requirements', JSON.stringify(uploadDocumentRequirements));

    // Add uploaded tender documents (for TenderDocument model)
    documents.forEach((doc, index) => {
      submitData.append(`document_files`, doc.file);
      // Send document metadata separately
      submitData.append(`document_metadata_${index}`, JSON.stringify({
        document_name: doc.name,
        document_type: doc.type,
        is_mandatory: doc.is_mandatory || false,
        version: '1.0'
      }));
    });

    // Add document count for backend processing
    submitData.append('document_count', documents.length.toString());

    // Make the API call
    const response = await axiosInstance.post('/tenders/create/', submitData, {
      // Do not set Content-Type; axios will set multipart/form-data with boundary
    });

    const result = response?.data;
    setErrors({});
    onSuccess(result);
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 403 && (data?.detail || data?.error)) {
      setErrors({ general: data.detail || data.error });
    } else if (data?.errors) {
      setErrors(data.errors);
    } else if (data?.detail || data?.message || data?.error) {
      setErrors({ general: data.detail || data.message || data.error });
    } else if (!error.response) {
      setErrors({ general: 'Network error occurred. Please check your connection and try again.' });
    } else {
      setErrors({ general: 'Failed to create tender. Please check all fields and try again.' });
    }
  } finally {
    setLoading(false);
  }
};


// Enhanced validation to match your model constraints
const validateForm = () => {
  const newErrors = {};

  // Required fields based on your model
  if (!formData.title.trim()) {
    newErrors.title = 'Title is required';
  } else if (formData.title.trim().length > 500) {
    newErrors.title = 'Title cannot exceed 500 characters';
  }

  if (!formData.description.trim()) {
    newErrors.description = 'Description is required';
  }

  if (!formData.category) {
    newErrors.category = 'Category is required';
  }

  if (!formData.procuring_entity) {
    newErrors.procuring_entity = 'Procuring entity is required';
  }

  if (!formData.procurement_method) {
    newErrors.procurement_method = 'Procurement method is required';
  }

  if (!formData.closing_date) {
    newErrors.closing_date = 'Closing date is required';
  } else {
    const closingDate = new Date(formData.closing_date);
    const now = new Date();

    if (closingDate <= now) {
      newErrors.closing_date = 'Closing date must be in the future';
    }

    // Validate opening date if provided
    if (formData.opening_date) {
      const openingDate = new Date(formData.opening_date);
      if (openingDate >= closingDate) {
        newErrors.opening_date = 'Opening date must be before closing date';
      }
    }
  }

  // Validate estimated value if provided
  if (formData.estimated_value) {
    const value = parseFloat(formData.estimated_value);
    if (isNaN(value) || value <= 0) {
      newErrors.estimated_value = 'Estimated value must be a positive number';
    }
    // Check decimal places (your model has max_digits=15, decimal_places=2)
    if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
      newErrors.estimated_value = 'Estimated value can have maximum 2 decimal places';
    }
  }

  // Validate bid validity period
  if (formData.bid_validity_period && parseInt(formData.bid_validity_period) < 1) {
    newErrors.bid_validity_period = 'Bid validity period must be at least 1 day';
  }

  // Security validation when required
  if (formData.tender_security_required) {
    if (!formData.tender_security_amount || parseFloat(formData.tender_security_amount) <= 0) {
      newErrors.tender_security_amount = 'Security amount is required and must be greater than 0';
    }

    if (!formData.tender_security_type) {
      newErrors.tender_security_type = 'Security type is required when security is required';
    }
  }

  // Validate document requirements
  documentRequirements.forEach((req, index) => {
    if (req.name.trim()) {
      if (!req.file_type) {
        newErrors[`doc_req_${index}_file_type`] = 'File type is required';
      }
      if (req.name.trim().length > 200) {
        newErrors[`doc_req_${index}_name`] = 'Document name cannot exceed 200 characters';
      }
    }
    if (req.file_type && !req.name.trim()) {
      newErrors[`doc_req_${index}_name`] = 'Document name is required';
    }
  });

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create New Tender</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.general && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show loading message for data fetching */}
          {(dataLoading.categories || dataLoading.entities) && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p className="text-blue-800">Loading form data...</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procurement Method *
                </label>
                <select
                  name="procurement_method"
                  value={formData.procurement_method}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.procurement_method ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select method</option>
                  {procurementMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {errors.procurement_method && <p className="text-red-500 text-xs mt-1">{errors.procurement_method}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={dataLoading.categories}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {dataLoading.categories ? 'Loading categories...' : 'Select category'}
                  </option>
                  {topLevelCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.code && `(${cat.code})`}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory
                </label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  disabled={!formData.category || dataLoading.categories}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.category ? 'Select category first' : 'Select subcategory'}
                  </option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code && `(${sub.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procuring Entity *
                </label>
                <select
                  name="procuring_entity"
                  value={formData.procuring_entity}
                  onChange={handleInputChange}
                  disabled={dataLoading.entities}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 ${
                    errors.procuring_entity ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {dataLoading.entities ? 'Loading entities...' : 'Select entity'}
                  </option>
                  {procuringEntities.map(entity => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} {entity.code && `(${entity.code})`}
                    </option>
                  ))}
                </select>
                {errors.procuring_entity && <p className="text-red-500 text-xs mt-1">{errors.procuring_entity}</p>}
                {errors.entities && <p className="text-red-500 text-xs mt-1">{errors.entities}</p>}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Financial Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value
                </label>
                <div className="flex">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded-l-lg px-4 py-3 text-sm bg-gray-50 w-24"
                  >
                    <option value="ZMW">ZMW</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="number"
                    name="estimated_value"
                    value={formData.estimated_value}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="flex-1 border border-l-0 border-gray-300 rounded-r-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Validity Period (Days)
                </label>
                <input
                  type="number"
                  name="bid_validity_period"
                  value={formData.bid_validity_period}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Important Dates</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closing Date *
                </label>
                <input
                  type="datetime-local"
                  name="closing_date"
                  value={formData.closing_date}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.closing_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.closing_date && <p className="text-red-500 text-xs mt-1">{errors.closing_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Date
                </label>
                <input
                  type="datetime-local"
                  name="opening_date"
                  value={formData.opening_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tender Security */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Tender Security</h3>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="tender_security_required"
                checked={formData.tender_security_required}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Tender security required
              </label>
            </div>

            {formData.tender_security_required && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Amount *
                  </label>
                  <input
                    type="number"
                    name="tender_security_amount"
                    value={formData.tender_security_amount}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.tender_security_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.tender_security_amount && <p className="text-red-500 text-xs mt-1">{errors.tender_security_amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Type *
                  </label>
                  <select
                    name="tender_security_type"
                    value={formData.tender_security_type}
                    onChange={handleInputChange}
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.tender_security_type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select type</option>
                    {securityTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.tender_security_type && <p className="text-red-500 text-xs mt-1">{errors.tender_security_type}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Requirements and Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Requirements & Specifications</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Requirements
                </label>
                <textarea
                  name="minimum_requirements"
                  value={formData.minimum_requirements}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technical Specifications
                </label>
                <textarea
                  name="technical_specifications"
                  value={formData.technical_specifications}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evaluation Criteria
                </label>
                <textarea
                  name="evaluation_criteria"
                  value={formData.evaluation_criteria}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  name="terms_conditions"
                  value={formData.terms_conditions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Document Requirements */}
      <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 flex-grow">Document Requirements</h3>
              <button
                type="button"
                onClick={addDocumentRequirement}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Requirement
              </button>
            </div>

            <div className="space-y-4">
              {documentRequirements.map((requirement, index) => (
                <div key={requirement.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document Name
                      </label>
                      <input
                        type="text"
                        value={requirement.name}
                        onChange={(e) => updateDocumentRequirement(requirement.id, 'name', e.target.value)}
                        placeholder="e.g., Company Registration Certificate"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors[`doc_req_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`doc_req_${index}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`doc_req_${index}_name`]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        File Type
                      </label>
                      <select
                        value={requirement.file_type}
                        onChange={(e) => updateDocumentRequirement(requirement.id, 'file_type', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors[`doc_req_${index}_file_type`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select type</option>
                        {uploadDocumentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors[`doc_req_${index}_file_type`] && <p className="text-red-500 text-xs mt-1">{errors[`doc_req_${index}_file_type`]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Size (MB)
                      </label>
                      <input
                        type="number"
                        value={requirement.max_file_size}
                        onChange={(e) => updateDocumentRequirement(requirement.id, 'max_file_size', parseFloat(e.target.value) || 10)}
                        min="1"
                        max="100"
                        step="0.1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={requirement.is_mandatory}
                        onChange={(e) => updateDocumentRequirement(requirement.id, 'is_mandatory', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        Mandatory document
                      </label>
                    </div>

                    {documentRequirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDocumentRequirement(requirement.id)}
                        className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Upload Documents</h3>

            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload tender documents
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1 text-sm text-gray-500">PDF, DOC, DOCX, XLS, XLSX up to 10MB each</p>
                </div>
              </div>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Uploaded Documents:</h4>
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={doc.type}
                        onChange={(e) => updateDocumentType(doc.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        {documentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Settings</h3>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allow_variant_bids"
                  checked={formData.allow_variant_bids}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Allow variant bids
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allow_electronic_submission"
                  checked={formData.allow_electronic_submission}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Allow electronic submission
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="auto_extend_on_amendment"
                  checked={formData.auto_extend_on_amendment}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Auto-extend closing date on amendment
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || dataLoading.categories || dataLoading.entities}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Tender
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenderForm;