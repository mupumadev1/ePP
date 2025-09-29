import React, { useState, useEffect } from 'react';
import {
  Upload,
  X,
  Plus,
  Minus,
  Save,
  Send,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar
} from 'lucide-react';

const BidSubmissionForm = ({ tender, onSubmit, onSave, initialBid = null }) => {
  const [bidData, setBidData] = useState({
    totalBidAmount: '',
    currency: 'ZMW',
    vatAmount: '',
    vatInclusive: true,
    bidValidityDays: 90,
    deliveryPeriod: '',
    paymentTerms: '',
    warrantyPeriod: '',
    technicalProposal: '',
    methodology: '',
    projectTimeline: '',
    bidSecurityAmount: '',
    bidSecurityReference: '',
    items: [
      {
        itemNumber: 1,
        description: '',
        quantity: '',
        unitOfMeasure: '',
        unitPrice: '',
        totalPrice: 0,
        specifications: '',
        brand: '',
        model: '',
        countryOfOrigin: ''
      }
    ]
  });

  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialBid) {
      setBidData(prev => ({ ...prev, ...initialBid }));
      if (initialBid.documents) {
        setDocuments(initialBid.documents);
      }
    }
  }, [initialBid]);

  // Keep bid security amount in sync with tender requirement
  useEffect(() => {
    if (tender?.tenderSecurityRequired) {
      setBidData(prev => ({
        ...prev,
        bidSecurityAmount: tender.tenderSecurityAmount || ''
      }));
    }
  }, [tender]);

  // Recalculate totals when VAT inclusion toggles or items change
  useEffect(() => {
    calculateTotalBidAmount(bidData.items || []);
  }, [bidData.vatInclusive, bidData.items]);

  const calculateItemTotal = (quantity, unitPrice) => {
    return (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...bidData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = calculateItemTotal(
        newItems[index].quantity,
        newItems[index].unitPrice
      );
    }

    setBidData({ ...bidData, items: newItems });
    calculateTotalBidAmount(newItems);
  };

  const addItem = () => {
    const newItem = {
      itemNumber: bidData.items.length + 1,
      description: '',
      quantity: '',
      unitOfMeasure: '',
      unitPrice: '',
      totalPrice: 0,
      specifications: '',
      brand: '',
      model: '',
      countryOfOrigin: ''
    };
    setBidData({ ...bidData, items: [...bidData.items, newItem] });
  };

  const removeItem = (index) => {
    if (bidData.items.length > 1) {
      const newItems = bidData.items.filter((_, i) => i !== index);
      setBidData({ ...bidData, items: newItems });
      calculateTotalBidAmount(newItems);
    }
  };

  const calculateTotalBidAmount = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const vatAmount = bidData.vatInclusive ? 0 : subtotal * 0.16; // 16% VAT
    setBidData(prev => ({
      ...prev,
      totalBidAmount: subtotal + vatAmount,
      vatAmount: vatAmount
    }));
  };

  const handleDocumentUpload = (event) => {
    const files = Array.from(event.target.files);
    const defaultType = (tender?.upload_documents && tender.upload_documents[0]?.file_type) || 'other';
    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: defaultType,
      file: file,
      size: file.size
    }));
    setDocuments([...documents, ...newDocs]);
  };

  // Per-requirement upload handler
  const handleRequirementUpload = (req, file) => {
    if (!file) return;
    const doc = {
      id: Date.now() + Math.random(),
      name: file.name,
      type: req.file_type || req.document_type || 'other',
      file,
      size: file.size,
      requirementId: req.id,
    };
    setDocuments(prev => {
      // replace existing doc for this requirement (if any)
      const withoutReq = prev.filter(d => d.requirementId !== req.id);
      return [...withoutReq, doc];
    });
  };

  const removeRequirementDocument = (reqId) => {
    setDocuments(prev => prev.filter(d => d.requirementId !== reqId));
  };

  const getDocumentForRequirement = (req) => {
    return documents.find(d => d.requirementId === req.id);
  };

  const removeDocument = (docId) => {
    setDocuments(documents.filter(doc => doc.id !== docId));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bidData.totalBidAmount || bidData.totalBidAmount <= 0) {
      newErrors.totalBidAmount = 'Total bid amount is required';
    }

    if (!bidData.bidValidityDays || bidData.bidValidityDays < 30) {
      newErrors.bidValidityDays = 'Bid validity must be at least 30 days';
    }

    if (bidData.items.some(item => !item.description || !item.quantity || !item.unitPrice)) {
      newErrors.items = 'All items must have description, quantity, and unit price';
    }

    if (tender?.tenderSecurityRequired && !bidData.bidSecurityAmount) {
      newErrors.bidSecurityAmount = 'Bid security is required for this tender';
    }

    // Validate mandatory uploads
    const reqs = Array.isArray(tender?.upload_documents) ? tender.upload_documents : [];
    // A mandatory requirement is satisfied if there's a document linked to that requirement OR any uploaded document with matching type
    const missingMandatory = reqs.filter(r => r.mandatory && !documents.find(d => (d.requirementId === r.id) || (d.type === r.file_type)));
    if (missingMandatory.length) {
      newErrors.documents = `Please upload all mandatory documents: ${missingMandatory.map(r => r.name).join(', ')}`;
    }

    // Validate file sizes per requirement where applicable (by requirement or by matching type)
    const oversize = reqs
      .map(r => {
        const d = documents.find(doc => (doc.requirementId === r.id) || (doc.type === r.file_type));
        if (d && r.max_file_size && d.size > r.max_file_size) return r.name;
        return null;
      })
      .filter(Boolean);
    if (oversize.length) {
      newErrors.documents = (newErrors.documents ? newErrors.documents + ' ' : '') +
        `Some files exceed their maximum size: ${oversize.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await onSave({ ...bidData, status: 'draft' });
      if (result.success) {
        alert('Bid saved successfully!');
      }
    } catch (error) {
      alert('Error saving bid: ' + error.message);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await onSubmit({ ...bidData, status: 'submitted', documents });
      if (result.success) {
        alert('Bid submitted successfully!');
      }
    } catch (error) {
      alert('Error submitting bid: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">Submit Bid</h2>
        <p className="text-blue-100">{tender?.title}</p>
        <p className="text-sm text-blue-200">Reference: {tender?.referenceNumber}</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Basic Information */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Bid Amount ({bidData.currency})
              </label>
              <div className="relative">
                <DollarSign className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  value={bidData.totalBidAmount}
                  onChange={(e) => setBidData({...bidData, totalBidAmount: parseFloat(e.target.value) || ''})}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              {errors.totalBidAmount && <p className="text-red-600 text-sm mt-1">{errors.totalBidAmount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bid Validity (Days)
              </label>
              <div className="relative">
                <Calendar className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  value={bidData.bidValidityDays}
                  onChange={(e) => setBidData({...bidData, bidValidityDays: parseInt(e.target.value) || 90})}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="90"
                />
              </div>
              {errors.bidValidityDays && <p className="text-red-600 text-sm mt-1">{errors.bidValidityDays}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Period
              </label>
              <input
                type="text"
                value={bidData.deliveryPeriod}
                onChange={(e) => setBidData({...bidData, deliveryPeriod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 30 days from contract signing"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <textarea
                value={bidData.paymentTerms}
                onChange={(e) => setBidData({...bidData, paymentTerms: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your payment terms..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Period
              </label>
              <input
                type="text"
                value={bidData.warrantyPeriod}
                onChange={(e) => setBidData({...bidData, warrantyPeriod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 12 months"
              />
            </div>
          </div>
        </section>

        {/* Bid Items */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bid Items</h3>
            <button
              onClick={addItem}
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>

          {errors.items && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex">
                <AlertCircle className="h-5 w-5 mr-2" />
                {errors.items}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {bidData.items.map((item, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Item {item.itemNumber}</h4>
                  {bidData.items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={item.unitOfMeasure}
                      onChange={(e) => updateItem(index, 'unitOfMeasure', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., pieces, kg, m²"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                    <input
                      type="number"
                      value={item.totalPrice}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={item.brand}
                      onChange={(e) => updateItem(index, 'brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brand name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={item.model}
                      onChange={(e) => updateItem(index, 'model', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Model number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                    <input
                      type="text"
                      value={item.countryOfOrigin}
                      onChange={(e) => updateItem(index, 'countryOfOrigin', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technical Specifications</label>
                  <textarea
                    value={item.specifications}
                    onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detailed specifications for this item..."
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Proposal */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Proposal</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technical Approach
              </label>
              <textarea
                value={bidData.technicalProposal}
                onChange={(e) => setBidData({...bidData, technicalProposal: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your technical approach to this project..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Methodology
              </label>
              <textarea
                value={bidData.methodology}
                onChange={(e) => setBidData({...bidData, methodology: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Explain your project methodology..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Timeline
              </label>
              <textarea
                value={bidData.projectTimeline}
                onChange={(e) => setBidData({...bidData, projectTimeline: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide detailed project timeline and milestones..."
              />
            </div>
          </div>
        </section>

        {/* Document Upload */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supporting Documents</h3>

          {Array.isArray(tender?.upload_documents) && tender.upload_documents.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded">
              <p className="font-medium text-blue-900 mb-2">Tender Document Requirements</p>
              <ul className="space-y-1 text-sm text-blue-900 list-disc pl-5">
                {tender.upload_documents.map(req => (
                  <li key={req.id}>
                    <span className="font-semibold">{req.name}</span>
                    <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full border border-blue-300">{req.file_type}</span>
                    {req.mandatory && (
                      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Mandatory</span>
                    )}
                    {req.max_file_size && (
                      <span className="ml-2 text-xs text-blue-700">Max {(req.max_file_size / 1024 / 1024).toFixed(1)} MB</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500">Upload documents</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </label>
                <p className="text-gray-500">or drag and drop</p>
                <p className="text-xs text-gray-500">PDF, DOC, XLS, JPG up to 10MB each</p>
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
              {documents.map((doc) => {
                const matched = (tender?.upload_documents || []).find(r => r.file_type === doc.type);
                const tooLarge = matched && matched.max_file_size && doc.size > matched.max_file_size;
                return (
                  <div key={doc.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{doc.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({(doc.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-xs text-gray-600">Document type:</label>
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={doc.type || ''}
                        onChange={(e) => setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, type: e.target.value } : d))}
                      >
                        {(tender?.upload_documents || []).map(req => (
                          <option key={req.id} value={req.file_type}>{req.file_type}</option>
                        ))}
                        <option value="other">other</option>
                      </select>
                      {matched?.mandatory && (
                        <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded">Mandatory</span>
                      )}
                      {tooLarge && (
                        <span className="text-xs text-red-600">Exceeds max {(matched.max_file_size / 1024 / 1024).toFixed(1)} MB</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bid Security */}
        {tender?.tenderSecurityRequired && (
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bid Security</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This tender requires bid security of {tender.currency} {tender.tenderSecurityAmount?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Security Amount
                </label>
                <input
                  type="number"
                  value={bidData.bidSecurityAmount}
                  onChange={(e) => setBidData({...bidData, bidSecurityAmount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Security amount"
                />
                {errors.bidSecurityAmount && <p className="text-red-600 text-sm mt-1">{errors.bidSecurityAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Reference Number
                </label>
                <input
                  type="text"
                  value={bidData.bidSecurityReference}
                  onChange={(e) => setBidData({...bidData, bidSecurityReference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bank guarantee reference"
                />
              </div>
            </div>
          </section>
        )}

        {/* VAT Information */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">VAT Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                id="vat-inclusive"
                type="checkbox"
                checked={bidData.vatInclusive}
                onChange={(e) => setBidData({...bidData, vatInclusive: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="vat-inclusive" className="ml-2 text-sm text-gray-700">
                VAT Inclusive
              </label>
            </div>

            {!bidData.vatInclusive && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT Amount
                </label>
                <input
                  type="number"
                  value={bidData.vatAmount}
                  onChange={(e) => setBidData({...bidData, vatAmount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="VAT amount"
                />
              </div>
            )}
          </div>
        </section>

        {/* Summary */}
        <section className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bid Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Items Count</p>
              <p className="font-semibold">{bidData.items.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold">{bidData.currency} {Number(bidData.totalBidAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Validity Period</p>
              <p className="font-semibold">{bidData.bidValidityDays} days</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="font-semibold">{documents.length} files</p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidSubmissionForm;