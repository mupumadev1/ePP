import React, { useState } from 'react';
import { register } from '../api/auth.jsx';

const RegistrationForm = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: registration form, 2: email verification
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    businessRegNumber: '',
    businessCategory: '',
    experience: '',
    company_name: '',
  });

  const [uploads, setUploads] = useState({
    businessRegCertificate: null,
    taxComplianceCert: null,
    companyProfile: null
  });

  const [verificationData, setVerificationData] = useState({
    otp: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setUploads(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!formData.businessRegNumber?.trim()) {
      setError('Business Registration Number is required');
      setLoading(false);
      return;
    }

    try {
      // Build multipart form data so files are uploaded with the profile
      const fd = new FormData();
      fd.append('email', formData.email);
      fd.append('password', formData.password);
      fd.append('confirmPassword', formData.confirmPassword);
      fd.append('firstName', formData.firstName);
      fd.append('lastName', formData.lastName);
      fd.append('username', formData.username);
      fd.append('phoneNumber', formData.phoneNumber);
      fd.append('company_name', formData.company_name);
      fd.append('user_type', 'supplier');
      fd.append('businessRegNumber', formData.businessRegNumber);
      fd.append('businessCategory', formData.businessCategory);
      if (formData.experience !== '' && formData.experience !== null && formData.experience !== undefined) {
        fd.append('experience', String(Number(formData.experience)));
      }

      // Append files only if provided (inputs are required in UI; this is defensive)
      if (uploads.businessRegCertificate) {
        fd.append('businessRegCertificate', uploads.businessRegCertificate);
      }
      if (uploads.taxComplianceCert) {
        fd.append('taxComplianceCert', uploads.taxComplianceCert);
      }
      if (uploads.companyProfile) {
        fd.append('companyProfile', uploads.companyProfile);
      }

      const result = await register(fd);
      setVerificationData({ ...verificationData, email: formData.email });
      setSuccess(result.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your account has been created and submitted for verification
          </h2>
          <p className="text-gray-600">
            Please check your email for our feedback. This may take some time.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-gray-600 hover:underline text-sm"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Register as Supplier
        </h2>
        <p className="text-gray-600">
          Join our e-procurement platform to access tender opportunities
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitRegistration} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            name="company_name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.company_name}
            onChange={handleInputChange}
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            name="username"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Choose a unique username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phoneNumber"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+260971234567"
          />
        </div>

        {/* Business Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Registration Number *
          </label>
          <input
            type="text"
            name="businessRegNumber"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.businessRegNumber}
            onChange={handleInputChange}
            placeholder="BRN-123456"
          />
        </div>

       <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Business Registration Certificate *
          </label>
          <input
            type="file"
            name="businessRegCertificate"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-600
                       hover:file:bg-blue-100"
          />
          {uploads.businessRegCertificate && (
            <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
              <strong>Selected:</strong> {uploads.businessRegCertificate.name}
            </div>
          )}
        </div>


       <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Tax Compliance Certificate *
          </label>
          <input
            type="file"
            name="taxComplianceCert"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-600
                       hover:file:bg-blue-100"
          />
          {uploads.taxComplianceCert && (
            <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
              <strong>Selected:</strong> {uploads.taxComplianceCert.name}
            </div>
          )}
        </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Upload Company Profile *
      </label>
      <input
        type="file"
        name="companyProfile"
        accept=".pdf,.jpg,.jpeg,.png"
        required
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-semibold
                   file:bg-blue-50 file:text-blue-600
                   hover:file:bg-blue-100"
      />
      {uploads.companyProfile && (
        <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
          <strong>Selected:</strong> {uploads.companyProfile.name}
        </div>
      )}
    </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Category *
          </label>
          <select
            name="businessCategory"
            required
            value={formData.businessCategory}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="construction">Construction</option>
            <option value="it">IT Services</option>
            <option value="consulting">Consulting</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
           Years of Industry Experience *
          </label>
          <input type={"number"}
            name="experience"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experience}
            onChange={handleInputChange}
            placeholder="5"
          />
        </div>

        {/* Password */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-gray-600 hover:underline text-sm"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
};

export default RegistrationForm;
